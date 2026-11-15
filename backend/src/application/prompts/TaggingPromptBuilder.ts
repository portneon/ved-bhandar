import { injectable } from "tsyringe";
import { BuiltPrompt } from "../../domain/interfaces/BuiltPrompt";
import { ITaggingPromptBuilder, TaggingPromptInput } from "../../domain/interfaces/ITaggingPromptBuilder";

const SYSTEM_PROMPT = `You label textbook chunks for a question generator.
For each chunk return:
- type: one of definition, fact, process, comparison, cause_effect,
  classification, example, formula, other
- maxBloom: the highest Bloom level an honest exam question can reach
  using ONLY this chunk: 1 Remember, 2 Understand, 3 Apply, 4 Analyze,
  5 Evaluate, 6 Create
- keyTerms: up to 5 terms the chunk defines or relies on
- summary: at most 40 words, only facts stated in the chunk
- cause, effect: short phrases if type is cause_effect, else null
- modality: "always", "usually" or "can" for cause_effect, else null
- confidence: 0 to 1
Use only what the text states. Return JSON: {"chunks":[{"id":...,...}]}`;

@injectable()
export class TaggingPromptBuilder implements ITaggingPromptBuilder {
  build({ subject, grade, sectionPath, sectionTitle, chunks }: TaggingPromptInput): BuiltPrompt {
    const user = [
      `Book: ${subject}, ${grade}. Section ${sectionPath} "${sectionTitle}"`,
      ...chunks.map((chunk) => `[${chunk.id}] ${chunk.text}`),
    ].join("\n");

    return { system: SYSTEM_PROMPT, user };
  }
}
