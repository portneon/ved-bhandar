import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteTemplate, listTemplates } from "../../api/templates";
import { Template } from "../../types";
import { AppNav } from "../../components/AppNav";
import { PageHeader } from "../../components/PageHeader";
import "../Landing/landing.css";
import "../../styles/app.css";

const KIND_LABELS: Record<Template["kind"], string> = { builder: "Built in-app", docx: "Uploaded .docx" };

export function TemplatesPage(): JSX.Element {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listTemplates()
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load templates"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  const handleDelete = async (template: Template): Promise<void> => {
    const confirmed = window.confirm(`Delete the template "${template.name}"? This can't be undone.`);
    if (!confirmed) return;
    setTemplates((current) => current.filter((t) => t.id !== template.id));
    try {
      await deleteTemplate(template.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete the template");
    } finally {
      refresh();
    }
  };

  return (
    <div className="landing-page app-page">
      <AppNav trail={[{ label: "Templates" }]} />
      <PageHeader
        eyebrow="Your templates"
        title="Question paper templates"
        subtitle="Build a branded template in-app, or upload your school's own .docx exam format with placeholder tags, and reuse it every time you export a question paper."
        actions={
          <>
            <Link className="button-link" to="/templates/new">Build a template</Link>
            <Link className="button-link" to="/templates/upload">Upload a .docx template</Link>
          </>
        }
      />
      <div className="page">
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {!loading && templates.length === 0 && (
          <p className="muted">No templates yet — build one or upload a .docx to get started.</p>
        )}
        <div className="book-list">
          {templates.map((template) => (
            <div className="card book-row" key={template.id}>
              <div className="book-row-main">
                <h3>{template.name}</h3>
                <span className="muted">{KIND_LABELS[template.kind]} · {new Date(template.createdAt).toLocaleDateString()}</span>
              </div>
              <button type="button" className="danger" onClick={() => handleDelete(template)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
