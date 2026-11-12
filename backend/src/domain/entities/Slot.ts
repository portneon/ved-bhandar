export type QuestionType = "mcq" | "short_answer" | "long_answer";
export type Difficulty = "easy" | "medium" | "hard";

export interface PageRange {
  from: number;
  to: number;
}

export interface Slot {
  slotId: string;
  questionType: QuestionType;
  bloom: number;
  marks: number;
  chapters: number[];
  pageRange: PageRange | null;
}
