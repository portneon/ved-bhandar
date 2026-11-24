import { Chunk, ChunkCatalogEntry, ChunkType, Modality } from "../../entities/Chunk.js";
import { PageRange } from "../../entities/Slot.js";
import { TransactionContext } from "../ITransactionManager.js";

export interface ChunkTagPatch {
  type: ChunkType;
  maxBloom: number;
  keyTerms: string[];
  summary: string;
  confidence: number;
  cause: string | null;
  effect: string | null;
  modality: Modality | null;
}

export interface ChunkFilter {
  bookId: string;
  chapters?: number[];
  pageRange?: PageRange | null;
  types: ChunkType[];
  minMaxBloom: number;
}

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

export interface VectorSearchParams {
  filter: ChunkFilter;
  queryVector: number[];
  limit: number;
  numCandidates: number;
}

export interface PartnerSearchParams {
  bookId: string;
  chapters: number[];
  types: ChunkType[];
  queryVector: number[];
  excludeId: string;
}

export interface IChunkRepository {
  insertMany(chunks: Chunk[]): Promise<void>;
  findByBookId(bookId: string): Promise<Chunk[]>;
  findByIds(ids: string[]): Promise<Chunk[]>;
  deleteByBookId(bookId: string, ctx?: TransactionContext): Promise<void>;
  /** Tagged chunks for the given chapters, as metadata only (no text/embedding) — the "topic catalog" sent to the teacher-planning LLM stage. */
  findCatalog(bookId: string, chapters: number[]): Promise<ChunkCatalogEntry[]>;
  applyTag(id: string, tag: ChunkTagPatch): Promise<void>;
  applyEmbedding(id: string, embedding: number[]): Promise<void>;
  sample(filter: ChunkFilter, limit: number): Promise<Chunk[]>;
  vectorSearch(params: VectorSearchParams): Promise<ScoredChunk[]>;
  findPartner(params: PartnerSearchParams): Promise<Chunk | null>;
}
