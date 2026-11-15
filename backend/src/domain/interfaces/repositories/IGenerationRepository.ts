import { Generation } from "../../entities/Generation";
import { GeneratedQuestion } from "../../entities/GeneratedQuestion";
import { TokenUsage } from "../../entities/Book";

export interface QuestionPatch {
  stem?: string;
  options?: string[] | null;
  answer?: string;
  explanation?: string;
  status?: "accepted" | "rejected" | "draft";
}

export interface IGenerationRepository {
  create(generation: Generation): Promise<Generation>;
  findById(id: string, userId: string): Promise<Generation | null>;
  /** Most recent first — every past generation run stays available, not just the latest. */
  findByBookId(bookId: string, userId: string): Promise<Generation[]>;
  upsertQuestion(generationId: string, question: GeneratedQuestion): Promise<void>;
  addManualQuestion(generationId: string, question: GeneratedQuestion): Promise<void>;
  updateQuestion(generationId: string, slotId: string, patch: QuestionPatch): Promise<void>;
  addTokenUsage(generationId: string, usage: TokenUsage): Promise<void>;
  deleteByBookId(bookId: string): Promise<void>;
}
