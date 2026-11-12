import { injectable } from "tsyringe";
import * as mupdf from "mupdf";
import { IPdfProcessor, PdfLine } from "../../domain/interfaces/IPdfProcessor";

@injectable()
export class MuPdfProcessor implements IPdfProcessor {
  async getPageCount(buffer: Buffer): Promise<number> {
    const doc = mupdf.Document.openDocument(buffer, "application/pdf");
    return doc.countPages();
  }

  async extractStructuredPage(buffer: Buffer, pageNumber: number): Promise<PdfLine[]> {
    const doc = mupdf.Document.openDocument(buffer, "application/pdf");
    const page = doc.loadPage(pageNumber - 1) as mupdf.Page;
    const structuredText = page.toStructuredText({});

    const lines: PdfLine[] = [];
    let chars: string[] = [];
    let sizes: number[] = [];

    const flushLine = (): void => {
      const text = chars.join("").trim();
      if (text.length > 0) {
        const fontSize = sizes.length > 0 ? Math.max(...sizes) : 0;
        lines.push({ page: pageNumber, text, fontSize });
      }
      chars = [];
      sizes = [];
    };

    structuredText.walk({
      onChar: (c, _origin, _font, size) => {
        chars.push(c);
        sizes.push(size);
      },
      endLine: () => flushLine(),
    });
    flushLine();

    return lines;
  }
}
