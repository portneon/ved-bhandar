import { injectable, inject } from "tsyringe";
import { IDocumentExporter } from "../../domain/interfaces/IDocumentExporter";
import { IQuestionSetRepository } from "../../domain/interfaces/repositories/IQuestionSetRepository";
import { IQuestionRepository } from "../../domain/interfaces/repositories/IQuestionRepository";

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

@injectable()
export class ExportService {
  constructor(
    @inject("IQuestionSetRepository") private readonly questionSetRepo: IQuestionSetRepository,
    @inject("IQuestionRepository") private readonly questionRepo: IQuestionRepository,
    @inject("IDocumentExporter") private readonly exporter: IDocumentExporter,
  ) {}

  async export(questionSetId: string): Promise<ExportResult | null> {
    const questionSet = await this.questionSetRepo.findById(questionSetId);
    if (!questionSet) return null;
    const questions = await this.questionRepo.findByQuestionSetId(questionSetId);
    const buffer = await this.exporter.export(questionSet, questions);
    return {
      buffer,
      contentType: this.exporter.contentType,
      filename: `${this.sanitizeFilename(questionSet.title)}.${this.exporter.fileExtension}`,
    };
  }

  /**
   * Content-Disposition header values must be Latin-1/ASCII — titles can contain
   * arbitrary Unicode (em dashes, emoji, accents) typed by the user or produced by
   * the LLM, which would otherwise make res.setHeader throw and crash the request.
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
