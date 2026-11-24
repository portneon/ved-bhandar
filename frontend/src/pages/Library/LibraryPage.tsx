import { useCallback, useEffect, useState } from "react";
import { deleteBook, listBooks, UploadProgress } from "../../api/books";
import { Book } from "../../types";
import { usePolling } from "../../hooks/usePolling";
import { AppNav } from "../../components/AppNav";
import { PageHeader } from "../../components/PageHeader";
import { UploadStatusWidget } from "../../components/UploadStatusWidget";
import { UploadForm } from "./UploadForm";
import { BookList } from "./BookList";
import "../Landing/landing.css";
import "../../styles/app.css";

interface UploadState extends UploadProgress {
  title: string;
  minimized: boolean;
}

function uploadPercent(state: UploadState): number | null {
  if (state.stage === "finishing") return 100;
  return state.totalChunks > 1 ? Math.round((state.sentChunks / state.totalChunks) * 100) : null;
}

export function LibraryPage(): JSX.Element {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);

  const refresh = useCallback(() => {
    listBooks()
      .then(setBooks)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  const hasInProgressBook = books.some((book) => book.status !== "ready" && book.status !== "failed");
  usePolling(refresh, 2000, hasInProgressBook);

  const handleUploadStart = useCallback((title: string): void => {
    setUploadState({ title, stage: "uploading", sentChunks: 0, totalChunks: 1, minimized: false });
  }, []);
  const handleUploadProgress = useCallback((progress: UploadProgress): void => {
    setUploadState((current) => (current ? { ...current, ...progress } : current));
  }, []);
  const handleUploadDone = useCallback((): void => setUploadState(null), []);
  const toggleMinimized = useCallback(
    (): void => setUploadState((current) => (current ? { ...current, minimized: !current.minimized } : current)),
    [],
  );

  const handleDelete = async (book: Book): Promise<void> => {
    const confirmed = window.confirm(
      `Delete "${book.title}"? This removes the uploaded file, its chapters, and every question paper generated from it. This can't be undone.`,
    );
    if (!confirmed) return;
    setBooks((current) => current.filter((b) => b.id !== book.id));
    try {
      await deleteBook(book.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete the book");
    } finally {
      refresh();
    }
  };

  return (
    <div className="landing-page app-page">
      <AppNav />
      <PageHeader
        eyebrow="Your library"
        title="Upload a chapter, get a reviewable draft paper"
        subtitle="Add a textbook once — Ved-Bhandar splits it into chapters and tags every section by topic and Bloom's level, so you can turn any one of them into a question paper in minutes."
      />
      <div className="page">
        <UploadForm
          onUploaded={refresh}
          onUploadStart={handleUploadStart}
          onUploadProgress={handleUploadProgress}
          onUploadDone={handleUploadDone}
        />
        <h2>Your Books</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <BookList
            books={books}
            onDelete={handleDelete}
            pending={
              uploadState
                ? {
                    title: uploadState.title,
                    label: uploadState.stage === "finishing" ? "Finishing" : "Uploading",
                    percent: uploadPercent(uploadState),
                  }
                : null
            }
          />
        )}
      </div>
      {uploadState && (
        <UploadStatusWidget
          title={uploadState.title}
          stage={uploadState.stage}
          percent={uploadPercent(uploadState)}
          minimized={uploadState.minimized}
          onToggleMinimize={toggleMinimized}
        />
      )}
    </div>
  );
}
