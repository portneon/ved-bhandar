import { injectable } from "tsyringe";
import { Book } from "../../domain/entities/Book.js";
import { Generation } from "../../domain/entities/Generation.js";
import { IGenerationExporter } from "../../domain/interfaces/IGenerationExporter.js";
import { PDF_BASE_STYLES, escapeHtml, exportableQuestions, renderHtmlToPdf, renderQuestionsAndAnswerKey } from "./pdfQuestionHtml.js";

@injectable()
export class GenerationPdfExporter implements IGenerationExporter {
  readonly contentType = "application/pdf";
  readonly fileExtension = "pdf";

  async export(generation: Generation, book: Book): Promise<Buffer> {
    const shown = exportableQuestions(generation.questions);
    const { sectionsHtml, answerKeyHtml } = renderQuestionsAndAnswerKey(shown, { showBloom: true, showMarks: true });

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="katex.min.css" />
<style>${PDF_BASE_STYLES}</style>
</head>
<body>
  <p class="title">${escapeHtml(book.title)}</p>
  <p class="subtitle">${escapeHtml(book.board)} · Class ${escapeHtml(book.grade)} · ${escapeHtml(book.subject)}</p>
  ${sectionsHtml}
  <h2 class="answer-key-header">Answer Key</h2>
  ${answerKeyHtml}
</body>
</html>`;

    return renderHtmlToPdf(html);
  }
}
