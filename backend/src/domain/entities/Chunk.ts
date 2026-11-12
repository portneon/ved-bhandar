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
