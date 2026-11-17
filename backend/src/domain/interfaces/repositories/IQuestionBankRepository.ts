import { QuestionBankEntry } from "../../entities/QuestionBankEntry.js";

export interface QuestionBankPatch {
  stem?: string;
  options?: string[] | null;
  answer?: string;
  explanation?: string;
  status?: "accepted" | "rejected" | "draft";
}

export interface IQuestionBankRepository {
  upsert(entry: QuestionBankEntry): Promise<void>;
  patch(generationId: string, slotId: string, patch: QuestionBankPatch): Promise<void>;
  /** Most recent first. Omit `chapter` for every chapter of the book. */
  findByBook(bookId: string, userId: string, chapter?: number): Promise<QuestionBankEntry[]>;
  deleteByBookId(bookId: string): Promise<void>;
}
