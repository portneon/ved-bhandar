import { ChunkType } from "../entities/Chunk.js";

/**
 * Hard ceiling on maxBloom per chunk type (spec 4.4). The tagging model's
 * own maxBloom is clamped through this table before persisting, since
 * retrieval's maxBloom >= bloom filter depends on it being trustworthy.
 * 6 (Create) is never set by tagging — Create questions combine chunks.
 */
const BLOOM_CEILING_BY_TYPE: Record<ChunkType, number> = {
  fact: 2,
  other: 2,
  definition: 2,
  formula: 3,
  example: 3,
  process: 4,
  classification: 4,
  comparison: 5,
  cause_effect: 5,
};

export function clampMaxBloom(type: ChunkType, proposed: number): number {
  const ceiling = BLOOM_CEILING_BY_TYPE[type];
  return Math.min(proposed, ceiling);
}
