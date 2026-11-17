import { inject, injectable } from "tsyringe";
import { HttpError } from "../../api/HttpError.js";
import { IGenerationExporter } from "../../domain/interfaces/IGenerationExporter.js";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository.js";
import { IGenerationRepository } from "../../domain/interfaces/repositories/IGenerationRepository.js";
import { IQuestionPaperTemplateRepository } from "../../domain/interfaces/repositories/IQuestionPaperTemplateRepository.js";
import { TemplatedPdfExporter } from "../../infrastructure/export/TemplatedPdfExporter.js";
import { DocxTemplateExporter } from "../../infrastructure/export/DocxTemplateExporter.js";

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

@injectable()
export class GenerationExportService {
  constructor(
    @inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository,
    @inject("IBookRepository") private readonly bookRepo: IBookRepository,
    @inject("IGenerationExporter") private readonly exporter: IGenerationExporter,
    @inject("IQuestionPaperTemplateRepository") private readonly templateRepo: IQuestionPaperTemplateRepository,
    @inject(TemplatedPdfExporter) private readonly templatedPdfExporter: TemplatedPdfExporter,
    @inject(DocxTemplateExporter) private readonly docxTemplateExporter: DocxTemplateExporter,
  ) {}

  async export(generationId: string, userId: string): Promise<ExportResult | null> {
    const generation = await this.generationRepo.findById(generationId, userId);
    if (!generation) return null;
    const book = await this.bookRepo.findById(generation.bookId, userId);
    if (!book) return null;

    const buffer = await this.exporter.export(generation, book);
    return {
      buffer,
      contentType: this.exporter.contentType,
      filename: `${this.sanitizeFilename(book.title)}.${this.exporter.fileExtension}`,
    };
  }

  async exportWithTemplate(generationId: string, templateId: string, userId: string): Promise<ExportResult | null> {
    const generation = await this.generationRepo.findById(generationId, userId);
    if (!generation) return null;
    const book = await this.bookRepo.findById(generation.bookId, userId);
    if (!book) return null;
    const template = await this.templateRepo.findById(templateId, userId);
    if (!template) throw HttpError.notFound("Template not found");

    if (template.kind === "docx") {
      const buffer = await this.docxTemplateExporter.export(generation, book, template);
      return { buffer, contentType: this.docxTemplateExporter.contentType, filename: `${this.sanitizeFilename(book.title)}.docx` };
    }

    const buffer = await this.templatedPdfExporter.export(generation, book, template);
    return { buffer, contentType: this.templatedPdfExporter.contentType, filename: `${this.sanitizeFilename(book.title)}.pdf` };
  }

  /**
   * Content-Disposition header values must be Latin-1/ASCII — titles can contain
   * arbitrary Unicode typed by the user, which would otherwise make res.setHeader
   * throw and crash the request.
   */
  private sanitizeFilename(title: string): string {
    const cleaned = title
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/["\\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.length > 0 ? cleaned : "questions";
  }
}
