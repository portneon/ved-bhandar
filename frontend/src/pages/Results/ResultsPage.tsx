import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGeneration } from "../../api/generations";
import { Generation, QuestionType, isGenerationSettled } from "../../types";
import { usePolling } from "../../hooks/usePolling";
import { QuestionGroup } from "./QuestionGroup";
import { ExportButton } from "./ExportButton";

const TYPE_ORDER: QuestionType[] = ["mcq", "short_answer", "long_answer"];

export function ResultsPage(): JSX.Element {
  const { generationId } = useParams<{ generationId: string }>();
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!generationId) return;
    getGeneration(generationId)
      .then(setGeneration)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load results"));
  }, [generationId]);

  useEffect(refresh, [refresh]);

  const settled = generation ? isGenerationSettled(generation) : false;
  usePolling(refresh, 2000, !settled);

  if (!generation) {
    return (
      <div className="page">
        <p className="muted">{error ?? "Loading…"}</p>
      </div>
    );
  }

  let runningIndex = 1;

  return (
    <div className="page">
      <div className="results-header">
        <h1>Results</h1>
        <div className="results-header-actions">
          <span className="muted">
            {generation.tokenUsage.input + generation.tokenUsage.output} tokens used
          </span>
          <ExportButton generationId={generation.id} />
        </div>
      </div>

      {!settled && <p className="muted">Generating questions… this page updates automatically.</p>}

      {TYPE_ORDER.map((type) => {
        const questions = generation.questions.filter((question) => question.questionType === type);
        const group = (
          <QuestionGroup
            key={type}
            type={type}
            questions={questions}
            startIndex={runningIndex}
            generationId={generation.id}
            onChanged={refresh}
          />
        );
        runningIndex += questions.length;
        return group;
      })}
    </div>
  );
}
