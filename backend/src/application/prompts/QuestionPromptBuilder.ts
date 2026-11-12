import { injectable } from "tsyringe";
import { IPromptBuilder, PromptInput, BuiltPrompt } from "../../domain/interfaces/IPromptBuilder";

@injectable()
export class QuestionPromptBuilder implements IPromptBuilder {
  build({ pagesText, config }: PromptInput): BuiltPrompt {
    const totalQuestions = Object.values(config.distribution).reduce((sum, count) => sum + count, 0);
    const distributionLines = Object.entries(config.distribution)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `- ${count} question(s) of type "${type}"`)
      .join("\n");

    const system = [
      "You are an exam question generator.",
      "Generate questions strictly from the supplied source text. Do not invent facts that aren't in it.",
      'Respond with ONLY a JSON object of this exact shape, no prose, no markdown fences:',
      '{ "questions": [ { "type": "mcq" | "short_answer" | "long_answer", "prompt": string, "options": string[] | null, "correctAnswer": string | null, "marks": number } ] }',
      'For "mcq": provide exactly 4 "options" and a "correctAnswer" matching one of them.',
      'For "short_answer": set "options" to null and give a brief "correctAnswer".',
      'For "long_answer": set "options" to null and give a model-answer outline as "correctAnswer".',
      `Generate exactly ${totalQuestions} questions total, distributed as:\n${distributionLines}`,
      `Difficulty: ${config.difficulty}. Language: ${config.language}.`,
      config.customInstructions ? `Additional instructions: ${config.customInstructions}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const user = pagesText.map((page) => `--- Page ${page.pageNumber} ---\n${page.text}`).join("\n\n");

    return { system, user };
  }
}
