import { PdfLine } from "../../domain/interfaces/IPdfProcessor";

const CANDIDATE_EDGE_LINES = 2;
const REPEAT_THRESHOLD = 0.5;

function normalize(text: string): string {
  return text.replace(/\d+/g, "#").trim().toLowerCase();
}

/**
 * Drops page numbers and running headers/footers: a line recurring near the
 * top or bottom of more than half the book's pages is treated as boilerplate.
 */
export function stripHeadersFooters(pages: PdfLine[][]): PdfLine[][] {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const edgeLines = [...page.slice(0, CANDIDATE_EDGE_LINES), ...page.slice(-CANDIDATE_EDGE_LINES)];
    const seen = new Set<string>();
    for (const line of edgeLines) {
      const key = normalize(line.text);
      if (key.length === 0 || seen.has(key)) continue;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const threshold = pages.length * REPEAT_THRESHOLD;
  const repeatedKeys = new Set([...counts.entries()].filter(([, count]) => count > threshold).map(([key]) => key));

  return pages.map((page) =>
    page.filter((line) => {
      if (/^\d+$/.test(line.text.trim())) return false;
      return !repeatedKeys.has(normalize(line.text));
    }),
  );
}
