import { inject, injectable } from "tsyringe";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Book } from "../../domain/entities/Book";
import { Generation } from "../../domain/entities/Generation";
import { Template } from "../../domain/entities/Template";
import { IFileStorage } from "../../domain/interfaces/IFileStorage";
import { exportableQuestions } from "./pdfQuestionHtml";

/** Fills a user-uploaded .docx template's `{#questions}...{/questions}` loop (and scalar fields) with generated questions. */
@injectable()
export class DocxTemplateExporter {
  readonly contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  constructor(@inject("IFileStorage") private readonly fileStorage: IFileStorage) {}

  async export(generation: Generation, book: Book, template: Template): Promise<Buffer> {
    if (!template.docxStoragePath) throw new Error(".docx template is missing its file");

    const templateBuffer = await this.fileStorage.read(template.docxStoragePath);
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const shown = exportableQuestions(generation.questions);
    const totalMarks = shown.reduce((sum, question) => sum + question.marks, 0);

    doc.render({
      school_name: book.title,
      subject: book.subject,
      board: book.board,
      grade: book.grade,
      date: new Date().toLocaleDateString("en-IN"),
      total_marks: totalMarks,
      questions: shown.map((question, index) => ({
        index: index + 1,
        stem: question.stem ?? "",
        marks: question.marks,
        bloom: question.bloom,
        options: (question.options ?? []).map((option, i) => ({ letter: String.fromCharCode(97 + i), text: option })),
      })),
      answer_key: shown.map((question, index) => ({
        index: index + 1,
        answer: question.answer ?? "",
        explanation: question.explanation ?? "",
      })),
    });

    return doc.getZip().generate({ type: "nodebuffer" });
  }
}
