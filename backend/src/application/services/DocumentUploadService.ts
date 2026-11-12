import { injectable, inject } from "tsyringe";
import { randomUUID } from "crypto";
import { Document } from "../../domain/entities/Document";
import { Page } from "../../domain/entities/Page";
import { IFileStorage } from "../../domain/interfaces/IFileStorage";
import { IPdfProcessor } from "../../domain/interfaces/IPdfProcessor";
import { IDocumentRepository } from "../../domain/interfaces/repositories/IDocumentRepository";
import { IPageRepository } from "../../domain/interfaces/repositories/IPageRepository";

export interface UploadInput {
  originalFilename: string;
  title: string;
  buffer: Buffer;
}

@injectable()
export class DocumentUploadService {
  constructor(
    @inject("IFileStorage") private readonly fileStorage: IFileStorage,
    @inject("IPdfProcessor") private readonly pdfProcessor: IPdfProcessor,
    @inject("IDocumentRepository") private readonly documentRepo: IDocumentRepository,
    @inject("IPageRepository") private readonly pageRepo: IPageRepository,
  ) {}

  async upload(input: UploadInput): Promise<Document> {
    const documentId = randomUUID();
    const storageKey = `${documentId}/original.pdf`;
    await this.fileStorage.save(storageKey, input.buffer);

    const document = new Document(documentId, input.title, input.originalFilename, storageKey, 0, "processing", new Date());
    await this.documentRepo.create(document);

    this.processInBackground(documentId, input.buffer).catch((error) => {
      console.error(`Processing failed for document ${documentId}`, error);
      void this.documentRepo.updateStatus(documentId, "failed");
    });

    return document;
  }

  private async processInBackground(documentId: string, buffer: Buffer): Promise<void> {
    const pageCount = await this.pdfProcessor.getPageCount(buffer);
    await this.documentRepo.updatePageCount(documentId, pageCount);

    const pages = Array.from({ length: pageCount }, (_, index) => new Page(randomUUID(), documentId, index + 1, null, null));
    await this.pageRepo.createMany(pages);

    for (const page of pages) {
      const thumbnail = await this.pdfProcessor.renderPageThumbnail(buffer, page.pageNumber);
      const thumbnailKey = `${documentId}/thumbnails/page-${page.pageNumber}.png`;
      await this.fileStorage.save(thumbnailKey, thumbnail);
      await this.pageRepo.updateThumbnailPath(page.id, thumbnailKey);
    }

    await this.documentRepo.updateStatus(documentId, "ready");
  }
}
