import "reflect-metadata";
import { container } from "tsyringe";
import { Db } from "mongodb";
import { IFileStorage } from "./domain/interfaces/IFileStorage";
import { LocalFileStorage } from "./infrastructure/storage/LocalFileStorage";
import { IPdfProcessor } from "./domain/interfaces/IPdfProcessor";
import { MuPdfProcessor } from "./infrastructure/pdf/MuPdfProcessor";
import { ILlmProvider } from "./domain/interfaces/ILlmProvider";
import { OpenRouterProvider } from "./infrastructure/llm/OpenRouterProvider";
import { IEmbeddingProvider } from "./domain/interfaces/IEmbeddingProvider";
import { TransformersEmbeddingProvider } from "./infrastructure/embeddings/TransformersEmbeddingProvider";
import { ITaggingPromptBuilder } from "./domain/interfaces/ITaggingPromptBuilder";
import { TaggingPromptBuilder } from "./application/prompts/TaggingPromptBuilder";
import { IGenerationPromptBuilder } from "./domain/interfaces/IGenerationPromptBuilder";
import { GenerationPromptBuilder } from "./application/prompts/GenerationPromptBuilder";
import { ITopicPlanningPromptBuilder } from "./domain/interfaces/ITopicPlanningPromptBuilder";
import { TopicPlanningPromptBuilder } from "./application/prompts/TopicPlanningPromptBuilder";
import { IGenerationExporter } from "./domain/interfaces/IGenerationExporter";
import { GenerationPdfExporter } from "./infrastructure/export/GenerationPdfExporter";
import { IBookRepository } from "./domain/interfaces/repositories/IBookRepository";
import { MongoBookRepository } from "./infrastructure/persistence/mongo/MongoBookRepository";
import { IChunkRepository } from "./domain/interfaces/repositories/IChunkRepository";
import { MongoChunkRepository } from "./infrastructure/persistence/mongo/MongoChunkRepository";
import { IGenerationRepository } from "./domain/interfaces/repositories/IGenerationRepository";
import { MongoGenerationRepository } from "./infrastructure/persistence/mongo/MongoGenerationRepository";
import { IQuestionBankRepository } from "./domain/interfaces/repositories/IQuestionBankRepository";
import { MongoQuestionBankRepository } from "./infrastructure/persistence/mongo/MongoQuestionBankRepository";
import { IUserRepository } from "./domain/interfaces/repositories/IUserRepository";
import { MongoUserRepository } from "./infrastructure/persistence/mongo/MongoUserRepository";
import { IQuestionPaperTemplateRepository } from "./domain/interfaces/repositories/IQuestionPaperTemplateRepository";
import { MongoQuestionPaperTemplateRepository } from "./infrastructure/persistence/mongo/MongoQuestionPaperTemplateRepository";

export function registerContainer(db: Db): void {
  container.registerInstance<Db>("Db", db);
  container.register<IBookRepository>("IBookRepository", { useClass: MongoBookRepository });
  container.register<IChunkRepository>("IChunkRepository", { useClass: MongoChunkRepository });
  container.register<IGenerationRepository>("IGenerationRepository", { useClass: MongoGenerationRepository });
  container.register<IQuestionBankRepository>("IQuestionBankRepository", { useClass: MongoQuestionBankRepository });
  container.register<IUserRepository>("IUserRepository", { useClass: MongoUserRepository });
  container.register<IQuestionPaperTemplateRepository>("IQuestionPaperTemplateRepository", {
    useClass: MongoQuestionPaperTemplateRepository,
  });
  container.register<IFileStorage>("IFileStorage", { useClass: LocalFileStorage });
  container.register<IPdfProcessor>("IPdfProcessor", { useClass: MuPdfProcessor });
  container.register<ILlmProvider>("ILlmProvider", { useClass: OpenRouterProvider });
  container.registerSingleton<IEmbeddingProvider>("IEmbeddingProvider", TransformersEmbeddingProvider);
  container.register<ITaggingPromptBuilder>("ITaggingPromptBuilder", { useClass: TaggingPromptBuilder });
  container.register<IGenerationPromptBuilder>("IGenerationPromptBuilder", { useClass: GenerationPromptBuilder });
  container.register<ITopicPlanningPromptBuilder>("ITopicPlanningPromptBuilder", { useClass: TopicPlanningPromptBuilder });
  container.register<IGenerationExporter>("IGenerationExporter", { useClass: GenerationPdfExporter });
}
