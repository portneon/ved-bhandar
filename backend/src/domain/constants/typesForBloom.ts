import { ChunkType } from "../entities/Chunk.js";

/**
 * Which chunk types can support a question at each Bloom level (spec 6.1).
 * Bloom 6 (Create) combines two chunks at generation time rather than
 * relying on a single chunk's type.
 */
export const TYPES_FOR_BLOOM: Record<number, ChunkType[]> = {
  1: ["definition", "fact", "formula", "process", "classification", "comparison", "cause_effect"],
  2: ["definition", "process", "classification", "comparison", "cause_effect", "example"],
  3: ["formula", "process", "example", "cause_effect"],
  4: ["comparison", "classification", "cause_effect", "process"],
  5: ["cause_effect", "comparison"],
  6: ["process", "cause_effect", "comparison", "example"],
};
