import { Difficulty, QuestionType } from "./Slot";
import { GeneratedQuestionStatus } from "./GeneratedQuestion";

/**
 * A denormalized, cross-generation record of one generated question, pooled
 * by chapter. Unlike a Generation document (which only groups questions by
 * the run that produced them), this is what "every question ever generated
 * for chapter N" queries against — independent of which run produced it.
 */
export interface QuestionBankEntry {
  id: string;
  bookId: string;
  userId: string;
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
  chunkIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
