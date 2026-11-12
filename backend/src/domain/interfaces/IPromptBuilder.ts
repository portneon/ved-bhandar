import { GenerationConfig } from "../entities/QuestionSet";

export interface PromptPage {
  pageNumber: number;
  text: string;
}

export interface PromptInput {
  pagesText: PromptPage[];
  config: GenerationConfig;
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

export interface IPromptBuilder {
  build(input: PromptInput): BuiltPrompt;
}
