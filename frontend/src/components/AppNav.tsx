import { Link } from "react-router-dom";
import { Brand } from "./Brand";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";

interface AppNavProps {
  /** Breadcrumb trail for the current page; "Library" is prepended automatically. */
  trail?: BreadcrumbItem[];
}

export function AppNav({ trail }: AppNavProps): JSX.Element {
  const fullTrail: BreadcrumbItem[] = [{ label: "Library", to: "/app" }, ...(trail ?? [])];

  return (
    <div className="app-nav-chrome">
      <nav className="l-nav app-nav">
        <div className="l-wrap">
          <Brand linkTo="/app" />
          <div className="app-nav-links">
            <Link to="/app">Library</Link>
            <Link to="/templates">Templates</Link>
          </div>
        </div>
      </nav>
      {trail && trail.length > 0 && (
        <div className="l-wrap">
          <Breadcrumbs trail={fullTrail} />
        </div>
      )}
    </div>
  );
}
