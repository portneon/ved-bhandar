import { inject, injectable } from "tsyringe";
import { randomUUID } from "crypto";
import pLimit from "p-limit";
import { z } from "zod";
import { Book, TokenUsage } from "../../domain/entities/Book.js";
import { Generation, GenerationSettings } from "../../domain/entities/Generation.js";
import { GeneratedQuestion } from "../../domain/entities/GeneratedQuestion.js";
import { Chunk } from "../../domain/entities/Chunk.js";
import { Slot } from "../../domain/entities/Slot.js";
import { ILlmProvider } from "../../domain/interfaces/ILlmProvider.js";
import { IGenerationPromptBuilder } from "../../domain/interfaces/IGenerationPromptBuilder.js";
import { IEmbeddingProvider } from "../../domain/interfaces/IEmbeddingProvider.js";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository.js";
import { IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository.js";
import { IGenerationRepository } from "../../domain/interfaces/repositories/IGenerationRepository.js";
import { IQuestionBankRepository } from "../../domain/interfaces/repositories/IQuestionBankRepository.js";
import { buildSlots } from "../generation/SlotBuilder.js";
import { HttpError } from "../../api/HttpError.js";
import { ChunkRetrievalService, RetrievalOutcome } from "../generation/ChunkRetrievalService.js";
import { TopicPlanningService } from "../generation/TopicPlanningService.js";
import { QuestionEvaluationService } from "../generation/QuestionEvaluationService.js";
import { chunkIdsAreSubset, isDuplicateStem, isValidMcq } from "../generation/GenerationValidator.js";
import { extractJson } from "../shared/extractJson.js";

const BATCH_SIZE = 5;
const CONCURRENCY = 5;

const refineResultSchema = z.object({
  stem: z.string(),
  options: z.array(z.string()).nullable().optional(),
  answer: z.string(),
  explanation: z.string(),
});

const questionResultSchema = z.object({
  slotId: z.string(),
  chunkIds: z.array(z.string()).optional(),
  stem: z.string().optional(),
  options: z.array(z.string()).nullable().optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  skip: z.string().optional(),
});
const generationResponseSchema = z.object({ questions: z.array(questionResultSchema) });

interface ParsedQuestion {
  chunkIds: string[];
  stem: string;
  options: string[] | null;
  answer: string;
  explanation: string;
}

interface FailedSlot {
  slot: Slot;
  outcome: RetrievalOutcome;
  reason: string;
}

@injectable()
export class GenerationService {
  constructor(
    @inject("IBookRepository") private readonly bookRepo: IBookRepository,
    @inject("IChunkRepository") private readonly chunkRepo: IChunkRepository,
    @inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository,
    @inject("IQuestionBankRepository") private readonly questionBankRepo: IQuestionBankRepository,
    @inject(ChunkRetrievalService) private readonly retrievalService: ChunkRetrievalService,
    @inject(TopicPlanningService) private readonly topicPlanningService: TopicPlanningService,
    @inject(QuestionEvaluationService) private readonly evaluationService: QuestionEvaluationService,
    @inject("IGenerationPromptBuilder") private readonly promptBuilder: IGenerationPromptBuilder,
    @inject("IEmbeddingProvider") private readonly embeddingProvider: IEmbeddingProvider,
    @inject("ILlmProvider") private readonly llmProvider: ILlmProvider,
  ) {}

  async start(settings: GenerationSettings, userId: string): Promise<Generation> {
    const book = await this.bookRepo.findById(settings.bookId, userId);
    if (!book) throw HttpError.notFound("Book not found");

    const slots = buildSlots(settings);
    const questions = slots.map((slot) => this.pendingQuestion(slot, settings));
    const generation = new Generation(randomUUID(), settings.bookId, userId, settings, slots, questions, { input: 0, output: 0 }, new Date());
    await this.generationRepo.create(generation);

    this.runInBackground(generation).catch((error) => {
      console.error(`Generation failed for ${generation.id}`, error);
    });

    return generation;
  }

  private async runInBackground(generation: Generation): Promise<void> {
    const book = await this.bookRepo.findById(generation.bookId, generation.userId);
    if (!book) throw new Error("Book not found");

    // Chief-examiner planning pass: decide which topic each slot should be
    // built from (and why) before any chunk sampling or question writing
    // happens. Slots the plan doesn't cover fall back to the existing
    // mechanical retrieval below.
    const plan = await this.topicPlanningService.plan(
      generation.id,
      generation.bookId,
      book.subject,
      book.grade,
      generation.settings.difficulty,
      generation.settings.topic,
      generation.slots,
    );
    const outcomes = await this.retrievalService.retrieve(generation.bookId, generation.settings.topic, generation.slots, plan);
    const readySlots: Slot[] = [];

    for (const slot of generation.slots) {
      const outcome = outcomes.get(slot.slotId);
      if (!outcome || outcome.status === "no_candidates") {
        await this.generationRepo.upsertQuestion(
          generation.id,
          this.finalizedQuestion(slot, generation.settings, outcome?.chunkIds ?? [], outcome?.pages ?? [], "no_candidates", outcome?.reason ?? "No candidates found."),
        );
        continue;
      }
      readySlots.push(slot);
    }

    const chunkIds = [...new Set(readySlots.flatMap((slot) => outcomes.get(slot.slotId)!.chunkIds))];
    const chunksById = new Map((await this.chunkRepo.findByIds(chunkIds)).map((chunk) => [chunk.id, chunk]));

    const acceptedStemEmbeddings: number[][] = [];
    const batches = this.buildBatches(readySlots, outcomes);
    const limit = pLimit(CONCURRENCY);

    const batchResults = await Promise.all(
      batches.map((batch) => limit(() => this.processBatch(generation, book, batch, outcomes, chunksById, acceptedStemEmbeddings))),
    );

    // Slots that are still unfilled after each batch's own retry get one more
    // pass with a fresh prompt (built from why they failed), instead of
    // staying stuck on "failed" for the rest of the run.
    const stillFailed = batchResults.flat();
    if (stillFailed.length > 0) {
      await this.retryFailedSlots(generation, book, stillFailed, chunksById, acceptedStemEmbeddings);
    }
  }

  /**
   * Two smart-hint passes instead of one plain-hint pass — each pass asks the LLM to pinpoint exactly which
   * facts the rejected attempt failed to restate (grounded in the slot's own source extracts) before rewriting,
   * rather than just retrying with the bare rejection reason. This is what actually rescues slots that keep
   * failing the self-containment check (common with probability/combinatorics stems).
   */
  private async retryFailedSlots(
    generation: Generation,
    book: Book,
    failedSlots: FailedSlot[],
    chunksById: Map<string, Chunk>,
    acceptedStemEmbeddings: number[][],
  ): Promise<void> {
    let pending = failedSlots;

    for (let attempt = 0; attempt < 2 && pending.length > 0; attempt++) {
      const outcomes = new Map(pending.map(({ slot, outcome }) => [slot.slotId, outcome]));
      const hintEntries = await Promise.all(
        pending.map(async ({ slot, outcome, reason }): Promise<[string, string]> => [
          slot.slotId,
          await this.buildSmartRetryHint(generation.id, reason, outcome.chunkIds, chunksById),
        ]),
      );
      const hints = new Map(hintEntries);
      const results = await this.callGeneration(generation, book, pending.map((f) => f.slot), outcomes, chunksById, hints);

      const stillFailed: FailedSlot[] = [];
      for (const { slot, outcome, reason } of pending) {
        const result = results.get(slot.slotId);
        if (!result || "reason" in result) {
          stillFailed.push({ slot, outcome, reason: result && "reason" in result ? result.reason : reason });
          continue;
        }
        const validity = await this.validate(generation.id, slot, outcome, result.data, acceptedStemEmbeddings);
        if (validity.valid) {
          acceptedStemEmbeddings.push(validity.stemEmbedding);
          await this.persist(generation, slot, outcome, "draft", null, chunksById, result.data);
        } else {
          stillFailed.push({ slot, outcome, reason: validity.reason });
        }
      }
      pending = stillFailed;
    }

    for (const { slot, outcome, reason } of pending) {
      await this.persist(generation, slot, outcome, "failed", reason, chunksById);
    }
  }

  /**
   * Given why a question was rejected, asks the LLM to pinpoint exactly which facts from the slot's own
   * source extracts the stem failed to restate — so the retry prompt gets a concrete checklist to copy in,
   * instead of a vague "try again" hint. Grounded only in those extracts; never invents missing facts.
   */
  private async buildSmartRetryHint(
    generationId: string,
    reason: string,
    chunkIds: string[],
    chunksById: Map<string, Chunk>,
  ): Promise<string> {
    const chunks = chunkIds.map((id) => chunksById.get(id)).filter((chunk): chunk is Chunk => Boolean(chunk));
    if (chunks.length === 0) return reason;

    const extracts = chunks.map((chunk) => `[${chunk.id}] (p. ${chunk.page}) ${chunk.text}`).join("\n");
    const user = `A question for this slot was rejected for this reason: "${reason}"

Source extracts available for this slot:
${extracts}

Pinpoint exactly which specific facts — numbers, names, given values — from the extracts above the rejected stem
failed to restate, so a rewrite can copy them in verbatim. List at most 3 short, concrete points. If the extracts
genuinely don't contain what's missing, say that plainly instead of inventing anything.`;

    try {
      const model = process.env.GENERATION_MODEL ?? "openai/gpt-4o-mini";
      const completion = await this.llmProvider.complete(
        "You pinpoint exactly what a rejected exam question is missing, grounded only in the given source text — you never invent facts the text doesn't contain.",
        user,
        model,
      );
      await this.generationRepo.addTokenUsage(generationId, {
        input: completion.usage.inputTokens,
        output: completion.usage.outputTokens,
      });
      return `${reason} Specifically: ${completion.content.trim()}`;
    } catch {
      return reason;
    }
  }

  listForBook(bookId: string, userId: string): Promise<Generation[]> {
    return this.generationRepo.findByBookId(bookId, userId);
  }

  async regenerateSlot(generationId: string, slotId: string, userId: string): Promise<void> {
    const generation = await this.generationRepo.findById(generationId, userId);
    if (!generation) throw HttpError.notFound("Generation not found");
    const slot = generation.slots.find((s) => s.slotId === slotId);
    if (!slot) throw new Error("Slot not found");
    const book = await this.bookRepo.findById(generation.bookId, userId);
    if (!book) throw new Error("Book not found");

    // Re-plan this one slot too — regenerating is exactly when we want a
    // deliberately different topic, not just another roll of the same dice.
    const plan = await this.topicPlanningService.plan(
      generation.id,
      generation.bookId,
      book.subject,
      book.grade,
      generation.settings.difficulty,
      generation.settings.topic,
      [slot],
    );
    const outcomes = await this.retrievalService.retrieve(generation.bookId, generation.settings.topic, [slot], plan);
    const outcome = outcomes.get(slotId);
    if (!outcome || outcome.status === "no_candidates") {
      await this.persist(
        generation,
        slot,
        outcome ?? { slotId, chunkIds: [], pages: [], status: "no_candidates" },
        "no_candidates",
        outcome?.reason ?? "No candidates found.",
        new Map(),
      );
      return;
    }

    const chunks = await this.chunkRepo.findByIds(outcome.chunkIds);
    const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    const outcomesMap = new Map([[slotId, outcome]]);

    // If this slot failed before, start from a smart hint built from that reason (pinpointing exactly which
    // facts the source extracts have that the stem missed) rather than blindly repeating the same attempt.
    const previousReason = generation.questions.find((q) => q.slotId === slotId)?.reason ?? undefined;
    const hints = previousReason
      ? new Map([[slotId, await this.buildSmartRetryHint(generation.id, previousReason, outcome.chunkIds, chunksById)]])
      : undefined;

    const outcome1 = await this.attemptSlot(generation, book, slot, outcome, outcomesMap, chunksById, hints);
    if (outcome1.status === "draft") {
      await this.persist(generation, slot, outcome, "draft", null, chunksById, outcome1.data);
      return;
    }

    // One automatic retry with a smart hint built from *this* failure, before giving up and asking the user
    // to click Retry again.
    const smartHint = await this.buildSmartRetryHint(generation.id, outcome1.reason, outcome.chunkIds, chunksById);
    const retryHints = new Map([[slotId, smartHint]]);
    const outcome2 = await this.attemptSlot(generation, book, slot, outcome, outcomesMap, chunksById, retryHints);
    if (outcome2.status === "draft") {
      await this.persist(generation, slot, outcome, "draft", null, chunksById, outcome2.data);
    } else {
      await this.persist(generation, slot, outcome, "failed", outcome2.reason, chunksById);
    }
  }

  /**
   * Rewrites one existing question per a free-text instruction (e.g. "make this harder"), instead of
   * regenerating from scratch — grounded in the same source chunks as the original when it has any.
   */
  async refineQuestion(
    generationId: string,
    slotId: string,
    instruction: string,
    userId: string,
  ): Promise<{ status: "ok"; question: GeneratedQuestion } | { status: "failed"; reason: string }> {
    const generation = await this.generationRepo.findById(generationId, userId);
    if (!generation) throw HttpError.notFound("Generation not found");
    const question = generation.questions.find((q) => q.slotId === slotId);
    if (!question) throw new Error("Question not found");
    if (!question.stem || !question.answer || !question.explanation) {
      throw new Error("This question has no content to refine yet — fill it in first.");
    }

    const book = await this.bookRepo.findById(generation.bookId, userId);
    if (!book) throw new Error("Book not found");

    const chunks = question.chunkIds.length > 0 ? await this.chunkRepo.findByIds(question.chunkIds) : [];

    const { system, user } = this.promptBuilder.buildRefine({
      subject: book.subject,
      grade: book.grade,
      difficulty: question.difficulty,
      chunks: chunks.map((chunk) => ({ id: chunk.id, page: chunk.page, text: chunk.text })),
      question: {
        questionType: question.questionType,
        bloom: question.bloom,
        marks: question.marks,
        stem: question.stem,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
      },
      instruction,
    });

    const model = process.env.GENERATION_MODEL ?? "openai/gpt-4o-mini";
    const completion = await this.llmProvider.complete(system, user, model);
    await this.generationRepo.addTokenUsage(generation.id, {
      input: completion.usage.inputTokens,
      output: completion.usage.outputTokens,
    });

    let parsed: z.infer<typeof refineResultSchema>;
    try {
      parsed = refineResultSchema.parse(JSON.parse(extractJson(completion.content)));
    } catch {
      return { status: "failed", reason: "Model did not return a usable revision. Try rephrasing the instruction." };
    }

    const options = question.questionType === "mcq" ? (parsed.options ?? null) : null;
    if (question.questionType === "mcq" && !isValidMcq(options, parsed.answer)) {
      return { status: "failed", reason: "Revised MCQ did not have exactly 4 distinct options with a matching answer." };
    }

    const existingStemEmbeddings = await this.collectStemEmbeddings(generation, slotId);
    const stemEmbedding = await this.embedStem(parsed.stem);
    if (isDuplicateStem(stemEmbedding, existingStemEmbeddings)) {
      return { status: "failed", reason: "Revised stem is a near-duplicate of another question in this paper." };
    }

    const evaluation = await this.evaluationService.evaluate(generation.id, {
      questionType: question.questionType,
      stem: parsed.stem,
      options,
      answer: parsed.answer,
      explanation: parsed.explanation,
    });
    if (!evaluation.valid) {
      return { status: "failed", reason: evaluation.reason };
    }

    const updated: GeneratedQuestion = {
      ...question,
      stem: parsed.stem,
      options,
      answer: parsed.answer,
      explanation: parsed.explanation,
    };
    await this.generationRepo.upsertQuestion(generation.id, updated);
    return { status: "ok", question: updated };
  }

  private async attemptSlot(
    generation: Generation,
    book: Book,
    slot: Slot,
    outcome: RetrievalOutcome,
    outcomes: Map<string, RetrievalOutcome>,
    chunksById: Map<string, Chunk>,
    hints: Map<string, string> | undefined,
  ): Promise<{ status: "draft"; data: ParsedQuestion } | { status: "failed"; reason: string }> {
    const results = await this.callGeneration(generation, book, [slot], outcomes, chunksById, hints);
    const result = results.get(slot.slotId);
    if (!result || "reason" in result) {
      return { status: "failed", reason: result && "reason" in result ? result.reason : "Could not generate a valid question for this slot." };
    }

    const existingStemEmbeddings = await this.collectStemEmbeddings(generation, slot.slotId);
    const validity = await this.validate(generation.id, slot, outcome, result.data, existingStemEmbeddings);
    return validity.valid ? { status: "draft", data: result.data } : { status: "failed", reason: validity.reason };
  }

  private async collectStemEmbeddings(generation: Generation, excludeSlotId: string): Promise<number[][]> {
    const stems = generation.questions
      .filter((question) => question.slotId !== excludeSlotId && question.stem)
      .map((question) => question.stem as string);
    return stems.length > 0 ? this.embeddingProvider.embed(stems) : [];
  }

  private buildBatches(slots: Slot[], outcomes: Map<string, RetrievalOutcome>): Slot[][] {
    const batches: Slot[][] = [];
    let current: Slot[] = [];
    let currentChunkIds = new Set<string>();

    for (const slot of slots) {
      if (current.length >= BATCH_SIZE) {
        batches.push(current);
        current = [];
        currentChunkIds = new Set();
      }
      current.push(slot);
      for (const id of outcomes.get(slot.slotId)!.chunkIds) currentChunkIds.add(id);
    }
    if (current.length > 0) batches.push(current);
    return batches;
  }

  private async processBatch(
    generation: Generation,
    book: Book,
    batch: Slot[],
    outcomes: Map<string, RetrievalOutcome>,
    chunksById: Map<string, Chunk>,
    acceptedStemEmbeddings: number[][],
  ): Promise<FailedSlot[]> {
    const results = await this.callGeneration(generation, book, batch, outcomes, chunksById);
    const toRetry: Slot[] = [];
    const retryHints = new Map<string, string>();

    for (const slot of batch) {
      const outcome = outcomes.get(slot.slotId)!;
      const result = results.get(slot.slotId);

      if (!result || "reason" in result) {
        // Not persisted yet — the slot stays "pending" through the in-batch
        // retry below, so the results page keeps polling instead of settling
        // on a "failed" state that a moment later flips to a real question.
        const reason = result && "reason" in result ? result.reason : "No response for this slot.";
        toRetry.push(slot);
        retryHints.set(slot.slotId, reason);
        continue;
      }

      const validity = await this.validate(generation.id, slot, outcome, result.data, acceptedStemEmbeddings);
      if (validity.valid) {
        acceptedStemEmbeddings.push(validity.stemEmbedding);
        await this.persist(generation, slot, outcome, "draft", null, chunksById, result.data);
      } else {
        toRetry.push(slot);
        retryHints.set(slot.slotId, validity.reason);
      }
    }

    if (toRetry.length === 0) return [];

    const retryResults = await this.callGeneration(generation, book, toRetry, outcomes, chunksById, retryHints);
    const stillFailed: FailedSlot[] = [];

    for (const slot of toRetry) {
      const outcome = outcomes.get(slot.slotId)!;
      const result = retryResults.get(slot.slotId);

      if (!result || "reason" in result) {
        // Still not persisted — one more automatic pass runs after every
        // batch has had its turn (see retryFailedSlots), using this reason
        // to steer a fresh prompt before we finally give up on the slot.
        const reason = result && "reason" in result ? result.reason : "Could not generate a valid question for this slot.";
        stillFailed.push({ slot, outcome, reason });
        continue;
      }

      const validity = await this.validate(generation.id, slot, outcome, result.data, acceptedStemEmbeddings);
      if (validity.valid) {
        acceptedStemEmbeddings.push(validity.stemEmbedding);
        await this.persist(generation, slot, outcome, "draft", null, chunksById, result.data);
      } else {
        stillFailed.push({ slot, outcome, reason: validity.reason });
      }
    }

    return stillFailed;
  }

  private async callGeneration(
    generation: Generation,
    book: Book,
    slots: Slot[],
    outcomes: Map<string, RetrievalOutcome>,
    chunksById: Map<string, Chunk>,
    retryHints?: Map<string, string>,
  ): Promise<Map<string, { data: ParsedQuestion } | { reason: string }>> {
    if (slots.length === 0) return new Map();

    const chunkIds = [...new Set(slots.flatMap((slot) => outcomes.get(slot.slotId)!.chunkIds))];
    const chunks = chunkIds.map((id) => chunksById.get(id)).filter((chunk): chunk is Chunk => Boolean(chunk));

    const { system, user } = this.promptBuilder.build({
      subject: book.subject,
      grade: book.grade,
      difficulty: generation.settings.difficulty,
      chunks: chunks.map((chunk) => ({ id: chunk.id, page: chunk.page, text: chunk.text })),
      slots: slots.map((slot) => ({
        slotId: slot.slotId,
        questionType: slot.questionType,
        bloom: slot.bloom,
        marks: slot.marks,
        chunkIds: outcomes.get(slot.slotId)!.chunkIds,
        retryHint: retryHints?.get(slot.slotId),
        focus: outcomes.get(slot.slotId)!.focus,
      })),
    });

    const model = process.env.GENERATION_MODEL ?? "openai/gpt-4o-mini";
    const completion = await this.llmProvider.complete(system, user, model);
    await this.generationRepo.addTokenUsage(generation.id, {
      input: completion.usage.inputTokens,
      output: completion.usage.outputTokens,
    });

    const slotsById = new Map(slots.map((slot) => [slot.slotId, slot]));
    const results = new Map<string, { data: ParsedQuestion } | { reason: string }>();
    try {
      const parsed = generationResponseSchema.parse(JSON.parse(extractJson(completion.content)));
      for (const item of parsed.questions) {
        if (item.skip) {
          results.set(item.slotId, { reason: item.skip });
        } else if (item.stem && item.answer && item.explanation) {
          const isMcq = slotsById.get(item.slotId)?.questionType === "mcq";
          results.set(item.slotId, {
            data: {
              chunkIds: item.chunkIds ?? [],
              stem: item.stem,
              options: isMcq ? (item.options ?? null) : null,
              answer: item.answer,
              explanation: item.explanation,
            },
          });
        }
      }
    } catch {
      // leave results empty — every slot falls through to "No response for this slot."
    }

    return results;
  }

  private async validate(
    generationId: string,
    slot: Slot,
    outcome: RetrievalOutcome,
    data: ParsedQuestion,
    acceptedStemEmbeddings: number[][],
  ): Promise<{ valid: true; stemEmbedding: number[] } | { valid: false; reason: string }> {
    if (!chunkIdsAreSubset(data.chunkIds, outcome.chunkIds)) {
      return { valid: false, reason: "Cited chunk ids were not among the retrieved chunks." };
    }
    if (slot.questionType === "mcq" && !isValidMcq(data.options, data.answer)) {
      return { valid: false, reason: "MCQ did not have exactly 4 distinct options with a matching answer." };
    }
    const stemEmbedding = await this.embedStem(data.stem);
    if (isDuplicateStem(stemEmbedding, acceptedStemEmbeddings)) {
      return { valid: false, reason: "Stem was a near-duplicate of another question in this paper." };
    }
    // Last check, and the most expensive one, so cheaper structural checks
    // above get first crack at rejecting an obviously bad candidate.
    const evaluation = await this.evaluationService.evaluate(generationId, {
      questionType: slot.questionType,
      stem: data.stem,
      options: data.options,
      answer: data.answer,
      explanation: data.explanation,
    });
    if (!evaluation.valid) {
      return { valid: false, reason: evaluation.reason };
    }
    return { valid: true, stemEmbedding };
  }

  private async embedStem(stem: string): Promise<number[]> {
    const [embedding] = await this.embeddingProvider.embed([stem]);
    return embedding;
  }

  private async persist(
    generation: Generation,
    slot: Slot,
    outcome: RetrievalOutcome,
    status: "draft" | "failed" | "no_candidates",
    reason: string | null,
    chunksById: Map<string, Chunk>,
    data?: ParsedQuestion,
  ): Promise<void> {
    const question = this.finalizedQuestion(slot, generation.settings, outcome.chunkIds, outcome.pages, status, reason, data);
    await this.generationRepo.upsertQuestion(generation.id, question);

    // Only real content is worth pooling into the chapter-wide question bank —
    // "failed"/"no_candidates" slots have no stem/answer to show anyone.
    if (status !== "draft" || !data) return;
    const chapters = [...new Set(outcome.chunkIds.map((id) => chunksById.get(id)?.chapter).filter((c): c is number => c !== undefined))];
    await this.questionBankRepo.upsert({
      id: `${generation.id}:${slot.slotId}`,
      bookId: generation.bookId,
      userId: generation.userId,
      generationId: generation.id,
      slotId: slot.slotId,
      chapters: chapters.length > 0 ? chapters : slot.chapters,
      pages: outcome.pages,
      questionType: slot.questionType,
      bloom: slot.bloom,
      marks: slot.marks,
      difficulty: generation.settings.difficulty,
      stem: data.stem,
      options: data.options,
      answer: data.answer,
      explanation: data.explanation,
      status: "draft",
      chunkIds: outcome.chunkIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private pendingQuestion(slot: Slot, settings: GenerationSettings): GeneratedQuestion {
    return {
      slotId: slot.slotId,
      chunkIds: [],
      pages: [],
      bloom: slot.bloom,
      questionType: slot.questionType,
      marks: slot.marks,
      difficulty: settings.difficulty,
      stem: null,
      options: null,
      answer: null,
      explanation: null,
      status: "pending",
      reason: null,
      isManual: false,
    };
  }

  private finalizedQuestion(
    slot: Slot,
    settings: GenerationSettings,
    chunkIds: string[],
    pages: number[],
    status: "draft" | "failed" | "no_candidates",
    reason: string | null,
    data?: ParsedQuestion,
  ): GeneratedQuestion {
    return {
      slotId: slot.slotId,
      chunkIds,
      pages,
      bloom: slot.bloom,
      questionType: slot.questionType,
      marks: slot.marks,
      difficulty: settings.difficulty,
      stem: data?.stem ?? null,
      options: data?.options ?? null,
      answer: data?.answer ?? null,
      explanation: data?.explanation ?? null,
      status,
      reason,
      isManual: false,
    };
  }
}
