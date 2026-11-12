import { injectable } from "tsyringe";
import { BuiltPrompt } from "../../domain/interfaces/BuiltPrompt";
import { GenerationPromptInput, IGenerationPromptBuilder } from "../../domain/interfaces/IGenerationPromptBuilder";

const SYSTEM_PROMPT = `You write exam questions for Indian school teachers from textbook extracts.
Rules:
- Use ONLY facts in the given extracts. If the extracts cannot support a slot, return {"slotId":..., "skip":"reason"}.
- Match the Bloom level exactly:
  1 Remember: recall a stated fact or term
  2 Understand: explain or describe in own words
  3 Apply: use a rule or process in a new, concrete situation
  4 Analyze: compare, relate parts, find causes across two ideas
  5 Evaluate: judge a claim or conclusion and justify it with the text
  6 Create: design or propose something that combines the ideas
- Difficulty: easy = direct wording; medium = one step of reasoning; hard = two steps or an unfamiliar context.
- MCQ: exactly 4 options, exactly one correct, wrong options plausible and from the same topic. No "all of the above".
- Every question lists the chunk ids it uses.
- Use clear language for the given class.
Return JSON: {"questions":[{"slotId","chunkIds","stem","options","answer","explanation","bloom"}]}`;

@injectable()
export class GenerationPromptBuilder implements IGenerationPromptBuilder {
  build({ subject, grade, difficulty, chunks, slots }: GenerationPromptInput): BuiltPrompt {
    const header = `Class ${grade}, ${subject}. Difficulty: ${difficulty}.`;
    const extracts = chunks.map((chunk) => `[${chunk.id}] (p. ${chunk.page}) ${chunk.text}`).join("\n");
    const slotsJson = JSON.stringify(
      slots.map((slot) => ({
        slotId: slot.slotId,
        type: slot.questionType,
        bloom: slot.bloom,
        marks: slot.marks,
        chunks: slot.chunkIds,
      })),
    );

    const user = [header, "Extracts:", extracts, "Slots:", slotsJson].join("\n");

    return { system: SYSTEM_PROMPT, user };
  }
}
