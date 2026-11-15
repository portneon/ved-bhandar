import { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, meta, actions }: PageHeaderProps): JSX.Element {
  return (
    <header className="app-banner l-on-dark">
      <div className="l-wrap app-banner-wrap">
        <div>
          {eyebrow && (
            <span className="l-eyebrow">
              <span className="l-dot" />
              {eyebrow}
            </span>
          )}
          <h1>{title}</h1>
          {subtitle && <p className="app-banner-sub">{subtitle}</p>}
          {meta && <div className="app-banner-meta">{meta}</div>}
        </div>
        {actions && <div className="app-banner-actions">{actions}</div>}
      </div>
    </header>
  );
}
