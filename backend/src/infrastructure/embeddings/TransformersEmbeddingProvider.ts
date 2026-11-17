import { injectable } from "tsyringe";
import { env, pipeline } from "@huggingface/transformers";
import { IEmbeddingProvider } from "../../domain/interfaces/IEmbeddingProvider.js";

// Vercel's filesystem is read-only except /tmp; point the model cache there
// so it doesn't try (and fail) to write to the default ~/.cache location.
if (process.env.VERCEL) {
  env.cacheDir = "/tmp/transformers-cache";
}

const BATCH_SIZE = 32;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeatureExtractor = (texts: string[], options: { pooling: string; normalize: boolean }) => Promise<{ tolist(): any }>;

@injectable()
export class TransformersEmbeddingProvider implements IEmbeddingProvider {
  private extractorPromise: Promise<FeatureExtractor> | null = null;

  private getExtractor(): Promise<FeatureExtractor> {
    // The real union type FeatureExtractionPipeline is too complex for tsc to represent
    // here (TS2590); it's call-compatible with FeatureExtractor, so we narrow to that.
    this.extractorPromise ??= pipeline(
      "feature-extraction",
      process.env.EMBEDDING_MODEL ?? "Xenova/bge-small-en-v1.5",
    ) as unknown as Promise<FeatureExtractor>;
    return this.extractorPromise;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extractor = await this.getExtractor();
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const tensor = await extractor(batch, { pooling: "mean", normalize: true });
      out.push(...(tensor.tolist() as number[][]));
    }
    return out;
  }
}
