import { injectable } from "tsyringe";
import pdfMake from "pdfmake";
import type { Content } from "pdfmake";
import { IDocumentExporter } from "../../domain/interfaces/IDocumentExporter";
import { QuestionSet } from "../../domain/entities/QuestionSet";
import { Question } from "../../domain/entities/Question";

pdfMake.setFonts({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
});

@injectable()
export class PdfExporter implements IDocumentExporter {
  readonly contentType = "application/pdf";
  readonly fileExtension = "pdf";

  async export(questionSet: QuestionSet, questions: Question[]): Promise<Buffer> {
    const content: Content[] = [{ text: questionSet.title, style: "header" }];

    questions.forEach((question, index) => {
      content.push({ text: `${index + 1}. ${question.prompt}`, margin: [0, 14, 0, 4] });
      if (question.options) {
        question.options.forEach((option, optionIndex) => {
          content.push({ text: `${String.fromCharCode(97 + optionIndex)}) ${option}`, margin: [16, 2, 0, 0] });
        });
      }
      if (question.marks != null) {
        content.push({ text: `[${question.marks} marks]`, italics: true, color: "#6e6e73", margin: [0, 4, 0, 0] });
      }
    });

    const pdf = pdfMake.createPdf({
      content,
      pageSize: questionSet.pageSize,
      defaultStyle: { font: "Helvetica", fontSize: 11 },
      styles: { header: { fontSize: 20, bold: true, margin: [0, 0, 0, 16] } },
    });

    return pdf.getBuffer();
  }
}
