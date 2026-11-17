import { SectionDraft } from "./SectionDetector.js";

export interface ChunkDraft {
  bookId: string;
  chapter: number;
  sectionPath: string;
  sectionTitle: string;
  page: number;
  pageEnd: number;
  order: number;
  text: string;
}

export interface ExemplarDraft {
  bookId: string;
  chapter: number;
  sectionPath: string;
  text: string;
}

export interface ChunkerResult {
  chunks: ChunkDraft[];
  exemplars: ExemplarDraft[];
}

const MIN_WORDS = 80;
const MAX_WORDS = 300;
const EXERCISES_RE = /^(exercises|questions)\b/i;

interface Paragraph {
  page: number;
  pageEnd: number;
  text: string;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function buildChunks(bookId: string, sections: SectionDraft[]): ChunkerResult {
  const chunks: ChunkDraft[] = [];
  const exemplars: ExemplarDraft[] = [];
  let order = 0;

  for (const section of sections) {
    const paragraphs: Paragraph[] = section.lines
      .map((line) => ({ page: line.page, pageEnd: line.page, text: line.text.trim() }))
      .filter((p) => p.text.length > 0);

    let exercisesStarted = false;
    const exemplarLines: string[] = [];
    const bodyParagraphs: Paragraph[] = [];

    for (const paragraph of paragraphs) {
      if (!exercisesStarted && EXERCISES_RE.test(paragraph.text)) {
        exercisesStarted = true;
      }
      if (exercisesStarted) {
        exemplarLines.push(paragraph.text);
      } else {
        bodyParagraphs.push(paragraph);
      }
    }

    if (exemplarLines.length > 0) {
      exemplars.push({
        bookId,
        chapter: section.chapter,
        sectionPath: section.sectionPath,
        text: exemplarLines.join("\n"),
      });
    }

    for (const merged of mergeIntoChunks(bodyParagraphs)) {
      chunks.push({
        bookId,
        chapter: section.chapter,
        sectionPath: section.sectionPath,
        sectionTitle: section.sectionTitle,
        page: merged.page,
        pageEnd: merged.pageEnd,
        order: order++,
        text: merged.text,
      });
    }
  }

  return { chunks, exemplars };
}

function mergeIntoChunks(paragraphs: Paragraph[]): Paragraph[] {
  const result: Paragraph[] = [];
  let buffer: Paragraph | null = null;

  const flush = (): void => {
    if (buffer && wordCount(buffer.text) > 0) result.push(buffer);
    buffer = null;
  };

  for (const paragraph of paragraphs) {
    buffer = buffer
      ? { page: buffer.page, pageEnd: paragraph.pageEnd, text: `${buffer.text} ${paragraph.text}` }
      : { ...paragraph };

    const words = wordCount(buffer.text);
    if (words >= MIN_WORDS) {
      if (words > MAX_WORDS) {
        result.push(...splitLongText(buffer));
        buffer = null;
      } else {
        flush();
      }
    }
  }
  flush();

  return result;
}

/** Sentence split is a simple regex heuristic, not a real sentence tokenizer — fine for staying under the word cap, not guaranteed grammatically exact. */
function splitLongText(paragraph: Paragraph): Paragraph[] {
  const sentences = paragraph.text.split(/(?<=[.?!])\s+(?=[A-Z])/);
  const chunks: Paragraph[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (current && wordCount(candidate) > MAX_WORDS) {
      chunks.push({ page: paragraph.page, pageEnd: paragraph.pageEnd, text: current });
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push({ page: paragraph.page, pageEnd: paragraph.pageEnd, text: current });

  return chunks;
}
