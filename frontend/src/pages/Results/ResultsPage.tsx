import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGeneration } from "../../api/generations";
import { Generation, QuestionType, isGenerationSettled, willIncludeInPdfExport } from "../../types";
import { usePolling } from "../../hooks/usePolling";
import { AppNav } from "../../components/AppNav";
import { PageHeader } from "../../components/PageHeader";
import { QuestionGroup } from "./QuestionGroup";
import { AddQuestionForm } from "./AddQuestionForm";
import { ExportButton } from "./ExportButton";
import "../Landing/landing.css";
import "../../styles/app.css";

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
      <div className="landing-page app-page">
        <AppNav />
        <div className="page">
          <p className="muted">{error ?? "Loading…"}</p>
        </div>
      </div>
    );
  }

  let runningIndex = 1;
  // Slots that couldn't produce a valid question even after the backend's automatic retries are left out of
  // the customer-facing paper entirely — there's nothing actionable for them to do about an internal rejection
  // reason, so the review page never mentions it.
  const visibleQuestions = generation.questions.filter(
    (question) => question.status !== "failed" && question.status !== "no_candidates",
  );
  const exportableCount = visibleQuestions.filter(willIncludeInPdfExport).length;

  return (
    <div className="landing-page app-page">
      <AppNav trail={[{ label: "Configure", to: `/configure/${generation.bookId}` }, { label: "Results" }]} />
      <PageHeader
        eyebrow="Step 3 of 3 · Review & export"
        title="Review & export"
        subtitle="Every question below is exactly what will be exported to your PDF. Accept, edit or reject a question and the exported paper updates with it — rejected questions never make it into the file."
        actions={
          <>
            <span className="export-summary">
              {exportableCount} of {visibleQuestions.length} question{visibleQuestions.length === 1 ? "" : "s"}{" "}
              will be in the PDF
            </span>
            <span className="export-summary">
              {generation.tokenUsage.input + generation.tokenUsage.output} tokens used
            </span>
            <ExportButton generationId={generation.id} />
          </>
        }
      />

      <div className="page">
        {!settled && <p className="muted">Generating questions… this page updates automatically.</p>}

        <div className="exam-paper">
          {TYPE_ORDER.map((type) => {
            const questions = visibleQuestions.filter((question) => question.questionType === type);
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

          <AddQuestionForm generationId={generation.id} onAdded={refresh} />
        </div>
      </div>
    </div>
  );
}
