import katex from "katex";

/**
 * Converts a string that may contain LaTeX math (delimited by $$...$$ for
 * display mode or $...$ for inline) into HTML, rendering the math with
 * KaTeX and HTML-escaping everything else. Text with no $ delimiters round
 * -trips as plain escaped text, so content written before the prompt asked
 * for LaTeX still renders correctly.
 */
export function renderMathHtml(text: string): string {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
        return renderKatex(part.slice(2, -2), true);
      }
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        return renderKatex(part.slice(1, -1), false);
      }
      return escapeHtml(part);
    })
    .join("");
}

function renderKatex(expression: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expression, { throwOnError: false, displayMode });
  } catch {
    return escapeHtml(expression);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
