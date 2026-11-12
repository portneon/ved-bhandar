import { GeneratedQuestion } from "../../types";

export function SlotFailureNotice({ question }: { question: GeneratedQuestion }): JSX.Element {
  const label = question.status === "no_candidates" ? "No content available" : "Could not generate";
  return (
    <div className="card question-card question-failure" role="alert">
      <p className="status-badge status-failed">{label}</p>
      <p className="muted">{question.reason ?? "This slot could not be filled."}</p>
    </div>
  );
}
