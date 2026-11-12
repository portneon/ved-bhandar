import { Difficulty, GenerationItem, QuestionType } from "../../types";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "MCQ" },
  { value: "short_answer", label: "Short answer" },
  { value: "long_answer", label: "Long answer" },
];

const BLOOM_LEVELS = [
  { value: 1, label: "1 — Remember" },
  { value: 2, label: "2 — Understand" },
  { value: 3, label: "3 — Apply" },
  { value: 4, label: "4 — Analyze" },
  { value: 5, label: "5 — Evaluate" },
  { value: 6, label: "6 — Create" },
];

interface SlotRowsProps {
  items: GenerationItem[];
  onChange: (items: GenerationItem[]) => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

export function SlotRows({ items, onChange, difficulty, onDifficultyChange }: SlotRowsProps): JSX.Element {
  const updateRow = (index: number, patch: Partial<GenerationItem>): void => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addRow = (): void => {
    onChange([...items, { type: "mcq", bloom: 1, count: 1, marks: 1 }]);
  };

  const removeRow = (index: number): void => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <section className="card">
      <h2>Questions</h2>
      <div className="slot-rows" role="group" aria-label="Question rows">
        <div className="slot-row slot-row-header" aria-hidden="true">
          <span>Type</span>
          <span>Bloom level</span>
          <span>Count</span>
          <span>Marks each</span>
          <span />
        </div>
        {items.map((item, index) => (
          <div className="slot-row" key={index}>
            <select aria-label="Question type" value={item.type} onChange={(e) => updateRow(index, { type: e.target.value as QuestionType })}>
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select aria-label="Bloom level" value={item.bloom} onChange={(e) => updateRow(index, { bloom: Number(e.target.value) })}>
              {BLOOM_LEVELS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Question count"
              type="number"
              min={1}
              value={item.count}
              onChange={(e) => updateRow(index, { count: Number(e.target.value) })}
            />
            <input
              aria-label="Marks per question"
              type="number"
              min={0}
              value={item.marks}
              onChange={(e) => updateRow(index, { marks: Number(e.target.value) })}
            />
            <button type="button" className="icon-button" aria-label="Remove row" onClick={() => removeRow(index)}>
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="secondary" onClick={addRow}>
        + Add Row
      </button>

      <label className="field">
        <span>Difficulty</span>
        <select value={difficulty} onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </label>
    </section>
  );
}
