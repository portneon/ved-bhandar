export interface ChunkDraftForTagging {
  id: string;
  text: string;
}

export interface TaggingPromptInput {
  subject: string;
  grade: string;
  chapter: number;
  sectionPath: string;
  sectionTitle: string;
  chunks: ChunkDraftForTagging[];
}

import { BuiltPrompt } from "./BuiltPrompt";

export interface ITaggingPromptBuilder {
  build(input: TaggingPromptInput): BuiltPrompt;
}
