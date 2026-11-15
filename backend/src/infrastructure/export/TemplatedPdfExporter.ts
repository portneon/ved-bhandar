import { injectable } from "tsyringe";
import { Book } from "../../domain/entities/Book";
import { Generation } from "../../domain/entities/Generation";
import { Template } from "../../domain/entities/Template";
import { PDF_BASE_STYLES, escapeHtml, exportableQuestions, renderHtmlToPdf, renderQuestionsAndAnswerKey } from "./pdfQuestionHtml";

/** Renders a generation into a user-built template's branding (school name, header/footer text, Bloom/marks toggles). */
@injectable()
export class TemplatedPdfExporter {
  readonly contentType = "application/pdf";

  async export(generation: Generation, book: Book, template: Template): Promise<Buffer> {
    const config = template.builderConfig;
    if (!config) throw new Error("Builder template is missing its configuration");

    const shown = exportableQuestions(generation.questions);
    const { sectionsHtml, answerKeyHtml } = renderQuestionsAndAnswerKey(shown, {
      showBloom: config.showBloom,
      showMarks: config.showMarks,
    });

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="katex.min.css" />
<style>${PDF_BASE_STYLES}</style>
</head>
<body>
  <p class="title">${escapeHtml(config.schoolName || book.title)}</p>
  <p class="subtitle">${escapeHtml(config.headerText || `${book.board} · Class ${book.grade} · ${book.subject}`)}</p>
  ${sectionsHtml}
  <h2 class="answer-key-header">Answer Key</h2>
  ${answerKeyHtml}
  ${config.footerText ? `<p class="footer-text">${escapeHtml(config.footerText)}</p>` : ""}
</body>
</html>`;

    return renderHtmlToPdf(html);
  }
}
