import { injectable } from "tsyringe";
import { BuiltPrompt } from "../../domain/interfaces/BuiltPrompt.js";
import { GenerationPromptInput, IGenerationPromptBuilder, RefinePromptInput } from "../../domain/interfaces/IGenerationPromptBuilder.js";

const SYSTEM_PROMPT = `You are an experienced teacher writing exam questions from textbook extracts, for learners
anywhere from school to college and university. A lead examiner has already planned which topic and angle each slot
should test — your job is to write a question that actually tests understanding of that angle, the way a thoughtful
teacher would, not to mechanically restate the extract.
Rules:
- Use ONLY facts in the given extracts. If the extracts cannot support a slot, return {"slotId":..., "skip":"reason"}.
- The stem must be fully self-contained: copy every number, name, or given fact a student needs into the stem itself.
  Never write a question that only makes sense if the reader has also seen the extract (e.g. don't ask to compute a
  probability from data that is stated only in your explanation, not in the stem). A student reading the stem alone,
  with no access to the extract, must have everything required to work out the answer.
- Write every mathematical expression — fractions, probabilities, set notation, equations, exponents, etc. — as LaTeX,
  wrapped in $...$ for inline math or $$...$$ for a displayed equation. Never use Unicode math symbols (∩, →, √, …)
  directly; write them as LaTeX commands instead (e.g. $P(A \\cap B)$, not "P(A ∩ B)").
- If a slot has a "focus" note, that is the lead teacher's plan for this question — test that specific angle,
  scenario or comparison. Do not ignore it or answer a different question than it asks.
- Match the Bloom level exactly:
  1 Remember: recall a stated fact or term
  2 Understand: explain or describe in own words
  3 Apply: use a rule or process in a new, concrete situation
  4 Analyze: compare, relate parts, find causes across two ideas
  5 Evaluate: judge a claim or conclusion and justify it with the text
  6 Create: design or propose something that combines the ideas
- Difficulty: easy = direct wording; medium = one step of reasoning; hard = two steps or an unfamiliar context.
- Write like a teacher checking whether a student understood the idea, not whether they can spot the extract's exact
  wording — rephrase the stem in your own words instead of lifting sentences verbatim.
- MCQ: exactly 4 options, exactly one correct, all four similar in length and grammatical form, wrong options
  plausible, specific and drawn from the same topic. Never use "all/none of the above" or an option that stands out
  as obviously different from the rest.
- short_answer and long_answer: set "options" to null. Never attach multiple-choice options to these types. The
  answer should read like what a well-prepared student would actually write, not a single bare word, unless the
  question explicitly asks for one.
- Every explanation should teach: state why the answer is correct using the extract, and for MCQ, briefly note why
  the strongest distractor is wrong.
- Every question lists the chunk ids it uses.
- Use clear language appropriate for the given academic level — no vocabulary a student at that level wouldn't have met.
Return JSON: {"questions":[{"slotId","chunkIds","stem","options","answer","explanation","bloom"}]}`;

const REFINE_SYSTEM_PROMPT = `You are revising a single exam question exactly as instructed, changing only what the
instruction asks for and preserving everything else.
Rules:
- Keep the same question type, Bloom level and marks unless the instruction explicitly says to change them.
- The stem must stay fully self-contained: copy every number, name, or given fact a student needs into the stem
  itself — never rely on the reader having seen anything outside the stem.
- Write every mathematical expression — fractions, probabilities, set notation, equations, exponents, etc. — as
  LaTeX, wrapped in $...$ or $$...$$. Never use Unicode math symbols (∩, →, √, …) directly.
- MCQ: exactly 4 options, exactly one correct, all four similar in length and grammatical form, wrong options
  plausible and specific. Never use "all/none of the above".
- short_answer and long_answer: "options" must be null.
- If source extracts are given below, stay grounded in them — don't invent facts they don't support. If none are
  given, work only from the question's own existing content.
- The explanation should teach: state why the answer is correct, and for MCQ, briefly note why the strongest
  distractor is wrong.
Return strict JSON only: {"stem","options","answer","explanation"}.`;

@injectable()
export class GenerationPromptBuilder implements IGenerationPromptBuilder {
  build({ subject, grade, difficulty, chunks, slots }: GenerationPromptInput): BuiltPrompt {
    const header = `${grade}, ${subject}. Difficulty: ${difficulty}.`;
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

    const focusNotes = slots
      .filter((slot) => slot.focus)
      .map((slot) => `- ${slot.slotId}: ${slot.focus}`);

    const retryNotes = slots
      .filter((slot) => slot.retryHint)
      .map((slot) => `- ${slot.slotId}: previous attempt was rejected — ${slot.retryHint}. Do not repeat that mistake; try a different angle on the same chunks.`);

    const sections = [header, "Extracts:", extracts, "Slots:", slotsJson];
    if (focusNotes.length > 0) {
      sections.push("Topic focus (from the lead teacher's plan — follow this angle):", focusNotes.join("\n"));
    }
    if (retryNotes.length > 0) {
      sections.push("Retry notes (these slots failed once already):", retryNotes.join("\n"));
    }

    return { system: SYSTEM_PROMPT, user: sections.join("\n") };
  }

  buildRefine({ subject, grade, difficulty, chunks, question, instruction }: RefinePromptInput): BuiltPrompt {
    const header = `${grade}, ${subject}. Difficulty: ${difficulty}. Question type: ${question.questionType}, Bloom ${question.bloom}, ${question.marks} mark(s).`;
    const current = JSON.stringify({
      stem: question.stem,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
    });

    const sections = [header, "Current question:", current, "Instruction:", instruction];
    if (chunks.length > 0) {
      const extracts = chunks.map((chunk) => `[${chunk.id}] (p. ${chunk.page}) ${chunk.text}`).join("\n");
      sections.push("Source extracts (stay grounded in these):", extracts);
    }

    return { system: REFINE_SYSTEM_PROMPT, user: sections.join("\n") };
  }
}
