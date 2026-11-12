/**
 * Scans a growing text stream of shape { "questions": [ {...}, {...} ] } and
 * yields each top-level question object's raw JSON text the moment its closing
 * brace arrives, without waiting for the whole response to finish. Assumes
 * question objects themselves contain no nested braces (true for our schema:
 * string/number/string[] fields only), so only "{" / "}" balance is tracked.
 */
export class StreamingQuestionExtractor {
  private buffer = "";
  private depth = 0;
  private inString = false;
  private escapeNext = false;
  private objectStart = -1;

  push(chunk: string): string[] {
    const completed: string[] = [];

    for (const char of chunk) {
      const position = this.buffer.length;
      this.buffer += char;

      if (this.escapeNext) {
        this.escapeNext = false;
        continue;
      }
      if (char === "\\" && this.inString) {
        this.escapeNext = true;
        continue;
      }
      if (char === '"') {
        this.inString = !this.inString;
        continue;
      }
      if (this.inString) continue;

      if (char === "{") {
        if (this.depth === 1) {
          this.objectStart = position;
        }
        this.depth++;
      } else if (char === "}") {
        this.depth--;
        if (this.depth === 1 && this.objectStart >= 0) {
          completed.push(this.buffer.slice(this.objectStart, position + 1));
          this.objectStart = -1;
        }
      }
    }

    return completed;
  }
}
