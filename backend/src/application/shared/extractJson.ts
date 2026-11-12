export function extractJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("LLM response did not contain a JSON object");
  }
  return match[0];
}
