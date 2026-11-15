import { GeneratedQuestion, QuestionType } from "../../types";
import { QuestionCard } from "./QuestionCard";

const LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  short_answer: "Short Answer",
  long_answer: "Long Answer",
};

interface QuestionGroupProps {
  type: QuestionType;
  questions: GeneratedQuestion[];
  startIndex: number;
  generationId: string;
  onChanged: () => void;
}

export function QuestionGroup({ type, questions, startIndex, generationId, onChanged }: QuestionGroupProps): JSX.Element | null {
  if (questions.length === 0) return null;
  return (
    <section className="exam-section">
      <h2 className="exam-section-title">{LABELS[type]}</h2>
      <div className="question-list">
        {questions.map((question, i) => (
          <QuestionCard
            key={question.slotId}
            question={question}
            index={startIndex + i}
            generationId={generationId}
            onChanged={onChanged}
          />
        ))}
      </div>
    </section>
  );
}
