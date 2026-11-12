import { PageSplitRange } from "../../types";

interface PageSplitSliderProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  ranges: PageSplitRange[];
  onChange: (ranges: PageSplitRange[]) => void;
}

const emptyRange = (): PageSplitRange => ({ from: 0, to: 0, share: 0 });

export function PageSplitSlider({ enabled, onToggle, ranges, onChange }: PageSplitSliderProps): JSX.Element {
  const updateRange = (index: number, patch: Partial<PageSplitRange>): void => {
    onChange(ranges.map((range, i) => (i === index ? { ...range, ...patch } : range)));
  };

  return (
    <section className="card">
      <label className="toggle-row">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        <span>Split marks across page ranges (optional)</span>
      </label>

      {enabled && (
        <div className="page-split-rows">
          {ranges.map((range, index) => (
            <div className="page-split-row" key={index}>
              <input
                aria-label="From page"
                type="number"
                placeholder="From page"
                value={range.from || ""}
                onChange={(e) => updateRange(index, { from: Number(e.target.value) })}
              />
              <input
                aria-label="To page"
                type="number"
                placeholder="To page"
                value={range.to || ""}
                onChange={(e) => updateRange(index, { to: Number(e.target.value) })}
              />
              <input
                aria-label="Share of marks (0-1)"
                type="number"
                step={0.1}
                min={0}
                max={1}
                placeholder="Share (0–1)"
                value={range.share || ""}
                onChange={(e) => updateRange(index, { share: Number(e.target.value) })}
              />
              <button type="button" className="icon-button" aria-label="Remove page range" onClick={() => onChange(ranges.filter((_, i) => i !== index))}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => onChange([...ranges, emptyRange()])}>
            + Add page range
          </button>
        </div>
      )}
    </section>
  );
}
