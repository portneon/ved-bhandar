export type BookStatus = "uploaded" | "parsing" | "tagging" | "embedding" | "ready" | "failed";

export interface ChapterRange {
  no: number;
  title: string;
  pageStart: number;
  pageEnd: number;
}

export interface TokenUsage {
  input: number;
  output: number;
}

export class Book {
  constructor(
    public readonly id: string,
    public title: string,
    public readonly board: string,
    public readonly grade: string,
    public readonly subject: string,
    public readonly storagePath: string,
    public status: BookStatus,
    public progress: number,
    public pages: number,
    public chapters: ChapterRange[],
    public readonly embeddingModel: string,
    public tokenUsage: TokenUsage,
    public failureReason: string | null,
    public readonly createdAt: Date,
  ) {}
}
