import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocxTemplate } from "../../api/templates";
import { AppNav } from "../../components/AppNav";
import { PageHeader } from "../../components/PageHeader";
import "../Landing/landing.css";
import "../../styles/app.css";

export function UploadTemplatePage(): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!file) {
      setError("Please choose a .docx file.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await uploadDocxTemplate(name || file.name, file);
      navigate("/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the template");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page app-page">
      <AppNav trail={[{ label: "Templates", to: "/templates" }, { label: "Upload a .docx template" }]} />
      <PageHeader
        eyebrow="Upload a template"
        title="Use your own exam paper format"
        subtitle="Keep your school's exact layout — upload a .docx with placeholder tags, and Ved-Bhandar fills them in with the generated questions at export time."
      />
      <div className="page">
        <div className="card">
          <h2>Required placeholder tags</h2>
          <p className="muted">
            Your .docx must contain a loop tag <code>{"{#questions}"}</code> … <code>{"{/questions}"}</code> somewhere in the
            document. Inside the loop you can use <code>{"{index}"}</code>, <code>{"{stem}"}</code>, <code>{"{marks}"}</code> and{" "}
            <code>{"{bloom}"}</code> for each question. Outside the loop you can use <code>{"{school_name}"}</code>,{" "}
            <code>{"{subject}"}</code>, <code>{"{board}"}</code>, <code>{"{grade}"}</code>, <code>{"{date}"}</code> and{" "}
            <code>{"{total_marks}"}</code>. An answer key loop is also available as{" "}
            <code>{"{#answer_key}"}</code> … <code>{"{/answer_key}"}</code> with <code>{"{index}"}</code>, <code>{"{answer}"}</code>{" "}
            and <code>{"{explanation}"}</code>.
          </p>
        </div>

        <form className="card" onSubmit={handleSubmit} aria-label="Upload a .docx template">
          <h2>Upload file</h2>
          <label className="field">
            <span>Template name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Defaults to the file name" />
          </label>
          <label className="field">
            <span>.docx file</span>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Uploading…" : "Upload"}
          </button>
        </form>
      </div>
    </div>
  );
}
