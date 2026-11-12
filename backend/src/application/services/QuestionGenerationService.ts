import { injectable, inject } from "tsyringe";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Document } from "../../domain/entities/Document";
import { Page } from "../../domain/entities/Page";
import { QuestionSet, GenerationConfig, PageSize } from "../../domain/entities/QuestionSet";
import { Question, QuestionType } from "../../domain/entities/Question";
import { IPageRepository } from "../../domain/interfaces/repositories/IPageRepository";
import { IFileStorage } from "../../domain/interfaces/IFileStorage";
import { IPdfProcessor } from "../../domain/interfaces/IPdfProcessor";
import { IDocumentRepository } from "../../domain/interfaces/repositories/IDocumentRepository";
import { IQuestionSetRepository } from "../../domain/interfaces/repositories/IQuestionSetRepository";
import { IQuestionRepository } from "../../domain/interfaces/repositories/IQuestionRepository";
import { IPromptBuilder, PromptPage } from "../../domain/interfaces/IPromptBuilder";
import { ILlmProvider } from "../../domain/interfaces/ILlmProvider";
import { StreamingQuestionExtractor } from "./StreamingQuestionExtractor";

const questionObjectSchema = z.object({
  type: z.enum(["mcq", "short_answer", "long_answer"]),
  prompt: z.string(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
  marks: z.number().nullable().optional(),
});

const llmQuestionSchema = z.object({
  questions: z.array(questionObjectSchema),
});

export interface GenerateInput {
  documentId: string;
  pageIds: string[];
  title: string;
  config: GenerationConfig;
  pageSize?: PageSize;
}

export interface GenerateResult {
  questionSet: QuestionSet;
  questions: Question[];
}

@injectable()
export class QuestionGenerationService {
  constructor(
    @inject("IDocumentRepository") private readonly documentRepo: IDocumentRepository,
    @inject("IPageRepository") private readonly pageRepo: IPageRepository,
    @inject("IFileStorage") private readonly fileStorage: IFileStorage,
    @inject("IPdfProcessor") private readonly pdfProcessor: IPdfProcessor,
    @inject("IPromptBuilder") private readonly promptBuilder: IPromptBuilder,
    @inject("ILlmProvider") private readonly llmProvider: ILlmProvider,
    @inject("IQuestionSetRepository") private readonly questionSetRepo: IQuestionSetRepository,
    @inject("IQuestionRepository") private readonly questionRepo: IQuestionRepository,
  ) {}

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const { system, user } = await this.buildPrompt(input);
    const raw = await this.llmProvider.complete(system, user, input.config.model);
    const parsed = this.parseResponse(raw);

    const questionSet = new QuestionSet(
      randomUUID(),
      input.documentId,
      input.title,
      "generated",
      input.config,
      input.pageSize ?? "A4",
      new Date(),
    );
    await this.questionSetRepo.create(questionSet, input.pageIds);

    const questions = parsed.questions.map(
      (question, index) =>
        new Question(
          randomUUID(),
          questionSet.id,
          index,
          question.type as QuestionType,
          question.prompt,
          question.options ?? null,
          question.correctAnswer ?? null,
          question.marks ?? null,
        ),
    );
    const saved = await this.questionRepo.createMany(questions);

    return { questionSet, questions: saved };
  }

  async generateStream(
    input: GenerateInput,
    onInit: (questionSet: QuestionSet) => void,
    onQuestion: (question: Question) => void,
  ): Promise<QuestionSet> {
    const { system, user } = await this.buildPrompt(input);

    const questionSet = new QuestionSet(
      randomUUID(),
      input.documentId,
      input.title,
      "draft",
      input.config,
      input.pageSize ?? "A4",
      new Date(),
    );
    await this.questionSetRepo.create(questionSet, input.pageIds);
    onInit(questionSet);

    const extractor = new StreamingQuestionExtractor();
    let orderIndex = 0;

    for await (const delta of this.llmProvider.stream(system, user, input.config.model)) {
      const completedObjects = extractor.push(delta);
      for (const objectText of completedObjects) {
        let parsedObject: unknown;
        try {
          parsedObject = JSON.parse(objectText);
        } catch {
          continue;
        }
        const result = questionObjectSchema.safeParse(parsedObject);
        if (!result.success) continue;

        const question = new Question(
          randomUUID(),
          questionSet.id,
          orderIndex++,
          result.data.type as QuestionType,
          result.data.prompt,
          result.data.options ?? null,
          result.data.correctAnswer ?? null,
          result.data.marks ?? null,
        );
        const saved = await this.questionRepo.create(question);
        onQuestion(saved);
      }
    }

    await this.questionSetRepo.updateStatus(questionSet.id, "generated");
    questionSet.status = "generated";
    return questionSet;
  }

  private async buildPrompt(input: GenerateInput): Promise<{ system: string; user: string }> {
    const document = await this.documentRepo.findById(input.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    const selectedPages = await this.resolveSelectedPages(document, input.pageIds);
    const pagesText = await this.extractPagesText(document, selectedPages);

    return this.promptBuilder.build({ pagesText, config: input.config });
  }

  private async resolveSelectedPages(document: Document, pageIds: string[]): Promise<Page[]> {
    const allPages = await this.pageRepo.findByDocumentId(document.id);
    const selectedPages = allPages.filter((page) => pageIds.includes(page.id)).sort((a, b) => a.pageNumber - b.pageNumber);
    if (selectedPages.length === 0) {
      throw new Error("No valid pages were selected");
    }
    return selectedPages;
  }

  private async extractPagesText(document: Document, pages: Page[]): Promise<PromptPage[]> {
    const pdfBuffer = await this.fileStorage.read(document.storagePath);
    const pagesText: PromptPage[] = [];
    for (const page of pages) {
      if (!page.extractedText) {
        const text = await this.pdfProcessor.extractPageText(pdfBuffer, page.pageNumber);
        await this.pageRepo.updateExtractedText(page.id, text);
        page.extractedText = text;
      }
      pagesText.push({ pageNumber: page.pageNumber, text: page.extractedText });
    }
    return pagesText;
  }

  private parseResponse(raw: string): z.infer<typeof llmQuestionSchema> {
    const jsonText = this.extractJson(raw);
    const result = llmQuestionSchema.safeParse(JSON.parse(jsonText));
    if (!result.success) {
      throw new Error(`LLM response did not match the expected schema: ${result.error.message}`);
    }
    return result.data;
  }

  private extractJson(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) return trimmed;
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("LLM response did not contain a JSON object");
    }
    return match[0];
  }
}
