import "reflect-metadata";
import { container } from "tsyringe";
import { DataSource } from "typeorm";
import { DocumentOrmEntity } from "./infrastructure/persistence/entities/DocumentOrmEntity";
import { PageOrmEntity } from "./infrastructure/persistence/entities/PageOrmEntity";
import { QuestionSetOrmEntity } from "./infrastructure/persistence/entities/QuestionSetOrmEntity";
import { QuestionOrmEntity } from "./infrastructure/persistence/entities/QuestionOrmEntity";
import { IDocumentRepository } from "./domain/interfaces/repositories/IDocumentRepository";
import { IPageRepository } from "./domain/interfaces/repositories/IPageRepository";
import { IQuestionSetRepository } from "./domain/interfaces/repositories/IQuestionSetRepository";
import { IQuestionRepository } from "./domain/interfaces/repositories/IQuestionRepository";
import { TypeOrmDocumentRepository } from "./infrastructure/persistence/repositories/TypeOrmDocumentRepository";
import { TypeOrmPageRepository } from "./infrastructure/persistence/repositories/TypeOrmPageRepository";
import { TypeOrmQuestionSetRepository } from "./infrastructure/persistence/repositories/TypeOrmQuestionSetRepository";
import { TypeOrmQuestionRepository } from "./infrastructure/persistence/repositories/TypeOrmQuestionRepository";
import { IFileStorage } from "./domain/interfaces/IFileStorage";
import { LocalFileStorage } from "./infrastructure/storage/LocalFileStorage";
import { IPdfProcessor } from "./domain/interfaces/IPdfProcessor";
import { MuPdfProcessor } from "./infrastructure/pdf/MuPdfProcessor";
import { ILlmProvider } from "./domain/interfaces/ILlmProvider";
import { OpenRouterProvider } from "./infrastructure/llm/OpenRouterProvider";
import { IPromptBuilder } from "./domain/interfaces/IPromptBuilder";
import { QuestionPromptBuilder } from "./application/prompts/QuestionPromptBuilder";
import { IDocumentExporter } from "./domain/interfaces/IDocumentExporter";
import { PdfExporter } from "./infrastructure/export/PdfExporter";

export const dataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [DocumentOrmEntity, PageOrmEntity, QuestionSetOrmEntity, QuestionOrmEntity],
  synchronize: true,
  logging: false,
});

export function registerContainer(): void {
  container.registerInstance<DataSource>("DataSource", dataSource);
  container.register<IDocumentRepository>("IDocumentRepository", { useClass: TypeOrmDocumentRepository });
  container.register<IPageRepository>("IPageRepository", { useClass: TypeOrmPageRepository });
  container.register<IQuestionSetRepository>("IQuestionSetRepository", { useClass: TypeOrmQuestionSetRepository });
  container.register<IQuestionRepository>("IQuestionRepository", { useClass: TypeOrmQuestionRepository });
  container.register<IFileStorage>("IFileStorage", { useClass: LocalFileStorage });
  container.register<IPdfProcessor>("IPdfProcessor", { useClass: MuPdfProcessor });
  container.register<ILlmProvider>("ILlmProvider", { useClass: OpenRouterProvider });
  container.register<IPromptBuilder>("IPromptBuilder", { useClass: QuestionPromptBuilder });
  container.register<IDocumentExporter>("IDocumentExporter", { useClass: PdfExporter });
}
