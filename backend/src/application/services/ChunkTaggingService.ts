import { inject, injectable } from "tsyringe";
import { z } from "zod";
import { Chunk } from "../../domain/entities/Chunk";
import { TokenUsage } from "../../domain/entities/Book";
import { clampMaxBloom } from "../../domain/constants/bloomCeilings";
import { ILlmProvider } from "../../domain/interfaces/ILlmProvider";
import { ITaggingPromptBuilder } from "../../domain/interfaces/ITaggingPromptBuilder";
import { ChunkTagPatch, IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository";
import { extractJson } from "../shared/extractJson";

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

const chunkTagSchema = z.object({
  id: z.string(),
  type: chunkTypeEnum,
  maxBloom: z.number().int().min(1).max(6),
  keyTerms: z.array(z.string()),
  summary: z.string(),
  cause: z.string().nullable().optional(),
  effect: z.string().nullable().optional(),
  modality: modalityEnum.nullable().optional(),
  confidence: z.number().min(0).max(1),
});

const sectionTagResponseSchema = z.object({ chunks: z.array(chunkTagSchema) });

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
    const { system, user } = this.promptBuilder.build({
      subject: input.subject,
      grade: input.grade,
      chapter: input.chapter,
      sectionPath: input.sectionPath,
      sectionTitle: input.sectionTitle,
      chunks: input.chunks.map((chunk) => ({ id: chunk.id, text: chunk.text })),
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

    for (const chunk of input.chunks) {
      const tag = tagsById?.get(chunk.id) ?? DEFAULT_TAG;
      await this.chunkRepo.applyTag(chunk.id, { ...tag, maxBloom: clampMaxBloom(tag.type, tag.maxBloom) });
    }

    return usage;
  }

  private tryParse(raw: string): Map<string, ChunkTagPatch> | null {
    try {
      const parsed = JSON.parse(extractJson(raw));
      const result = sectionTagResponseSchema.safeParse(parsed);
      if (!result.success) return null;

      const tagsById = new Map<string, ChunkTagPatch>();
      for (const tag of result.data.chunks) {
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
    } catch {
      return null;
    }
  }
}
