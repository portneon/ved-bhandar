import { injectable, inject } from "tsyringe";
import { DataSource, Repository } from "typeorm";
import { IDocumentRepository } from "../../../domain/interfaces/repositories/IDocumentRepository";
import { Document, DocumentStatus } from "../../../domain/entities/Document";
import { DocumentOrmEntity } from "../entities/DocumentOrmEntity";

@injectable()
export class TypeOrmDocumentRepository implements IDocumentRepository {
  private readonly repo: Repository<DocumentOrmEntity>;

  constructor(@inject("DataSource") dataSource: DataSource) {
    this.repo = dataSource.getRepository(DocumentOrmEntity);
  }

  async create(document: Document): Promise<Document> {
    const row = this.repo.create({
      id: document.id,
      title: document.title,
      originalFilename: document.originalFilename,
      storagePath: document.storagePath,
      pageCount: document.pageCount,
      status: document.status,
    });
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Document | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Document[]> {
    const rows = await this.repo.find({ order: { createdAt: "DESC" } });
    return rows.map((row) => this.toDomain(row));
  }

  async updateStatus(id: string, status: DocumentStatus): Promise<void> {
    await this.repo.update({ id }, { status });
  }

  async updatePageCount(id: string, pageCount: number): Promise<void> {
    await this.repo.update({ id }, { pageCount });
  }

  private toDomain(row: DocumentOrmEntity): Document {
    return new Document(row.id, row.title, row.originalFilename, row.storagePath, row.pageCount, row.status, row.createdAt);
  }
}
