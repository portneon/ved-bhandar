import { injectable } from "tsyringe";
import OpenAI from "openai";
import { ILlmProvider, LlmCompletion } from "../../domain/interfaces/ILlmProvider.js";

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

  async complete(systemPrompt: string, userPrompt: string, model: string): Promise<LlmCompletion> {
    const response = await this.getClient().chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned an empty response");
    }
    if (response.choices[0]?.finish_reason === "length") {
      // Don't throw: callers already treat malformed/incomplete JSON as a
      // parse failure and retry or fall back gracefully on their own.
      console.warn("LLM response hit max_tokens and was truncated; downstream parsing will likely fail and retry.");
    }
    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async *stream(systemPrompt: string, userPrompt: string, model: string): AsyncIterable<string> {
    const completion = await this.getClient().chat.completions.create({
      model,
      max_tokens: 4096,
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
