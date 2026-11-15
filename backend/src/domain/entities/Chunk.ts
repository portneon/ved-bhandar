export type ChunkType =
  | "definition"
  | "fact"
  | "process"
  | "comparison"
  | "cause_effect"
  | "classification"
  | "example"
  | "formula"
  | "other";

export type Modality = "always" | "usually" | "can";

/** A lightweight projection of a tagged chunk — metadata only, no text/embedding — used to list "topics" for the teacher-planning stage without blowing up prompt size. */
export interface ChunkCatalogEntry {
  id: string;
  chapter: number;
  sectionTitle: string;
  page: number;
  type: ChunkType;
  maxBloom: number;
  keyTerms: string[];
  summary: string;
}

export class Chunk {
  constructor(
    public readonly id: string,
    public readonly bookId: string,
    public readonly chapter: number,
    public readonly sectionPath: string,
    public readonly sectionTitle: string,
    public readonly page: number,
    public readonly pageEnd: number,
    public readonly order: number,
    public readonly text: string,
    public type: ChunkType,
    public maxBloom: number,
    public keyTerms: string[],
    public summary: string,
    public confidence: number,
    // Round 2 hooks: populated now for cause_effect chunks, null otherwise.
    public cause: string | null,
    public effect: string | null,
    public modality: Modality | null,
    public embedding: number[] | null,
  ) {}
}
