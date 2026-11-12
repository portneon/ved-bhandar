import { injectable } from "tsyringe";
import pdfMake from "pdfmake";
import type { Content } from "pdfmake";

type TDocumentDefinitions = Parameters<typeof pdfMake.createPdf>[0];
import { Book } from "../../domain/entities/Book";
import { Generation } from "../../domain/entities/Generation";
import { GeneratedQuestion } from "../../domain/entities/GeneratedQuestion";
import { IGenerationExporter } from "../../domain/interfaces/IGenerationExporter";

pdfMake.setFonts({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
});

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple Choice",
  short_answer: "Short Answer",
  long_answer: "Long Answer",
};

@injectable()
export class GenerationPdfExporter implements IGenerationExporter {
  readonly contentType = "application/pdf";
  readonly fileExtension = "pdf";

  async export(generation: Generation, book: Book): Promise<Buffer> {
    const shown = generation.questions.filter(
      (question) => question.stem !== null && (question.status === "draft" || question.status === "accepted"),
    );

    const orderedByType: GeneratedQuestion[] = [];
    const sections: Content[] = [];
    for (const [type, label] of Object.entries(QUESTION_TYPE_LABELS)) {
      const group = shown.filter((question) => question.questionType === type);
      if (group.length === 0) continue;
      sections.push({ text: label, style: "sectionHeader" });
      for (const question of group) {
        orderedByType.push(question);
        sections.push(this.questionBlock(orderedByType.length, question));
      }
    }

    const answerKey: Content[] = orderedByType.map((question, index) => ({
      text: [
        { text: `${index + 1}. `, bold: true },
        { text: question.answer ?? "" },
        question.explanation ? { text: `  — ${question.explanation}`, italics: true } : "",
      ],
      margin: [0, 0, 0, 6],
    }));

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: "Helvetica", fontSize: 11 },
      styles: {
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
        subtitle: { fontSize: 10, color: "#555555", margin: [0, 0, 0, 16] },
        sectionHeader: { fontSize: 13, bold: true, margin: [0, 16, 0, 8] },
        questionStem: { bold: true },
      },
      content: [
        { text: book.title, style: "title" },
        { text: `${book.board} · Class ${book.grade} · ${book.subject}`, style: "subtitle" },
        ...sections,
        { text: "Answer Key", style: "sectionHeader", pageBreak: "before" },
        ...answerKey,
      ],
    };

    const pdf = pdfMake.createPdf(docDefinition);
    return pdf.getBuffer();
  }

  private questionBlock(index: number, question: GeneratedQuestion): Content {
    const meta = `Bloom ${question.bloom} · ${question.marks} mark(s) · p. ${question.pages.join("-")}`;
    const optionLines: Content[] = (question.options ?? []).map((option, i) => ({
      text: `${String.fromCharCode(97 + i)}. ${option}`,
    }));
    return {
      margin: [0, 0, 0, 10],
      stack: [
        { text: `${index}. ${question.stem}`, style: "questionStem" },
        { text: meta, fontSize: 9, color: "#777777", margin: [0, 2, 0, 4] },
        ...optionLines,
      ],
    };
  }
}
