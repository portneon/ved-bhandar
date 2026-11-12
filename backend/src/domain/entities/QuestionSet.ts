export type QuestionSetStatus = "draft" | "generated" | "finalized";
export type PageSize = "A4" | "LETTER" | "LEGAL";

export interface GenerationConfig {
  [key: string]: unknown;
  distribution: Record<string, number>;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  customInstructions?: string;
  model: string;
}

export class QuestionSet {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public title: string,
    public status: QuestionSetStatus,
    public config: GenerationConfig,
    public pageSize: PageSize,
    public readonly createdAt: Date,
  ) {}
}
