import { inject, injectable } from "tsyringe";
import { randomUUID } from "crypto";
import pLimit from "p-limit";
import { z } from "zod";
import { Book, TokenUsage } from "../../domain/entities/Book";
import { Generation, GenerationSettings } from "../../domain/entities/Generation";
import { GeneratedQuestion } from "../../domain/entities/GeneratedQuestion";
import { Chunk } from "../../domain/entities/Chunk";
import { Slot } from "../../domain/entities/Slot";
import { ILlmProvider } from "../../domain/interfaces/ILlmProvider";
import { IGenerationPromptBuilder } from "../../domain/interfaces/IGenerationPromptBuilder";
import { IEmbeddingProvider } from "../../domain/interfaces/IEmbeddingProvider";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository";
import { IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository";
import { IGenerationRepository } from "../../domain/interfaces/repositories/IGenerationRepository";
import { buildSlots } from "../generation/SlotBuilder";
import { ChunkRetrievalService, RetrievalOutcome } from "../generation/ChunkRetrievalService";
import { chunkIdsAreSubset, isDuplicateStem, isValidMcq } from "../generation/GenerationValidator";
import { extractJson } from "../shared/extractJson";

const BATCH_SIZE = 5;
const CONCURRENCY = 5;

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

@injectable()
export class GenerationService {
  constructor(
    @inject("IBookRepository") private readonly bookRepo: IBookRepository,
    @inject("IChunkRepository") private readonly chunkRepo: IChunkRepository,
    @inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository,
    @inject(ChunkRetrievalService) private readonly retrievalService: ChunkRetrievalService,
    @inject("IGenerationPromptBuilder") private readonly promptBuilder: IGenerationPromptBuilder,
    @inject("IEmbeddingProvider") private readonly embeddingProvider: IEmbeddingProvider,
    @inject("ILlmProvider") private readonly llmProvider: ILlmProvider,
  ) {}

  async start(settings: GenerationSettings): Promise<Generation> {
    const slots = buildSlots(settings);
    const questions = slots.map((slot) => this.pendingQuestion(slot, settings));
    const generation = new Generation(randomUUID(), settings.bookId, settings, slots, questions, { input: 0, output: 0 }, new Date());
    await this.generationRepo.create(generation);

    this.runInBackground(generation).catch((error) => {
      console.error(`Generation failed for ${generation.id}`, error);
    });

    return generation;
  }

  private async runInBackground(generation: Generation): Promise<void> {
    const book = await this.bookRepo.findById(generation.bookId);
    if (!book) throw new Error("Book not found");

    const outcomes = await this.retrievalService.retrieve(generation.bookId, generation.settings.topic, generation.slots);
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

    await Promise.all(
      batches.map((batch) => limit(() => this.processBatch(generation, book, batch, outcomes, chunksById, acceptedStemEmbeddings))),
    );
  }

  async regenerateSlot(generationId: string, slotId: string): Promise<void> {
    const generation = await this.generationRepo.findById(generationId);
    if (!generation) throw new Error("Generation not found");
    const slot = generation.slots.find((s) => s.slotId === slotId);
    if (!slot) throw new Error("Slot not found");
    const book = await this.bookRepo.findById(generation.bookId);
    if (!book) throw new Error("Book not found");

    const outcomes = await this.retrievalService.retrieve(generation.bookId, generation.settings.topic, [slot]);
    const outcome = outcomes.get(slotId);
    if (!outcome || outcome.status === "no_candidates") {
      await this.persist(generation, slot, outcome ?? { slotId, chunkIds: [], pages: [], status: "no_candidates" }, "no_candidates", outcome?.reason ?? "No candidates found.");
      return;
    }

    const chunks = await this.chunkRepo.findByIds(outcome.chunkIds);
    const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    const results = await this.callGeneration(generation, book, [slot], new Map([[slotId, outcome]]), chunksById);
    const result = results.get(slotId);

    if (!result || "reason" in result) {
      await this.persist(generation, slot, outcome, "failed", result && "reason" in result ? result.reason : "Could not generate a valid question for this slot.");
      return;
    }

    const existingStemEmbeddings = await this.collectStemEmbeddings(generation, slotId);
    const validity = await this.validate(slot, outcome, result.data, existingStemEmbeddings);
    if (validity.valid) {
      await this.persist(generation, slot, outcome, "draft", null, result.data);
    } else {
      await this.persist(generation, slot, outcome, "failed", validity.reason);
    }
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
  ): Promise<void> {
    const results = await this.callGeneration(generation, book, batch, outcomes, chunksById);
    const toRetry: Slot[] = [];

    for (const slot of batch) {
      const outcome = outcomes.get(slot.slotId)!;
      const result = results.get(slot.slotId);

      if (!result || "reason" in result) {
        await this.persist(generation, slot, outcome, "failed", result && "reason" in result ? result.reason : "No response for this slot.");
        continue;
      }

      const validity = await this.validate(slot, outcome, result.data, acceptedStemEmbeddings);
      if (validity.valid) {
        acceptedStemEmbeddings.push(validity.stemEmbedding);
        await this.persist(generation, slot, outcome, "draft", null, result.data);
      } else {
        toRetry.push(slot);
      }
    }

    if (toRetry.length === 0) return;

    const retryResults = await this.callGeneration(generation, book, toRetry, outcomes, chunksById);
    for (const slot of toRetry) {
      const outcome = outcomes.get(slot.slotId)!;
      const result = retryResults.get(slot.slotId);

      if (!result || "reason" in result) {
        await this.persist(generation, slot, outcome, "failed", result && "reason" in result ? result.reason : "Could not generate a valid question for this slot.");
        continue;
      }

      const validity = await this.validate(slot, outcome, result.data, acceptedStemEmbeddings);
      if (validity.valid) {
        acceptedStemEmbeddings.push(validity.stemEmbedding);
        await this.persist(generation, slot, outcome, "draft", null, result.data);
      } else {
        await this.persist(generation, slot, outcome, "failed", validity.reason);
      }
    }
  }

  private async callGeneration(
    generation: Generation,
    book: Book,
    slots: Slot[],
    outcomes: Map<string, RetrievalOutcome>,
    chunksById: Map<string, Chunk>,
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
    data?: ParsedQuestion,
  ): Promise<void> {
    await this.generationRepo.upsertQuestion(
      generation.id,
      this.finalizedQuestion(slot, generation.settings, outcome.chunkIds, outcome.pages, status, reason, data),
    );
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
    };
  }
}
