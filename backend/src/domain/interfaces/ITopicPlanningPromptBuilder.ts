import { BuiltPrompt } from "./BuiltPrompt";
import { ChunkCatalogEntry } from "../entities/Chunk";
import { Difficulty, PageRange, QuestionType } from "../entities/Slot";

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
