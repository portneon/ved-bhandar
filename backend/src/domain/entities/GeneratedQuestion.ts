import { Difficulty, QuestionType } from "./Slot";

/**
 * "pending"/"no_candidates"/"failed" are pipeline states the spec's
 * draft/accepted/rejected editing lifecycle didn't anticipate; a question
 * only reaches "draft" once generation actually produced it.
 */
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
  /** Added by hand from the results page, not produced by the generation pipeline — has no source slot to regenerate from. */
  isManual: boolean;
}
