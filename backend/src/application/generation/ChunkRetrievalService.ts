import { inject, injectable } from "tsyringe";
import { TYPES_FOR_BLOOM } from "../../domain/constants/typesForBloom";
import { Chunk } from "../../domain/entities/Chunk";
import { PageRange, Slot } from "../../domain/entities/Slot";
import { IEmbeddingProvider } from "../../domain/interfaces/IEmbeddingProvider";
import { ChunkFilter, IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository";
import { weightedSample } from "./weightedSample";

const VECTOR_SCORE_THRESHOLD = 0.55;
const NO_CANDIDATES_REASON =
  "No content in the selected pages supports this Bloom level/type. Try lowering this slot's Bloom level or widening the page range.";

export interface RetrievalOutcome {
  slotId: string;
  chunkIds: string[];
  pages: number[];
  status: "ready" | "no_candidates";
  reason?: string;
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

  async retrieve(bookId: string, topic: string | undefined, slots: Slot[]): Promise<Map<string, RetrievalOutcome>> {
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
      await this.resolveGroup(bookId, queryVector, group, outcomes);
    }

    return outcomes;
  }

  private async resolveGroup(
    bookId: string,
    queryVector: number[] | null,
    group: SlotGroup,
    outcomes: Map<string, RetrievalOutcome>,
  ): Promise<void> {
    const types = TYPES_FOR_BLOOM[group.bloom] ?? [];
    const filter: ChunkFilter = {
      bookId,
      chapters: group.slots[0].chapters,
      pageRange: group.pageRange,
      types,
      minMaxBloom: Math.min(group.bloom, 5),
    };
    const k = group.slots.length;

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
      for (const slot of group.slots) {
        outcomes.set(slot.slotId, { slotId: slot.slotId, chunkIds: [], pages: [], status: "no_candidates", reason: NO_CANDIDATES_REASON });
      }
      return;
    }

    for (let i = 0; i < group.slots.length; i++) {
      const slot = group.slots[i];
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
