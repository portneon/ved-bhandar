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

export interface Book {
  id: string;
  title: string;
  board: string;
  grade: string;
  subject: string;
  status: BookStatus;
  progress: number;
  pages: number;
  chapters: ChapterRange[];
  tokenUsage: TokenUsage;
  failureReason: string | null;
  createdAt: string;
}

export type QuestionType = "mcq" | "short_answer" | "long_answer";
export type Difficulty = "easy" | "medium" | "hard";

export interface GenerationItem {
  type: QuestionType;
  bloom: number;
  count: number;
  marks: number;
}

export interface PageSplitRange {
  from: number;
  to: number;
  share: number;
}

export interface GenerationSettings {
  bookId: string;
  chapters: number[];
  topic?: string;
  pageSplit?: PageSplitRange[];
  items: GenerationItem[];
  difficulty: Difficulty;
}

export type GeneratedQuestionStatus = "pending" | "draft" | "accepted" | "rejected" | "no_candidates" | "failed";

export interface GeneratedQuestion {
  slotId: string;
  chunkIds: string[];
  pages: number[];
  bloom: number;
  questionType: QuestionType;
  marks: number;
  difficulty: Difficulty;
  stem: string | null;
  options: string[] | null;
  answer: string | null;
  explanation: string | null;
  status: GeneratedQuestionStatus;
  reason: string | null;
}

export interface Generation {
  id: string;
  bookId: string;
  settings: GenerationSettings;
  tokenUsage: TokenUsage;
  createdAt: string;
  questions: GeneratedQuestion[];
}

export function isGenerationSettled(generation: Generation): boolean {
  return generation.questions.every((question) => question.status !== "pending");
}
