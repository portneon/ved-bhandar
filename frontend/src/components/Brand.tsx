import { Link } from "react-router-dom";

const BOOK_MARK = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5.2c2.6-1.3 5.6-1.3 8 0v13.6c-2.4-1.3-5.4-1.3-8 0V5.2z" fill="currentColor" />
    <path
      d="M21 5.2c-2.6-1.3-5.6-1.3-8 0v13.6c2.4-1.3 5.4-1.3 8 0V5.2z"
      fill="currentColor"
      fillOpacity=".55"
    />
  </svg>
);

export function Brand({ linkTo }: { linkTo?: string } = {}): JSX.Element {
  const mark = (
    <div className="l-brand">
      <span className="l-mark">{BOOK_MARK}</span> Ved-Bhandar
    </div>
  );
  return linkTo ? (
    <Link to={linkTo} className="l-brand-link">
      {mark}
    </Link>
  ) : (
    mark
  );
}
