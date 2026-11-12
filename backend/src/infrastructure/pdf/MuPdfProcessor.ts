import { injectable } from "tsyringe";
import * as mupdf from "mupdf";
import { IPdfProcessor } from "../../domain/interfaces/IPdfProcessor";

const THUMBNAIL_SCALE = 1.4;

@injectable()
export class MuPdfProcessor implements IPdfProcessor {
  async getPageCount(fileBuffer: Buffer): Promise<number> {
    const doc = mupdf.Document.openDocument(fileBuffer, "application/pdf");
    return doc.countPages();
  }

  async extractPageText(fileBuffer: Buffer, pageNumber: number): Promise<string> {
    const doc = mupdf.Document.openDocument(fileBuffer, "application/pdf");
    const page = doc.loadPage(pageNumber - 1);
    return page.toStructuredText("preserve-whitespace").asText();
  }

  async renderPageThumbnail(fileBuffer: Buffer, pageNumber: number): Promise<Buffer> {
    const doc = mupdf.Document.openDocument(fileBuffer, "application/pdf");
    const page = doc.loadPage(pageNumber - 1);
    const pixmap = page.toPixmap(mupdf.Matrix.scale(THUMBNAIL_SCALE, THUMBNAIL_SCALE), mupdf.ColorSpace.DeviceRGB, false);
    return Buffer.from(pixmap.asPNG());
  }
}
