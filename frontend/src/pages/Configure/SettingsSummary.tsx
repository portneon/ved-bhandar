import { GenerationItem } from "../../types";

interface SettingsSummaryProps {
  items: GenerationItem[];
  canGenerate: boolean;
  generating: boolean;
  onGenerate: () => void;
}

export function SettingsSummary({ items, canGenerate, generating, onGenerate }: SettingsSummaryProps): JSX.Element {
  const totalQuestions = items.reduce((sum, item) => sum + item.count, 0);
  const totalMarks = items.reduce((sum, item) => sum + item.count * item.marks, 0);

  return (
    <section className="card settings-summary">
      <p>
        <strong>{totalQuestions}</strong> question{totalQuestions === 1 ? "" : "s"} · <strong>{totalMarks}</strong> mark
        {totalMarks === 1 ? "" : "s"}
      </p>
      <button type="button" onClick={onGenerate} disabled={!canGenerate || generating}>
        {generating ? "Generating…" : "Generate"}
      </button>
    </section>
  );
}
