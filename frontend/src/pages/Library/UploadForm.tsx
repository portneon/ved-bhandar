import { FormEvent, useState } from "react";
import { uploadBook, UploadProgress } from "../../api/books";

interface ChapterRow {
  no: string;
  title: string;
  pageStart: string;
  pageEnd: string;
}

const emptyRow = (): ChapterRow => ({ no: "", title: "", pageStart: "", pageEnd: "" });

interface UploadFormProps {
  onUploaded: () => void;
  onUploadStart: (title: string) => void;
  onUploadProgress: (progress: UploadProgress) => void;
  onUploadDone: () => void;
}

export function UploadForm({ onUploaded, onUploadStart, onUploadProgress, onUploadDone }: UploadFormProps): JSX.Element {
  const [title, setTitle] = useState("");
  const [board, setBoard] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [chapterRows, setChapterRows] = useState<ChapterRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addChapterRow = (): void => setChapterRows((rows) => [...rows, emptyRow()]);
  const removeChapterRow = (index: number): void => setChapterRows((rows) => rows.filter((_, i) => i !== index));
  const updateChapterRow = (index: number, patch: Partial<ChapterRow>): void =>
    setChapterRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }
    setSubmitting(true);
    setError(null);
    onUploadStart(title);
    try {
      const chapterHints = chapterRows
        .filter((row) => row.no && row.pageStart && row.pageEnd)
        .map((row) => ({
          no: Number(row.no),
          title: row.title,
          pageStart: Number(row.pageStart),
          pageEnd: Number(row.pageEnd),
        }));
      await uploadBook(
        { title, board, grade, subject, file, chapterHints: chapterHints.length > 0 ? chapterHints : undefined },
        onUploadProgress,
      );
      setTitle("");
      setBoard("");
      setGrade("");
      setSubject("");
      setFile(null);
      setChapterRows([]);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
      onUploadDone();
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit} aria-label="Upload a textbook">
      <h2>Upload a Textbook</h2>
      <div className="field-grid">
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" required />
        </label>
        <label className="field">
          <span>Board / University</span>
          <input
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            placeholder="CBSE, Delhi University, IIT Bombay…"
            autoComplete="off"
            required
          />
        </label>
        <label className="field">
          <span>Class / Year</span>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Class 10, 2nd Year B.Sc, Semester 4…"
            autoComplete="off"
            required
          />
        </label>
        <label className="field">
          <span>Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Science" autoComplete="off" required />
        </label>
      </div>

      <label className="field">
        <span>PDF file</span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </label>

      <fieldset className="chapter-hints">
        <legend>Chapter page ranges (optional, improves parsing accuracy)</legend>
        {chapterRows.map((row, index) => (
          <div className="chapter-row" key={index}>
            <input
              aria-label="Chapter number"
              placeholder="No."
              value={row.no}
              onChange={(e) => updateChapterRow(index, { no: e.target.value })}
            />
            <input
              aria-label="Chapter title"
              placeholder="Title"
              value={row.title}
              onChange={(e) => updateChapterRow(index, { title: e.target.value })}
            />
            <input
              aria-label="Start page"
              placeholder="From page"
              value={row.pageStart}
              onChange={(e) => updateChapterRow(index, { pageStart: e.target.value })}
            />
            <input
              aria-label="End page"
              placeholder="To page"
              value={row.pageEnd}
              onChange={(e) => updateChapterRow(index, { pageEnd: e.target.value })}
            />
            <button type="button" className="icon-button" onClick={() => removeChapterRow(index)} aria-label="Remove chapter row">
              ×
            </button>
          </div>
        ))}
        <button type="button" className="secondary" onClick={addChapterRow}>
          + Add Chapter
        </button>
      </fieldset>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
