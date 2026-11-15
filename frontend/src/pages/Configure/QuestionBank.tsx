import { useEffect, useState } from "react";
import { listQuestionBank } from "../../api/books";
import { ChapterRange, QuestionBankEntry, QuestionType } from "../../types";

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "MCQ",
  short_answer: "Short answer",
  long_answer: "Long answer",
};

export function QuestionBank({ bookId, chapters }: { bookId: string; chapters: ChapterRange[] }): JSX.Element {
  const [chapter, setChapter] = useState<number | "all">("all");
  const [entries, setEntries] = useState<QuestionBankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listQuestionBank(bookId, chapter === "all" ? undefined : chapter)
      .then(setEntries)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [bookId, chapter]);

  return (
    <section className="card">
      <div className="settings-summary">
        <h2>Question bank</h2>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Chapter</span>
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All chapters</option>
            {chapters.map((c) => (
              <option key={c.no} value={c.no}>
                {c.no}. {c.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Every question ever generated for this book, pooled by chapter — across every past run, not just the most
        recent one.
      </p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted">No questions generated for this chapter yet.</p>
      ) : (
        <div className="question-list">
          {entries.map((entry) => (
            <details key={entry.id} className="card question-card">
              <summary className="question-bank-summary">
                <span>{TYPE_LABELS[entry.questionType]}</span>
                <span>Bloom {entry.bloom}</span>
                <span>{entry.marks} mark(s)</span>
                <span>p. {entry.pages.join(", ")}</span>
                <span className={`status-badge status-${entry.status}`}>{entry.status}</span>
              </summary>
              <p className="question-stem">{entry.stem}</p>
              {entry.options && entry.options.length > 0 && (
                <ol type="a" className="option-list">
                  {entry.options.map((option, i) => (
                    <li key={i}>{option}</li>
                  ))}
                </ol>
              )}
              <p className="question-answer">
                <strong>Answer:</strong> {entry.answer}
              </p>
              {entry.explanation && <p className="muted">{entry.explanation}</p>}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
