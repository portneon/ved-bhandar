export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function isValidMcq(options: string[] | null, answer: string | null): boolean {
  if (!options || options.length !== 4 || !answer) return false;
  const distinct = new Set(options.map((option) => option.trim().toLowerCase()));
  if (distinct.size !== 4) return false;
  return options.some((option) => option.trim() === answer.trim());
}

export function chunkIdsAreSubset(chunkIds: string[], sentChunkIds: string[]): boolean {
  if (chunkIds.length === 0) return false;
  const sentSet = new Set(sentChunkIds);
  return chunkIds.every((id) => sentSet.has(id));
}

const DUPLICATE_STEM_THRESHOLD = 0.9;

export function isDuplicateStem(candidateEmbedding: number[], existingEmbeddings: number[][]): boolean {
  return existingEmbeddings.some((existing) => cosineSimilarity(candidateEmbedding, existing) >= DUPLICATE_STEM_THRESHOLD);
}
