import { BuiltPrompt } from "./BuiltPrompt.js";
import { ChunkCatalogEntry } from "../entities/Chunk.js";
import { Difficulty, PageRange, QuestionType } from "../entities/Slot.js";

export interface SlotForPlanning {
  slotId: string;
  questionType: QuestionType;
  bloom: number;
  marks: number;
  chapters: number[];
  pageRange: PageRange | null;
}

export interface TopicPlanningInput {
  subject: string;
  grade: string;
  difficulty: Difficulty;
  topic?: string;
  catalog: ChunkCatalogEntry[];
  slots: SlotForPlanning[];
}

export interface ITopicPlanningPromptBuilder {
  build(input: TopicPlanningInput): BuiltPrompt;
}
