import { useMemo } from "react";
import katex from "katex";

/**
 * Renders a string that may contain LaTeX math (delimited by $$...$$ for
 * display mode or $...$ for inline) the same way the PDF exporter does, so
 * what a teacher reviews here matches the exported paper. Plain text with
 * no $ delimiters renders unchanged.
 */
interface MathProps {
  text: string;
  as?: "span" | "p" | "div";
  className?: string;
}

export function Math({ text, as: Tag = "span", className }: MathProps): JSX.Element {
  const html = useMemo(() => renderMathHtml(text), [text]);
  const classes = className ? `math-text ${className}` : "math-text";
  return <Tag className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderMathHtml(text: string): string {
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
