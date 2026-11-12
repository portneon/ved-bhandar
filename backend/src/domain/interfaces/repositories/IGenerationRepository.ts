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
  findById(id: string): Promise<Generation | null>;
  upsertQuestion(generationId: string, question: GeneratedQuestion): Promise<void>;
  updateQuestion(generationId: string, slotId: string, patch: QuestionPatch): Promise<void>;
  addTokenUsage(generationId: string, usage: TokenUsage): Promise<void>;
}
