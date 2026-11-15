import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { createRequire } from "module";
import puppeteer from "puppeteer";
import { GeneratedQuestion } from "../../domain/entities/GeneratedQuestion";
import { renderMathHtml } from "../rendering/MathHtmlRenderer";

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple Choice",
  short_answer: "Short Answer",
  long_answer: "Long Answer",
};

// KaTeX's CSS pulls in @font-face files from ./fonts next to it. puppeteer's
// setContent() has no base URL for resolving those relative to node_modules,
// so each export copies katex.min.css + fonts/ into a scratch dir and loads
// the page there via a real file:// URL, where relative resource loading
// works the same way it would on a real site.
const require = createRequire(import.meta.url);
const KATEX_DIST_DIR = path.dirname(require.resolve("katex/dist/katex.min.css"));

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface QuestionHtmlOptions {
  showBloom: boolean;
  showMarks: boolean;
}

export function exportableQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  return questions.filter(
    (question) => question.stem !== null && (question.status === "draft" || question.status === "accepted"),
  );
}

/** Groups questions by type into exam-paper sections, plus a matching answer key — shared by every PDF exporter. */
export function renderQuestionsAndAnswerKey(
  questions: GeneratedQuestion[],
  options: QuestionHtmlOptions,
): { sectionsHtml: string; answerKeyHtml: string } {
  const orderedByType: GeneratedQuestion[] = [];
  const sections: string[] = [];
  for (const [type, label] of Object.entries(QUESTION_TYPE_LABELS)) {
    const group = questions.filter((question) => question.questionType === type);
    if (group.length === 0) continue;
    sections.push(`<h2 class="section-header">${label}</h2>`);
    for (const question of group) {
      orderedByType.push(question);
      sections.push(questionBlock(orderedByType.length, question, options));
    }
  }

  const answerKeyHtml = orderedByType
    .map(
      (question, index) => `
        <p class="answer-item">
          <strong>${index + 1}.</strong> ${renderMathHtml(question.answer ?? "")}
          ${question.explanation ? `<em> — ${renderMathHtml(question.explanation)}</em>` : ""}
        </p>`,
    )
    .join("\n");

  return { sectionsHtml: sections.join("\n"), answerKeyHtml };
}

function questionBlock(index: number, question: GeneratedQuestion, options: QuestionHtmlOptions): string {
  const metaParts: string[] = [];
  if (options.showBloom) metaParts.push(`Bloom ${question.bloom}`);
  if (options.showMarks) metaParts.push(`${question.marks} mark(s)`);
  metaParts.push(`p. ${question.pages.join("-")}`);
  const meta = metaParts.join(" · ");

  const optionLines = (question.options ?? [])
    .map((option, i) => `<p class="option-line">${String.fromCharCode(97 + i)}. ${renderMathHtml(option)}</p>`)
    .join("\n");
  return `
    <div class="question-block">
      <p class="question-stem">${index}. ${renderMathHtml(question.stem ?? "")}</p>
      <p class="question-meta">${escapeHtml(meta)}</p>
      ${optionLines}
    </div>`;
}

export const PDF_BASE_STYLES = `
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11pt; color: #111; margin: 0; }
  .title { font-size: 16pt; font-weight: bold; margin: 0 0 4pt; }
  .subtitle { font-size: 10pt; color: #555; margin: 0 0 16pt; }
  .footer-text { font-size: 9pt; color: #777; margin: 24pt 0 0; }
  .section-header { font-size: 13pt; margin: 16pt 0 8pt; }
  .question-block { margin: 0 0 10pt; }
  .question-stem { font-weight: bold; margin: 0; }
  .question-meta { font-size: 9pt; color: #777; margin: 2pt 0 4pt; }
  .option-line { margin: 0 0 2pt; }
  .answer-key-header { font-size: 13pt; margin: 0 0 8pt; page-break-before: always; }
  .answer-item { margin: 0 0 6pt; }
  .katex { font-size: 1em; }
`;

/** Renders a full HTML document (with KaTeX available at `katex.min.css`) to a PDF buffer via headless Chrome. */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "generation-pdf-"));
  try {
    await fs.cp(KATEX_DIST_DIR, scratchDir, { recursive: true });
    const htmlPath = path.join(scratchDir, `${randomUUID()}.html`);
    await fs.writeFile(htmlPath, html, "utf8");

    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({ format: "A4", margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" } });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  } finally {
    await fs.rm(scratchDir, { recursive: true, force: true });
  }
}
