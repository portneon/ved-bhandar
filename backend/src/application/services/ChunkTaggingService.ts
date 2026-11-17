import { inject, injectable } from "tsyringe";
import { z } from "zod";
import { Chunk } from "../../domain/entities/Chunk.js";
import { TokenUsage } from "../../domain/entities/Book.js";
import { clampMaxBloom } from "../../domain/constants/bloomCeilings.js";
import { ILlmProvider } from "../../domain/interfaces/ILlmProvider.js";
import { ITaggingPromptBuilder } from "../../domain/interfaces/ITaggingPromptBuilder.js";
import { ChunkTagPatch, IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository.js";
import { extractJson } from "../shared/extractJson.js";

const chunkTypeEnum = z.enum([
  "definition",
  "fact",
  "process",
  "comparison",
  "cause_effect",
  "classification",
  "example",
  "formula",
  "other",
]);
const modalityEnum = z.enum(["always", "usually", "can"]);

const lowercased = z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), chunkTypeEnum);
const lowercasedModality = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  modalityEnum.nullable().optional(),
);

// Lenient on purpose: LLM output commonly has minor shape drift (stringified
// numbers, out-of-range confidence, a missing optional field). Reject only
// what we truly can't use (id/type); coerce or default everything else so
// one malformed field doesn't throw away an otherwise-good tag.
const chunkTagSchema = z.object({
  id: z.string(),
  type: lowercased,
  maxBloom: z.coerce.number().int().min(1).max(6).catch(1),
  keyTerms: z.array(z.string()).catch([]),
  summary: z.string().catch(""),
  cause: z.string().nullable().optional().catch(null),
  effect: z.string().nullable().optional().catch(null),
  modality: lowercasedModality.catch(null),
  confidence: z.coerce
    .number()
    .catch(0)
    .transform((v) => Math.min(1, Math.max(0, v))),
});

const DEFAULT_TAG: ChunkTagPatch = {
  type: "other",
  maxBloom: 1,
  keyTerms: [],
  summary: "",
  confidence: 0,
  cause: null,
  effect: null,
  modality: null,
};

/**
 * Caps how many chunks go into one tagging call. A section with far more
 * chunks than this (heading detection can under-split a real textbook)
 * risks the model's JSON response hitting max_tokens mid-structure, which
 * silently wipes out every chunk's tag in that call — bounding batch size
 * keeps each response short enough to reliably finish.
 */
const MAX_CHUNKS_PER_CALL = 12;

export interface TagSectionInput {
  subject: string;
  grade: string;
  chapter: number;
  sectionPath: string;
  sectionTitle: string;
  chunks: Chunk[];
}

@injectable()
export class ChunkTaggingService {
  constructor(
    @inject("ITaggingPromptBuilder") private readonly promptBuilder: ITaggingPromptBuilder,
    @inject("ILlmProvider") private readonly llmProvider: ILlmProvider,
    @inject("IChunkRepository") private readonly chunkRepo: IChunkRepository,
  ) {}

  async tagSection(input: TagSectionInput): Promise<TokenUsage> {
    const usage: TokenUsage = { input: 0, output: 0 };

    for (let i = 0; i < input.chunks.length; i += MAX_CHUNKS_PER_CALL) {
      const batch = input.chunks.slice(i, i + MAX_CHUNKS_PER_CALL);
      const batchUsage = await this.tagBatch(input, batch);
      usage.input += batchUsage.input;
      usage.output += batchUsage.output;
    }

    return usage;
  }

  private async tagBatch(input: TagSectionInput, chunks: Chunk[]): Promise<TokenUsage> {
    const { system, user } = this.promptBuilder.build({
      subject: input.subject,
      grade: input.grade,
      chapter: input.chapter,
      sectionPath: input.sectionPath,
      sectionTitle: input.sectionTitle,
      chunks: chunks.map((chunk) => ({ id: chunk.id, text: chunk.text })),
    });

    const model = process.env.TAGGING_MODEL ?? "openai/gpt-4o-mini";
    const usage: TokenUsage = { input: 0, output: 0 };
    let tagsById: Map<string, ChunkTagPatch> | null = null;

    for (let attempt = 0; attempt < 2 && tagsById === null; attempt++) {
      const completion = await this.llmProvider.complete(system, user, model);
      usage.input += completion.usage.inputTokens;
      usage.output += completion.usage.outputTokens;
      tagsById = this.tryParse(completion.content);
    }

    for (const chunk of chunks) {
      const tag = tagsById?.get(chunk.id) ?? DEFAULT_TAG;
      await this.chunkRepo.applyTag(chunk.id, { ...tag, maxBloom: clampMaxBloom(tag.type, tag.maxBloom) });
    }

    return usage;
  }

  /**
   * Validates each chunk tag independently so one malformed item doesn't
   * discard the rest of an otherwise-good response. Returns null only when
   * the response isn't usable at all (bad JSON, or no "chunks" array) —
   * that's the condition that triggers a retry.
   */
  private tryParse(raw: string): Map<string, ChunkTagPatch> | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch {
      return null;
    }

    const shape = z.object({ chunks: z.array(z.unknown()) }).safeParse(parsed);
    if (!shape.success) return null;

    const tagsById = new Map<string, ChunkTagPatch>();
    for (const item of shape.data.chunks) {
      const result = chunkTagSchema.safeParse(item);
      if (!result.success) continue;
      const tag = result.data;
      tagsById.set(tag.id, {
        type: tag.type,
        maxBloom: tag.maxBloom,
        keyTerms: tag.keyTerms,
        summary: tag.summary,
        confidence: tag.confidence,
        cause: tag.cause ?? null,
        effect: tag.effect ?? null,
        modality: tag.modality ?? null,
      });
    }
    return tagsById;
  }
}
