import { Page } from "../../entities/Page";

export interface IPageRepository {
  createMany(pages: Page[]): Promise<Page[]>;
  findByDocumentId(documentId: string): Promise<Page[]>;
  findByIds(ids: string[]): Promise<Page[]>;
  updateThumbnailPath(id: string, thumbnailPath: string): Promise<void>;
  updateExtractedText(id: string, text: string): Promise<void>;
}
