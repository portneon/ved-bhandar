import { TokenUsage } from "./Book";
import { GeneratedQuestion } from "./GeneratedQuestion";
import { Difficulty, QuestionType, Slot } from "./Slot";

export interface PageSplitRange {
  from: number;
  to: number;
  share: number;
}

export interface GenerationItem {
  type: QuestionType;
  bloom: number;
  count: number;
  marks: number;
}

export interface GenerationSettings {
  bookId: string;
  chapters: number[];
  topic?: string;
  pageSplit?: PageSplitRange[];
  items: GenerationItem[];
  difficulty: Difficulty;
}

export class Generation {
  constructor(
    public readonly id: string,
    public readonly bookId: string,
    public readonly settings: GenerationSettings,
    public slots: Slot[],
    public questions: GeneratedQuestion[],
    public tokenUsage: TokenUsage,
    public readonly createdAt: Date,
  ) {}
}
