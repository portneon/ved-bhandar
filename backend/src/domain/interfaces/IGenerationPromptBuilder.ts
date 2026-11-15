import { BuiltPrompt } from "./BuiltPrompt";
import { Difficulty, QuestionType } from "../entities/Slot";

export interface ChunkForGeneration {
  id: string;
  page: number;
  text: string;
}

export interface SlotForGeneration {
  slotId: string;
  questionType: QuestionType;
  bloom: number;
  marks: number;
  chunkIds: string[];
  /** Why the previous attempt at this slot was rejected, if this is a retry — steers the model away from repeating it. */
  retryHint?: string;
  /** The angle/scenario the teacher-planning stage chose for this slot's topic — the writer should test this, not just anything the chunk mentions. */
  focus?: string;
}

export interface GenerationPromptInput {
  subject: string;
  grade: string;
  difficulty: Difficulty;
  chunks: ChunkForGeneration[];
  slots: SlotForGeneration[];
}

export interface QuestionForRefine {
  questionType: QuestionType;
  bloom: number;
  marks: number;
  stem: string;
  options: string[] | null;
  answer: string;
  explanation: string;
}

export interface RefinePromptInput {
  subject: string;
  grade: string;
  difficulty: Difficulty;
  chunks: ChunkForGeneration[];
  question: QuestionForRefine;
  instruction: string;
}

export interface IGenerationPromptBuilder {
  build(input: GenerationPromptInput): BuiltPrompt;
  buildRefine(input: RefinePromptInput): BuiltPrompt;
}
