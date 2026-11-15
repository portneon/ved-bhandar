import { useState } from "react";
import { addManualQuestion } from "../../api/generations";
import { QuestionType } from "../../types";

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  short_answer: "Short Answer",
  long_answer: "Long Answer",
};

const DEFAULT_MARKS: Record<QuestionType, number> = {
  mcq: 1,
  short_answer: 2,
  long_answer: 5,
};

interface AddQuestionFormProps {
  generationId: string;
  onAdded: () => void;
}

export function AddQuestionForm({ generationId, onAdded }: AddQuestionFormProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionType>("short_answer");
  const [marks, setMarks] = useState(DEFAULT_MARKS.short_answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeType = (type: QuestionType): void => {
    setQuestionType(type);
    setMarks(DEFAULT_MARKS[type]);
  };

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await addManualQuestion(generationId, { questionType, marks });
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add question");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="add-question-row">
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          + Add question manually
        </button>
      </div>
    );
  }

  return (
    <div className="add-question-row add-question-form">
      <label className="field">
        <span>Type</span>
        <select value={questionType} onChange={(e) => changeType(e.target.value as QuestionType)}>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Marks</span>
        <input
          type="number"
          min={0}
          value={marks}
          onChange={(e) => setMarks(Number(e.target.value))}
        />
      </label>
      <div className="question-actions">
        <button type="button" disabled={busy} onClick={submit}>
          Add
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
