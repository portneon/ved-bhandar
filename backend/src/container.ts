import "reflect-metadata";
import { container } from "tsyringe";
import { Db } from "mongodb";
import { IFileStorage } from "./domain/interfaces/IFileStorage.js";
import { MongoFileStorage } from "./infrastructure/storage/MongoFileStorage.js";
import { IPdfProcessor } from "./domain/interfaces/IPdfProcessor.js";
import { MuPdfProcessor } from "./infrastructure/pdf/MuPdfProcessor.js";
import { ILlmProvider } from "./domain/interfaces/ILlmProvider.js";
import { OpenRouterProvider } from "./infrastructure/llm/OpenRouterProvider.js";
import { IEmbeddingProvider } from "./domain/interfaces/IEmbeddingProvider.js";
import { TransformersEmbeddingProvider } from "./infrastructure/embeddings/TransformersEmbeddingProvider.js";
import { ITaggingPromptBuilder } from "./domain/interfaces/ITaggingPromptBuilder.js";
import { TaggingPromptBuilder } from "./application/prompts/TaggingPromptBuilder.js";
import { IGenerationPromptBuilder } from "./domain/interfaces/IGenerationPromptBuilder.js";
import { GenerationPromptBuilder } from "./application/prompts/GenerationPromptBuilder.js";
import { ITopicPlanningPromptBuilder } from "./domain/interfaces/ITopicPlanningPromptBuilder.js";
import { TopicPlanningPromptBuilder } from "./application/prompts/TopicPlanningPromptBuilder.js";
import { IGenerationExporter } from "./domain/interfaces/IGenerationExporter.js";
import { GenerationPdfExporter } from "./infrastructure/export/GenerationPdfExporter.js";
import { IBookRepository } from "./domain/interfaces/repositories/IBookRepository.js";
import { MongoBookRepository } from "./infrastructure/persistence/mongo/MongoBookRepository.js";
import { IChunkRepository } from "./domain/interfaces/repositories/IChunkRepository.js";
import { MongoChunkRepository } from "./infrastructure/persistence/mongo/MongoChunkRepository.js";
import { IGenerationRepository } from "./domain/interfaces/repositories/IGenerationRepository.js";
import { MongoGenerationRepository } from "./infrastructure/persistence/mongo/MongoGenerationRepository.js";
import { IQuestionBankRepository } from "./domain/interfaces/repositories/IQuestionBankRepository.js";
import { MongoQuestionBankRepository } from "./infrastructure/persistence/mongo/MongoQuestionBankRepository.js";
import { IQuestionPaperTemplateRepository } from "./domain/interfaces/repositories/IQuestionPaperTemplateRepository.js";
import { MongoQuestionPaperTemplateRepository } from "./infrastructure/persistence/mongo/MongoQuestionPaperTemplateRepository.js";

export function registerContainer(db: Db): void {
  container.registerInstance<Db>("Db", db);
  container.register<IBookRepository>("IBookRepository", { useClass: MongoBookRepository });
  container.register<IChunkRepository>("IChunkRepository", { useClass: MongoChunkRepository });
  container.register<IGenerationRepository>("IGenerationRepository", { useClass: MongoGenerationRepository });
  container.register<IQuestionBankRepository>("IQuestionBankRepository", { useClass: MongoQuestionBankRepository });
  container.register<IQuestionPaperTemplateRepository>("IQuestionPaperTemplateRepository", {
    useClass: MongoQuestionPaperTemplateRepository,
  });
  container.register<IFileStorage>("IFileStorage", { useClass: MongoFileStorage });
  container.register<IPdfProcessor>("IPdfProcessor", { useClass: MuPdfProcessor });
  container.register<ILlmProvider>("ILlmProvider", { useClass: OpenRouterProvider });
  container.registerSingleton<IEmbeddingProvider>("IEmbeddingProvider", TransformersEmbeddingProvider);
  container.register<ITaggingPromptBuilder>("ITaggingPromptBuilder", { useClass: TaggingPromptBuilder });
  container.register<IGenerationPromptBuilder>("IGenerationPromptBuilder", { useClass: GenerationPromptBuilder });
  container.register<ITopicPlanningPromptBuilder>("ITopicPlanningPromptBuilder", { useClass: TopicPlanningPromptBuilder });
  container.register<IGenerationExporter>("IGenerationExporter", { useClass: GenerationPdfExporter });
}
