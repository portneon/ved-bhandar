import { injectable, inject } from "tsyringe";
import { DataSource, Repository, In } from "typeorm";
import { IPageRepository } from "../../../domain/interfaces/repositories/IPageRepository";
import { Page } from "../../../domain/entities/Page";
import { PageOrmEntity } from "../entities/PageOrmEntity";

@injectable()
export class TypeOrmPageRepository implements IPageRepository {
  private readonly repo: Repository<PageOrmEntity>;

  constructor(@inject("DataSource") dataSource: DataSource) {
    this.repo = dataSource.getRepository(PageOrmEntity);
  }

  async createMany(pages: Page[]): Promise<Page[]> {
    const rows = pages.map((page) =>
      this.repo.create({
        id: page.id,
        documentId: page.documentId,
        pageNumber: page.pageNumber,
        thumbnailPath: page.thumbnailPath,
        extractedText: page.extractedText,
      }),
    );
    const saved = await this.repo.save(rows);
    return saved.map((row) => this.toDomain(row));
  }

  async findByDocumentId(documentId: string): Promise<Page[]> {
    const rows = await this.repo.find({ where: { documentId }, order: { pageNumber: "ASC" } });
    return rows.map((row) => this.toDomain(row));
  }

  async findByIds(ids: string[]): Promise<Page[]> {
    if (ids.length === 0) return [];
    const rows = await this.repo.find({ where: { id: In(ids) } });
    return rows.map((row) => this.toDomain(row));
  }

  async updateThumbnailPath(id: string, thumbnailPath: string): Promise<void> {
    await this.repo.update({ id }, { thumbnailPath });
  }

  async updateExtractedText(id: string, text: string): Promise<void> {
    await this.repo.update({ id }, { extractedText: text });
  }

  private toDomain(row: PageOrmEntity): Page {
    return new Page(row.id, row.documentId, row.pageNumber, row.thumbnailPath, row.extractedText);
  }
}
