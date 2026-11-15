import { useState } from "react";
import { patchQuestion, refineQuestion, regenerateSlot } from "../../api/generations";
import { GeneratedQuestion, willIncludeInPdfExport } from "../../types";
import { SlotFailureNotice } from "./SlotFailureNotice";
import { Math } from "../../components/Math";

interface QuestionCardProps {
  question: GeneratedQuestion;
  index: number;
  generationId: string;
  onChanged: () => void;
}

export function QuestionCard({ question, index, generationId, onChanged }: QuestionCardProps): JSX.Element {
  const [editing, setEditing] = useState(question.isManual && question.stem === null);
  const [stem, setStem] = useState(question.stem ?? "");
  const [options, setOptions] = useState(question.options ?? []);
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [busy, setBusy] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [refineError, setRefineError] = useState<string | null>(null);

  if (question.status === "no_candidates" || question.status === "failed") {
    return (
      <SlotFailureNotice
        question={question}
        index={index}
        generationId={generationId}
        onChanged={onChanged}
      />
    );
  }
  if (question.status === "pending") {
    return (
      <div className="exam-question question-pending">
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

  const refine = async (): Promise<void> => {
    if (!instruction.trim()) return;
    setBusy(true);
    setRefineError(null);
    try {
      await refineQuestion(generationId, question.slotId, instruction.trim());
      setInstruction("");
      onChanged();
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Could not refine this question");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exam-question">
      <div className="question-meta">
        <span className="question-number">{index}.</span>
        <span>Bloom {question.bloom}</span>
        <span>{question.marks} mark(s)</span>
        {question.pages.length > 0 ? <span>p. {question.pages.join(", ")}</span> : <span>Manual</span>}
        <span className={`status-badge status-${question.status}`}>{question.status}</span>
        <span className={`pdf-export-badge ${willIncludeInPdfExport(question) ? "in" : "out"}`}>
          {willIncludeInPdfExport(question) ? "In PDF export" : "Not exported"}
        </span>
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
          <Math as="p" className="question-stem" text={question.stem ?? ""} />
          {question.options && question.options.length > 0 && (
            <ol type="a" className="option-list">
              {question.options.map((option, i) => (
                <li key={i}>
                  <Math text={option} />
                </li>
              ))}
            </ol>
          )}
          <p className="question-answer">
            <strong>Answer:</strong> <Math text={question.answer ?? ""} />
          </p>
          {question.explanation && <Math as="p" className="muted" text={question.explanation} />}
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
            {!question.isManual && (
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => run(() => regenerateSlot(generationId, question.slotId))}
              >
                Retry
              </button>
            )}
            <button
              type="button"
              className="danger"
              disabled={busy || question.status === "rejected"}
              onClick={() => run(() => patchQuestion(generationId, question.slotId, { status: "rejected" }))}
            >
              Reject
            </button>
          </div>

          <div className="refine-row">
            <input
              type="text"
              aria-label="Instruction for AI refinement"
              placeholder="Tell the AI how to change this question — e.g. make it harder, simplify the wording…"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  refine();
                }
              }}
            />
            <button type="button" className="secondary" disabled={busy || !instruction.trim()} onClick={refine}>
              Refine
            </button>
          </div>
          {refineError && <p className="error refine-error">{refineError}</p>}
        </>
      )}
    </div>
  );
}
