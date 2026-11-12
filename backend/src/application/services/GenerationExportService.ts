import { inject, injectable } from "tsyringe";
import { IGenerationExporter } from "../../domain/interfaces/IGenerationExporter";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository";
import { IGenerationRepository } from "../../domain/interfaces/repositories/IGenerationRepository";

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
  ) {}

  async export(generationId: string): Promise<ExportResult | null> {
    const generation = await this.generationRepo.findById(generationId);
    if (!generation) return null;
    const book = await this.bookRepo.findById(generation.bookId);
    if (!book) return null;

    const buffer = await this.exporter.export(generation, book);
    return {
      buffer,
      contentType: this.exporter.contentType,
      filename: `${this.sanitizeFilename(book.title)}.${this.exporter.fileExtension}`,
    };
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
