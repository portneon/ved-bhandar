import { Link } from "react-router-dom";
import { GenerationSummary } from "../../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function GenerationHistory({ generations }: { generations: GenerationSummary[] }): JSX.Element | null {
  if (generations.length === 0) return null;

  return (
    <section className="card">
      <h2>Previously generated papers</h2>
      <p className="muted">
        Every past run for this book is kept — pick one up where you left off instead of generating again.
      </p>
      <div className="book-list">
        {generations.map((generation) => (
          <Link key={generation.id} to={`/results/${generation.id}`} className="book-link">
            <div className="card book-row history-row">
              <div className="book-row-main">
                <h3>{formatDate(generation.createdAt)}</h3>
                <p className="muted">
                  {generation.settings.items.reduce((sum, item) => sum + item.count, 0)} question
                  {generation.settings.items.reduce((sum, item) => sum + item.count, 0) === 1 ? "" : "s"} requested ·{" "}
                  {generation.settings.difficulty} difficulty
                </p>
              </div>
              <div className="book-row-status">
                <span className="status-badge status-accepted">
                  {generation.exportableQuestions} of {generation.totalQuestions} in PDF
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
