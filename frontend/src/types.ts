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
  isManual: boolean;
}

export interface Generation {
  id: string;
  bookId: string;
  settings: GenerationSettings;
  tokenUsage: TokenUsage;
  createdAt: string;
  questions: GeneratedQuestion[];
}

/** A past generation run for a book, without its full question payload. */
export interface GenerationSummary {
  id: string;
  bookId: string;
  settings: GenerationSettings;
  tokenUsage: TokenUsage;
  createdAt: string;
  totalQuestions: number;
  acceptedQuestions: number;
  exportableQuestions: number;
}

/** A question pooled into the book's chapter-wide question bank — independent of which generation run produced it. */
export interface QuestionBankEntry {
  id: string;
  bookId: string;
  generationId: string;
  slotId: string;
  chapters: number[];
  pages: number[];
  questionType: QuestionType;
  bloom: number;
  marks: number;
  difficulty: Difficulty;
  stem: string;
  options: string[] | null;
  answer: string;
  explanation: string;
  status: GeneratedQuestionStatus;
  createdAt: string;
  updatedAt: string;
}

export type TemplateKind = "builder" | "docx";

export interface BuilderConfig {
  schoolName: string;
  headerText: string;
  footerText: string;
  showBloom: boolean;
  showMarks: boolean;
}

export interface Template {
  id: string;
  name: string;
  kind: TemplateKind;
  builderConfig: BuilderConfig | null;
  createdAt: string;
}

export function isGenerationSettled(generation: Generation): boolean {
  return generation.questions.every((question) => question.status !== "pending");
}

/** Mirrors GenerationPdfExporter's inclusion rule: only drafted/accepted questions with a stem are exported. */
export function willIncludeInPdfExport(question: GeneratedQuestion): boolean {
  return question.stem !== null && (question.status === "draft" || question.status === "accepted");
}
