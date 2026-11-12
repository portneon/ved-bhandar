import { injectable } from "tsyringe";
import OpenAI from "openai";
import { ILlmProvider } from "../../domain/interfaces/ILlmProvider";

@injectable()
export class OpenRouterProvider implements ILlmProvider {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not set. Add it to backend/.env to enable question generation.");
      }
      this.client = new OpenAI({
        apiKey,
        baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      });
    }
    return this.client;
  }

  async complete(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const response = await this.getClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned an empty response");
    }
    return content;
  }

  async *stream(systemPrompt: string, userPrompt: string, model: string): AsyncIterable<string> {
    const completion = await this.getClient().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
