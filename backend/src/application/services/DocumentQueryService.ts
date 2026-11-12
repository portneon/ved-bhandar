import { injectable, inject } from "tsyringe";
import { Document } from "../../domain/entities/Document";
import { Page } from "../../domain/entities/Page";
import { IDocumentRepository } from "../../domain/interfaces/repositories/IDocumentRepository";
import { IPageRepository } from "../../domain/interfaces/repositories/IPageRepository";

@injectable()
export class DocumentQueryService {
  constructor(
    @inject("IDocumentRepository") private readonly documentRepo: IDocumentRepository,
    @inject("IPageRepository") private readonly pageRepo: IPageRepository,
  ) {}

  listDocuments(): Promise<Document[]> {
    return this.documentRepo.findAll();
  }

  getDocument(id: string): Promise<Document | null> {
    return this.documentRepo.findById(id);
  }

  getPages(documentId: string): Promise<Page[]> {
    return this.pageRepo.findByDocumentId(documentId);
  }
}
