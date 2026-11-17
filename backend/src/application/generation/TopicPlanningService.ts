import { inject, injectable } from "tsyringe";
import { z } from "zod";
import { ChunkCatalogEntry } from "../../domain/entities/Chunk.js";
import { Difficulty, Slot } from "../../domain/entities/Slot.js";
import { ILlmProvider } from "../../domain/interfaces/ILlmProvider.js";
import { ITopicPlanningPromptBuilder } from "../../domain/interfaces/ITopicPlanningPromptBuilder.js";
import { IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository.js";
import { IGenerationRepository } from "../../domain/interfaces/repositories/IGenerationRepository.js";
import { TYPES_FOR_BLOOM } from "../../domain/constants/typesForBloom.js";
import { extractJson } from "../shared/extractJson.js";

export interface TopicPlanEntry {
  chunkId: string;
  page: number;
  secondaryChunkId?: string;
  secondaryPage?: number;
  focus: string;
}

const planEntrySchema = z.object({
  slotId: z.string(),
  chunkId: z.string(),
  secondaryChunkId: z.string().optional(),
  focus: z.string(),
});
const planResponseSchema = z.object({ plan: z.array(planEntrySchema) });

@injectable()
export class TopicPlanningService {
  constructor(
    @inject("IChunkRepository") private readonly chunkRepo: IChunkRepository,
    @inject("ITopicPlanningPromptBuilder") private readonly promptBuilder: ITopicPlanningPromptBuilder,
    @inject("ILlmProvider") private readonly llmProvider: ILlmProvider,
    @inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository,
  ) {}

  /**
   * Asks an LLM, acting as chief examiner, which topic each slot should be built
   * from before any question is written. Returns only entries that pass this
   * slot's own constraints (chapter, page range, Bloom ceiling, allowed type) —
   * any slot missing from the result falls back to the existing mechanical
   * sampling in ChunkRetrievalService, so a bad or failed plan never blocks
   * generation.
   */
  async plan(
    generationId: string,
    bookId: string,
    subject: string,
    grade: string,
    difficulty: Difficulty,
    topic: string | undefined,
    slots: Slot[],
  ): Promise<Map<string, TopicPlanEntry>> {
    const result = new Map<string, TopicPlanEntry>();
    if (slots.length === 0) return result;

    const chapters = [...new Set(slots.flatMap((slot) => slot.chapters))];
    const catalog = await this.chunkRepo.findCatalog(bookId, chapters);
    if (catalog.length === 0) return result;

    const { system, user } = this.promptBuilder.build({
      subject,
      grade,
      difficulty,
      topic,
      catalog,
      slots: slots.map((slot) => ({
        slotId: slot.slotId,
        questionType: slot.questionType,
        bloom: slot.bloom,
        marks: slot.marks,
        chapters: slot.chapters,
        pageRange: slot.pageRange,
      })),
    });

    const model = process.env.GENERATION_MODEL ?? "openai/gpt-4o-mini";
    let completion;
    try {
      completion = await this.llmProvider.complete(system, user, model);
    } catch (error) {
      console.error("Topic planning call failed; falling back to automatic topic selection.", error);
      return result;
    }
    await this.generationRepo.addTokenUsage(generationId, {
      input: completion.usage.inputTokens,
      output: completion.usage.outputTokens,
    });

    const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
    const slotsById = new Map(slots.map((slot) => [slot.slotId, slot]));

    try {
      const parsed = planResponseSchema.parse(JSON.parse(extractJson(completion.content)));
      for (const entry of parsed.plan) {
        const slot = slotsById.get(entry.slotId);
        if (!slot) continue;
        const primary = catalogById.get(entry.chunkId);
        if (!primary || !this.fitsSlot(slot, primary)) continue;

        const secondaryEntry =
          entry.secondaryChunkId && entry.secondaryChunkId !== entry.chunkId ? catalogById.get(entry.secondaryChunkId) : undefined;

        result.set(entry.slotId, {
          chunkId: primary.id,
          page: primary.page,
          secondaryChunkId: secondaryEntry?.id,
          secondaryPage: secondaryEntry?.page,
          focus: entry.focus,
        });
      }
    } catch (error) {
      console.error("Could not parse topic plan response; falling back to automatic topic selection.", error);
    }

    return result;
  }

  private fitsSlot(slot: Slot, entry: ChunkCatalogEntry): boolean {
    if (!slot.chapters.includes(entry.chapter)) return false;
    if (slot.pageRange && (entry.page < slot.pageRange.from || entry.page > slot.pageRange.to)) return false;
    if (entry.maxBloom < Math.min(slot.bloom, 5)) return false;
    const allowedTypes = TYPES_FOR_BLOOM[slot.bloom] ?? [];
    return allowedTypes.includes(entry.type);
  }
}
