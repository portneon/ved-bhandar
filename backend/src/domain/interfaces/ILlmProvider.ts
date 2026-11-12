export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmCompletion {
  content: string;
  usage: LlmUsage;
}

export interface ILlmProvider {
  complete(systemPrompt: string, userPrompt: string, model: string): Promise<LlmCompletion>;
  stream(systemPrompt: string, userPrompt: string, model: string): AsyncIterable<string>;
}
