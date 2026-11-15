import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBuilderTemplate } from "../../api/templates";
import { AppNav } from "../../components/AppNav";
import { PageHeader } from "../../components/PageHeader";
import "../Landing/landing.css";
import "../../styles/app.css";

export function TemplateBuilderPage(): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [showBloom, setShowBloom] = useState(true);
  const [showMarks, setShowMarks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createBuilderTemplate(name, { schoolName, headerText, footerText, showBloom, showMarks });
      navigate("/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the template");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page app-page">
      <AppNav trail={[{ label: "Templates", to: "/templates" }, { label: "Build a template" }]} />
      <PageHeader
        eyebrow="Build a template"
        title="Design your question paper layout"
        subtitle="Set the branding and what shows up on every exported paper. You can build as many templates as you like and pick one at export time."
      />
      <div className="page">
        <form className="card" onSubmit={handleSubmit} aria-label="Build a question paper template">
          <h2>Template details</h2>
          <div className="field-grid">
            <label className="field">
              <span>Template name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mid-term exam format" required />
            </label>
            <label className="field">
              <span>School / institute name</span>
              <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Shown as the paper's title" />
            </label>
          </div>
          <label className="field">
            <span>Header text</span>
            <input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="e.g. Mid-Term Examination, 2026 — Time: 2 hours"
            />
          </label>
          <label className="field">
            <span>Footer text</span>
            <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="e.g. All the best!" />
          </label>

          <div className="toggle-row">
            <input type="checkbox" id="showBloom" checked={showBloom} onChange={(e) => setShowBloom(e.target.checked)} />
            <label htmlFor="showBloom">Show each question&apos;s Bloom&apos;s level</label>
          </div>
          <div className="toggle-row">
            <input type="checkbox" id="showMarks" checked={showMarks} onChange={(e) => setShowMarks(e.target.checked)} />
            <label htmlFor="showMarks">Show each question&apos;s marks</label>
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save template"}
          </button>
        </form>
      </div>
    </div>
  );
}
