import { Link } from "react-router-dom";
import { Book } from "../../types";

const STATUS_LABELS: Record<Book["status"], string> = {
  uploaded: "Queued",
  parsing: "Parsing",
  tagging: "Tagging",
  embedding: "Embedding",
  ready: "Ready",
  failed: "Failed",
};

function BookListItem({ book }: { book: Book }): JSX.Element {
  const content = (
    <div className="card book-row">
      <div className="book-row-main">
        <h3>{book.title}</h3>
        <p className="muted">
          {book.board} · Class {book.grade} · {book.subject}
          {book.pages > 0 ? ` · ${book.pages} pages` : ""}
        </p>
        {book.status === "failed" && <p className="error">{book.failureReason}</p>}
      </div>
      <div className="book-row-status">
        <span className={`status-badge status-${book.status}`}>{STATUS_LABELS[book.status]}</span>
        {book.status !== "ready" && book.status !== "failed" && (
          <div className="progress-bar" role="progressbar" aria-valuenow={book.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar-fill" style={{ width: `${book.progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );

  return book.status === "ready" ? (
    <Link to={`/configure/${book.id}`} className="book-link">
      {content}
    </Link>
  ) : (
    content
  );
}

export function BookList({ books }: { books: Book[] }): JSX.Element {
  if (books.length === 0) {
    return <p className="muted">No books uploaded yet.</p>;
  }
  return (
    <div className="book-list">
      {books.map((book) => (
        <BookListItem key={book.id} book={book} />
      ))}
    </div>
  );
}
