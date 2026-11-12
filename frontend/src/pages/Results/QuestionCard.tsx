import { useState } from "react";
import { patchQuestion, regenerateSlot } from "../../api/generations";
import { GeneratedQuestion } from "../../types";
import { SlotFailureNotice } from "./SlotFailureNotice";

interface QuestionCardProps {
  question: GeneratedQuestion;
  index: number;
  generationId: string;
  onChanged: () => void;
}

export function QuestionCard({ question, index, generationId, onChanged }: QuestionCardProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [stem, setStem] = useState(question.stem ?? "");
  const [options, setOptions] = useState(question.options ?? []);
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [busy, setBusy] = useState(false);

  if (question.status === "no_candidates" || question.status === "failed") {
    return <SlotFailureNotice question={question} />;
  }
  if (question.status === "pending") {
    return (
      <div className="card question-card question-pending">
        <p className="muted">Generating…</p>
      </div>
    );
  }

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await action();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const save = (): Promise<void> =>
    run(async () => {
      await patchQuestion(generationId, question.slotId, {
        stem,
        options: question.options ? options : null,
        answer,
        explanation,
      });
      setEditing(false);
    });

  return (
    <div className="card question-card">
      <div className="question-meta">
        <span>{index}.</span>
        <span>Bloom {question.bloom}</span>
        <span>{question.marks} mark(s)</span>
        <span>p. {question.pages.join(", ")}</span>
        <span className={`status-badge status-${question.status}`}>{question.status}</span>
      </div>

      {editing ? (
        <div className="question-edit">
          <label className="field">
            <span>Stem</span>
            <textarea value={stem} onChange={(e) => setStem(e.target.value)} />
          </label>
          {question.options && question.options.length > 0 && (
            <div className="option-edit-list">
              {options.map((option, i) => (
                <input
                  key={i}
                  aria-label={`Option ${i + 1}`}
                  value={option}
                  onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                />
              ))}
            </div>
          )}
          <label className="field">
            <span>Answer</span>
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </label>
          <label className="field">
            <span>Explanation</span>
            <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </label>
          <div className="question-actions">
            <button type="button" disabled={busy} onClick={save}>
              Save
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="question-stem">{question.stem}</p>
          {question.options && question.options.length > 0 && (
            <ol type="a" className="option-list">
              {question.options.map((option, i) => (
                <li key={i}>{option}</li>
              ))}
            </ol>
          )}
          <p className="question-answer">
            <strong>Answer:</strong> {question.answer}
          </p>
          {question.explanation && <p className="muted">{question.explanation}</p>}
          <div className="question-actions">
            <button
              type="button"
              disabled={busy || question.status === "accepted"}
              onClick={() => run(() => patchQuestion(generationId, question.slotId, { status: "accepted" }))}
            >
              Accept
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => run(() => regenerateSlot(generationId, question.slotId))}
            >
              Regenerate
            </button>
            <button
              type="button"
              className="danger"
              disabled={busy || question.status === "rejected"}
              onClick={() => run(() => patchQuestion(generationId, question.slotId, { status: "rejected" }))}
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}
