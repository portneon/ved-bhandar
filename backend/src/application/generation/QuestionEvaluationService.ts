import { inject, injectable } from "tsyringe";
import { z } from "zod";
import { QuestionType } from "../../domain/entities/Slot";
import { ILlmProvider } from "../../domain/interfaces/ILlmProvider";
import { IGenerationRepository } from "../../domain/interfaces/repositories/IGenerationRepository";
import { extractJson } from "../shared/extractJson";

export interface QuestionToEvaluate {
  questionType: QuestionType;
  stem: string;
  options: string[] | null;
  answer: string;
  explanation: string;
}

const evaluationResponseSchema = z.object({
  valid: z.boolean(),
  reason: z.string().optional(),
});

const SYSTEM_PROMPT = `You are a strict exam proofreader. You are shown ONLY a finished question — never the
textbook extract it was written from. Judge it exactly as a student taking the exam would experience it:
- Self-contained: every number, name, or fact needed to answer the question must already be written in the stem.
  If answering requires a fact that only appears in the explanation (not the stem), that is a failure.
- Unambiguous: the stem must have exactly one reasonable reading.
- Correct: given only the stem (and options, for MCQ), the stated answer must actually be the right one, and the
  explanation's reasoning must hold up.
- For MCQ, exactly one option may match the stated answer.
Return strict JSON only: {"valid":true} if it passes every check, otherwise {"valid":false,"reason":"<short reason a
question writer could act on>"}.`;

@injectable()
export class QuestionEvaluationService {
  constructor(
    @inject("ILlmProvider") private readonly llmProvider: ILlmProvider,
    @inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository,
  ) {}

  async evaluate(generationId: string, question: QuestionToEvaluate): Promise<{ valid: true } | { valid: false; reason: string }> {
    const user = JSON.stringify({
      type: question.questionType,
      stem: question.stem,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
    });

    const model = process.env.GENERATION_MODEL ?? "openai/gpt-4o-mini";
    let completion;
    try {
      completion = await this.llmProvider.complete(SYSTEM_PROMPT, user, model);
    } catch (error) {
      // An evaluator call that itself fails shouldn't block a question that
      // already passed every other check — fail open.
      console.error("Question evaluation call failed; accepting the question unevaluated.", error);
      return { valid: true };
    }
    await this.generationRepo.addTokenUsage(generationId, {
      input: completion.usage.inputTokens,
      output: completion.usage.outputTokens,
    });

    try {
      const parsed = evaluationResponseSchema.parse(JSON.parse(extractJson(completion.content)));
      if (parsed.valid) return { valid: true };
      return { valid: false, reason: parsed.reason ?? "Evaluator judged the question incomplete or incorrect." };
    } catch (error) {
      console.error("Could not parse question evaluation response; accepting the question unevaluated.", error);
      return { valid: true };
    }
  }
}
