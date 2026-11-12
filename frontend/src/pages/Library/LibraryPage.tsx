import { useCallback, useEffect, useState } from "react";
import { listBooks } from "../../api/books";
import { Book } from "../../types";
import { usePolling } from "../../hooks/usePolling";
import { UploadForm } from "./UploadForm";
import { BookList } from "./BookList";

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

  return (
    <div className="page">
      <h1>Ved-Bhandar</h1>
      <p className="muted">Upload a textbook, then build a question paper from it.</p>
      <UploadForm onUploaded={refresh} />
      <h2>Your Books</h2>
      {loading ? <p className="muted">Loading…</p> : <BookList books={books} />}
    </div>
  );
}
