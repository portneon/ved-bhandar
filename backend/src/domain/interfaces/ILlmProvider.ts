export interface ILlmProvider {
  complete(systemPrompt: string, userPrompt: string, model: string): Promise<string>;
  stream(systemPrompt: string, userPrompt: string, model: string): AsyncIterable<string>;
}
