import { injectable } from "tsyringe";
import { BuiltPrompt } from "../../domain/interfaces/BuiltPrompt";
import { ITopicPlanningPromptBuilder, TopicPlanningInput } from "../../domain/interfaces/ITopicPlanningPromptBuilder";

const SYSTEM_PROMPT = `You are a senior, experienced teacher acting as chief examiner for this paper. Before any
question is written, you plan which topic each question slot should be built from — this is a planning step only,
do not write any question text here.

You are given a catalog of topics available from the selected chapter(s) — each with an id, its section, its type
(definition/fact/process/comparison/cause_effect/classification/example/formula), the highest Bloom level it can
support, its key terms and a one-line summary — and the list of slots to fill (question type, Bloom level, marks).

For each slot, choose the single best-fitting topic id:
- A topic's maxBloom is a ceiling, not a target — never assign a topic whose maxBloom is below the slot's Bloom level.
- Bloom 4 and 5 (Analyze/Evaluate) slots need a "comparison" or "cause_effect" topic; when it would sharpen the
  question, also name a secondaryChunkId — a second topic id to contrast or trace cause to effect against.
- MCQ slots need a topic with one unambiguous fact, definition or formula — avoid topics whose summary signals
  nuance, debate or more than one defensible reading.
- short_answer and long_answer slots at Bloom 3+ work best from "process", "example" or "cause_effect" topics rich
  enough to sustain a few sentences of reasoning.
- Spread your picks across the catalog — a good paper samples the breadth of the chapter, not one idea six times
  over, unless the catalog is too narrow to avoid it.
- Write "focus" as one sentence telling the question-writer exactly what angle, scenario or comparison to test.
  Never give away the answer in it.

Return strict JSON: {"plan":[{"slotId","chunkId","secondaryChunkId","focus"}]}. Include every slot you find a
genuine fit for; leave a slot out of the plan entirely rather than force a poor fit onto it.`;

@injectable()
export class TopicPlanningPromptBuilder implements ITopicPlanningPromptBuilder {
  build({ subject, grade, difficulty, topic, catalog, slots }: TopicPlanningInput): BuiltPrompt {
    const header = `${grade}, ${subject}. Difficulty: ${difficulty}.${topic ? ` Focus area requested: ${topic}.` : ""}`;

    const catalogJson = JSON.stringify(
      catalog.map((entry) => ({
        id: entry.id,
        chapter: entry.chapter,
        section: entry.sectionTitle,
        type: entry.type,
        maxBloom: entry.maxBloom,
        keyTerms: entry.keyTerms,
        summary: entry.summary,
      })),
    );

    const slotsJson = JSON.stringify(
      slots.map((slot) => ({
        slotId: slot.slotId,
        type: slot.questionType,
        bloom: slot.bloom,
        marks: slot.marks,
      })),
    );

    const user = [header, "Topic catalog:", catalogJson, "Slots to plan:", slotsJson].join("\n");

    return { system: SYSTEM_PROMPT, user };
  }
}
