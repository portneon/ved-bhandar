import { Document, DocumentStatus } from "../../entities/Document";

export interface IDocumentRepository {
  create(document: Document): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  updateStatus(id: string, status: DocumentStatus): Promise<void>;
  updatePageCount(id: string, pageCount: number): Promise<void>;
}
