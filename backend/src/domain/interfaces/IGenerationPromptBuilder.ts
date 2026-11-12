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
}

export interface GenerationPromptInput {
  subject: string;
  grade: string;
  difficulty: Difficulty;
  chunks: ChunkForGeneration[];
  slots: SlotForGeneration[];
}

export interface IGenerationPromptBuilder {
  build(input: GenerationPromptInput): BuiltPrompt;
}
