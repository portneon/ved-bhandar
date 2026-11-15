import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/** A persistent "where am I" trail — the last item renders as plain text (the current page). */
export function Breadcrumbs({ trail }: { trail: BreadcrumbItem[] }): JSX.Element {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="breadcrumb-item">
            {item.to && !isLast ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
            {!isLast && <span className="breadcrumb-sep">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
