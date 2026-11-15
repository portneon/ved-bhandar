import { useCallback, useEffect, useState } from "react";
import { deleteBook, listBooks } from "../../api/books";
import { Book } from "../../types";
import { usePolling } from "../../hooks/usePolling";
import { AppNav } from "../../components/AppNav";
import { PageHeader } from "../../components/PageHeader";
import { UploadForm } from "./UploadForm";
import { BookList } from "./BookList";
import "../Landing/landing.css";
import "../../styles/app.css";

export function LibraryPage(): JSX.Element {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    listBooks()
      .then(setBooks)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  const hasInProgressBook = books.some((book) => book.status !== "ready" && book.status !== "failed");
  usePolling(refresh, 2000, hasInProgressBook);

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
        <UploadForm onUploaded={refresh} />
        <h2>Your Books</h2>
        {loading ? <p className="muted">Loading…</p> : <BookList books={books} onDelete={handleDelete} />}
      </div>
    </div>
  );
}
