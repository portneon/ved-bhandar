import { exportUrl } from "../../api/generations";

export function ExportButton({ generationId }: { generationId: string }): JSX.Element {
  return (
    <a className="button-link" href={exportUrl(generationId)} target="_blank" rel="noreferrer">
      Export PDF
    </a>
  );
}
