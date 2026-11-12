export interface PdfLine {
  page: number;
  text: string;
  fontSize: number;
}

export interface IPdfProcessor {
  getPageCount(buffer: Buffer): Promise<number>;
  extractStructuredPage(buffer: Buffer, pageNumber: number): Promise<PdfLine[]>;
}
