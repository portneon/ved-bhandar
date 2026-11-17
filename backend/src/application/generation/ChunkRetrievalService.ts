import { inject, injectable } from "tsyringe";
import { TYPES_FOR_BLOOM } from "../../domain/constants/typesForBloom.js";
import { Chunk } from "../../domain/entities/Chunk.js";
import { PageRange, Slot } from "../../domain/entities/Slot.js";
import { IEmbeddingProvider } from "../../domain/interfaces/IEmbeddingProvider.js";
import { ChunkFilter, IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository.js";
import { weightedSample } from "./weightedSample.js";
import { TopicPlanEntry } from "./TopicPlanningService.js";

const VECTOR_SCORE_THRESHOLD = 0.55;
const NO_CANDIDATES_REASON =
  "No content in the selected pages supports this Bloom level/type. Try lowering this slot's Bloom level or widening the page range.";

export interface RetrievalOutcome {
  slotId: string;
  chunkIds: string[];
  pages: number[];
  status: "ready" | "no_candidates";
  reason?: string;
  /** One-sentence angle from the teacher-planning stage, if this slot's topic was chosen by the plan rather than sampled. */
  focus?: string;
}

interface SlotGroup {
  bloom: number;
  pageRange: PageRange | null;
  slots: Slot[];
}

@injectable()
export class ChunkRetrievalService {
  constructor(
    @inject("IChunkRepository") private readonly chunkRepo: IChunkRepository,
    @inject("IEmbeddingProvider") private readonly embeddingProvider: IEmbeddingProvider,
  ) {}

  async retrieve(
    bookId: string,
    topic: string | undefined,
    slots: Slot[],
    plan?: Map<string, TopicPlanEntry>,
  ): Promise<Map<string, RetrievalOutcome>> {
    const outcomes = new Map<string, RetrievalOutcome>();
    const groups = this.groupSlots(slots);

    let queryVector: number[] | null = null;
    if (topic) {
      const [vector] = await this.embeddingProvider.embed([
        `Represent this sentence for searching relevant passages: ${topic}`,
      ]);
      queryVector = vector;
    }

    for (const group of groups.values()) {
      await this.resolveGroup(bookId, queryVector, group, outcomes, plan);
    }

    return outcomes;
  }

  private async resolveGroup(
    bookId: string,
    queryVector: number[] | null,
    group: SlotGroup,
    outcomes: Map<string, RetrievalOutcome>,
    plan: Map<string, TopicPlanEntry> | undefined,
  ): Promise<void> {
    // Slots the teacher-planning stage already assigned a topic to skip
    // sampling entirely — only the slots it left uncovered fall through to
    // the mechanical weighted/random selection below.
    const unplannedSlots: Slot[] = [];
    for (const slot of group.slots) {
      const planEntry = plan?.get(slot.slotId);
      if (!planEntry) {
        unplannedSlots.push(slot);
        continue;
      }
      const chunkIds = [planEntry.chunkId, planEntry.secondaryChunkId].filter((id): id is string => Boolean(id));
      const pages = [planEntry.page, planEntry.secondaryPage].filter((page): page is number => typeof page === "number");
      outcomes.set(slot.slotId, { slotId: slot.slotId, chunkIds, pages, status: "ready", focus: planEntry.focus });
    }
    if (unplannedSlots.length === 0) return;

    const types = TYPES_FOR_BLOOM[group.bloom] ?? [];
    const filter: ChunkFilter = {
      bookId,
      chapters: unplannedSlots[0].chapters,
      pageRange: group.pageRange,
      types,
      minMaxBloom: Math.min(group.bloom, 5),
    };
    const k = unplannedSlots.length;

    let primaryCandidates: Chunk[];
    if (queryVector) {
      const scored = await this.chunkRepo.vectorSearch({
        filter,
        queryVector,
        limit: k * 3,
        numCandidates: Math.max(100, k * 20),
      });
      const relevant = scored.filter((candidate) => candidate.score >= VECTOR_SCORE_THRESHOLD);
      primaryCandidates = weightedSample(
        relevant.map((candidate) => ({ item: candidate.chunk, weight: candidate.score })),
        k,
      );
    } else {
      primaryCandidates = await this.chunkRepo.sample(filter, k);
    }

    if (primaryCandidates.length === 0) {
      for (const slot of unplannedSlots) {
        outcomes.set(slot.slotId, { slotId: slot.slotId, chunkIds: [], pages: [], status: "no_candidates", reason: NO_CANDIDATES_REASON });
      }
      return;
    }

    for (let i = 0; i < unplannedSlots.length; i++) {
      const slot = unplannedSlots[i];
      const primary = primaryCandidates[i % primaryCandidates.length];
      const chunkIds = [primary.id];
      const pages = [primary.page];

      if (group.bloom >= 4 && primary.embedding) {
        const partner = await this.chunkRepo.findPartner({
          bookId,
          chapters: slot.chapters,
          types: ["comparison", "cause_effect"],
          queryVector: primary.embedding,
          excludeId: primary.id,
        });
        if (partner) {
          chunkIds.push(partner.id);
          pages.push(partner.page);
        }
      }

      outcomes.set(slot.slotId, { slotId: slot.slotId, chunkIds, pages, status: "ready" });
    }
  }

  private groupSlots(slots: Slot[]): Map<string, SlotGroup> {
    const groups = new Map<string, SlotGroup>();
    for (const slot of slots) {
      const key = `${slot.bloom}|${slot.pageRange ? `${slot.pageRange.from}-${slot.pageRange.to}` : "all"}`;
      const group = groups.get(key) ?? { bloom: slot.bloom, pageRange: slot.pageRange, slots: [] };
      group.slots.push(slot);
      groups.set(key, group);
    }
    return groups;
  }
}
