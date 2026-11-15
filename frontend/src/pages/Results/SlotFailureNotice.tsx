import { useState } from "react";
import { regenerateSlot } from "../../api/generations";
import { GeneratedQuestion } from "../../types";

interface SlotFailureNoticeProps {
  question: GeneratedQuestion;
  index: number;
  generationId: string;
  onChanged: () => void;
}

export function SlotFailureNotice({ question, index, generationId, onChanged }: SlotFailureNoticeProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const label = question.status === "no_candidates" ? "No content available" : "Could not generate";

  const retry = async (): Promise<void> => {
    setBusy(true);
    try {
      await regenerateSlot(generationId, question.slotId);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exam-question question-failure" role="alert">
      <div className="question-meta">
        <span className="question-number">{index}.</span>
        <span className="status-badge status-failed">{label}</span>
      </div>
      <p className="muted">{question.reason ?? "This slot could not be filled."}</p>
      <div className="question-actions">
        <button type="button" className="secondary" disabled={busy} onClick={retry}>
          Retry
        </button>
      </div>
    </div>
  );
}
