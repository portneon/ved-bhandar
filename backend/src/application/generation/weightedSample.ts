export interface WeightedItem<T> {
  item: T;
  weight: number;
}

/** Weighted-random pick of k items without replacement; keeps retrieval relevant but non-identical across runs. */
export function weightedSample<T>(items: WeightedItem<T>[], k: number): T[] {
  const pool = [...items];
  const picked: T[] = [];

  for (let i = 0; i < k && pool.length > 0; i++) {
    const weights = pool.map((entry) => Math.max(entry.weight, 0.0001));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let r = Math.random() * totalWeight;
    let index = 0;
    for (; index < pool.length - 1; index++) {
      r -= weights[index];
      if (r <= 0) break;
    }
    picked.push(pool[index].item);
    pool.splice(index, 1);
  }

  return picked;
}
