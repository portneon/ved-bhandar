export interface UploadStatusWidgetProps {
  title: string;
  stage: "uploading" | "finishing";
  /** 0-100, or null while there's no meaningful fraction to show (e.g. a single small-file request). */
  percent: number | null;
  minimized: boolean;
  onToggleMinimize: () => void;
}

/**
 * Floating indicator for an upload in flight. Expanded, it sits over the page as a reminder
 * that something is still happening; minimized, it shrinks to a small corner pill so it stops
 * blocking the page while the book's row in the list keeps the same progress animation going.
 */
export function UploadStatusWidget({ title, stage, percent, minimized, onToggleMinimize }: UploadStatusWidgetProps): JSX.Element {
  const label = stage === "finishing" ? "Finishing up…" : "Uploading…";

  if (minimized) {
    return (
      <button
        type="button"
        className="upload-widget upload-widget-minimized"
        onClick={onToggleMinimize}
        aria-label={`${label} ${title} — click to expand`}
      >
        <span className="spinner" aria-hidden="true" />
        <span>{percent !== null ? `${percent}%` : label}</span>
      </button>
    );
  }

  return (
    <div className="upload-widget upload-widget-expanded" role="status" aria-live="polite">
      <div className="upload-widget-header">
        <span className="spinner" aria-hidden="true" />
        <div className="upload-widget-text">
          <strong>{label}</strong>
          <span className="muted">{title}</span>
        </div>
        <button type="button" className="icon-button" onClick={onToggleMinimize} aria-label="Minimize">
          –
        </button>
      </div>
      {percent !== null && (
        <div className="progress-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
