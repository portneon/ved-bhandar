import { ChapterRange } from "../../types";

interface ChapterPickerProps {
  chapters: ChapterRange[];
  selected: number[];
  onChange: (selected: number[]) => void;
  topic: string;
  onTopicChange: (topic: string) => void;
}

export function ChapterPicker({ chapters, selected, onChange, topic, onTopicChange }: ChapterPickerProps): JSX.Element {
  const toggle = (no: number): void => {
    onChange(selected.includes(no) ? selected.filter((n) => n !== no) : [...selected, no]);
  };

  return (
    <section className="card">
      <h2>Chapters</h2>
      <div className="chapter-checkboxes" role="group" aria-label="Select chapters">
        {chapters.map((chapter) => (
          <label key={chapter.no} className="chapter-checkbox">
            <input type="checkbox" checked={selected.includes(chapter.no)} onChange={() => toggle(chapter.no)} />
            <span>
              {chapter.no}. {chapter.title} (p. {chapter.pageStart}–{chapter.pageEnd})
            </span>
          </label>
        ))}
      </div>
      <label className="field">
        <span>Topic (optional)</span>
        <input
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="e.g. photosynthesis — leave blank to cover the whole chapter"
          autoComplete="off"
        />
      </label>
    </section>
  );
}
