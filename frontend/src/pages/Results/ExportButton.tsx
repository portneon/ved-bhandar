import { useEffect, useState } from "react";
import { downloadFile } from "../../api/client";
import { exportPath } from "../../api/generations";
import { listTemplates } from "../../api/templates";
import { Template } from "../../types";

export function ExportButton({ generationId }: { generationId: string }): JSX.Element {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => undefined);
  }, []);

  const handleExport = async (templateId?: string): Promise<void> => {
    const key = templateId ?? "default";
    setDownloading(key);
    setError(null);
    try {
      await downloadFile(exportPath(generationId, templateId), "questions.pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="export-buttons">
      <button type="button" onClick={() => handleExport()} disabled={downloading !== null}>
        {downloading === "default" ? "Exporting…" : "Export PDF"}
      </button>
      {templates.map((template) => (
        <button
          type="button"
          key={template.id}
          className="secondary"
          onClick={() => handleExport(template.id)}
          disabled={downloading !== null}
        >
          {downloading === template.id ? "Exporting…" : `Export: ${template.name}`}
        </button>
      ))}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}
