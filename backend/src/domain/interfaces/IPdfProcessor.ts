export interface IPdfProcessor {
  getPageCount(fileBuffer: Buffer): Promise<number>;
  extractPageText(fileBuffer: Buffer, pageNumber: number): Promise<string>;
  renderPageThumbnail(fileBuffer: Buffer, pageNumber: number): Promise<Buffer>;
}
