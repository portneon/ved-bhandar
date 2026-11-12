import { ChapterRange } from "../../domain/entities/Book";
import { PdfLine } from "../../domain/interfaces/IPdfProcessor";

export interface SectionDraft {
  chapter: number;
  sectionPath: string;
  sectionTitle: string;
  lines: { page: number; text: string }[];
}

const HEADING_SIZE_RATIO = 1.2;
const HEADING_MAX_LENGTH = 80;

function computeBodyFontSize(pages: PdfLine[][]): number {
  const counts = new Map<number, number>();
  for (const page of pages) {
    for (const line of page) {
      const rounded = Math.round(line.fontSize);
      counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
    }
  }
  let mode = 0;
  let max = -1;
  for (const [size, count] of counts) {
    if (count > max) {
      max = count;
      mode = size;
    }
  }
  return mode || 10;
}

/**
 * Chapter boundaries come from the teacher-supplied page ranges when given
 * (the spec treats these as authoritative). Without hints, Round 1 treats
 * the whole upload as a single chapter rather than guessing chapter breaks
 * from layout — auto chapter-boundary detection on decorative opener pages
 * is the riskiest heuristic in this pipeline, so it isn't attempted here.
 */
export function detectSections(pages: PdfLine[][], chapterHints?: ChapterRange[]): SectionDraft[] {
  const bodyFontSize = computeBodyFontSize(pages);
  const sections: SectionDraft[] = [];
  const sectionCounterByChapter = new Map<number, number>();

  let currentChapter = chapterHints?.[0]?.no ?? 1;
  let currentSectionPath = "";
  let currentSectionTitle = "";
  let currentLines: { page: number; text: string }[] = [];

  const pushSection = (): void => {
    if (currentLines.length > 0) {
      sections.push({
        chapter: currentChapter,
        sectionPath: currentSectionPath,
        sectionTitle: currentSectionTitle,
        lines: currentLines,
      });
    }
    currentLines = [];
  };

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageNumber = pageIndex + 1;

    if (chapterHints && chapterHints.length > 0) {
      const hint = chapterHints.find((h) => pageNumber >= h.pageStart && pageNumber <= h.pageEnd);
      if (!hint) continue;
      if (hint.no !== currentChapter) {
        pushSection();
        currentChapter = hint.no;
        currentSectionPath = "";
        currentSectionTitle = "";
      }
    }

    for (const line of pages[pageIndex]) {
      const isHeading = line.fontSize >= bodyFontSize * HEADING_SIZE_RATIO && line.text.length < HEADING_MAX_LENGTH;
      if (isHeading) {
        pushSection();
        const numbered = line.text.match(/^(\d+(?:\.\d+)*)\s+(.*)/);
        if (numbered) {
          currentSectionPath = numbered[1];
          currentSectionTitle = numbered[2].trim();
        } else {
          const next = (sectionCounterByChapter.get(currentChapter) ?? 0) + 1;
          sectionCounterByChapter.set(currentChapter, next);
          currentSectionPath = `${currentChapter}.${next}`;
          currentSectionTitle = line.text.trim();
        }
        continue;
      }

      if (currentSectionPath === "") {
        currentSectionPath = `${currentChapter}.0`;
        currentSectionTitle = "Introduction";
      }
      currentLines.push({ page: pageNumber, text: line.text });
    }
  }
  pushSection();

  return sections;
}
