import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBook, listGenerationsForBook } from "../../api/books";
import { createGeneration } from "../../api/generations";
import { Book, Difficulty, GenerationItem, GenerationSummary, PageSplitRange } from "../../types";
import { AppNav } from "../../components/AppNav";
import { PageHeader } from "../../components/PageHeader";
import { ChapterPicker } from "./ChapterPicker";
import { SlotRows } from "./SlotRows";
import { PageSplitSlider } from "./PageSplitSlider";
import { SettingsSummary } from "./SettingsSummary";
import { GenerationHistory } from "./GenerationHistory";
import { QuestionBank } from "./QuestionBank";
import "../Landing/landing.css";
import "../../styles/app.css";

export function ConfigurePage(): JSX.Element {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [history, setHistory] = useState<GenerationSummary[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [topic, setTopic] = useState("");
  const [items, setItems] = useState<GenerationItem[]>([{ type: "mcq", bloom: 1, count: 4, marks: 1 }]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [pageSplit, setPageSplit] = useState<PageSplitRange[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    getBook(bookId)
      .then((loaded) => {
        setBook(loaded);
        setSelectedChapters(loaded.chapters.map((c) => c.no));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load book"));
    listGenerationsForBook(bookId)
      .then(setHistory)
      .catch(() => undefined);
  }, [bookId]);

  const canGenerate = Boolean(bookId) && selectedChapters.length > 0 && items.length > 0;

  const handleGenerate = async (): Promise<void> => {
    if (!bookId) return;
    setGenerating(true);
    setError(null);
    try {
      const { generationId } = await createGeneration({
        bookId,
        chapters: selectedChapters,
        topic: topic.trim() ? topic.trim() : undefined,
        pageSplit: splitEnabled && pageSplit.length > 0 ? pageSplit : undefined,
        items,
        difficulty,
      });
      navigate(`/results/${generationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start generation");
      setGenerating(false);
    }
  };

  if (!book) {
    return (
      <div className="landing-page app-page">
        <AppNav />
        <div className="page">
          <p className="muted">{error ?? "Loading book…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page app-page">
      <AppNav trail={[{ label: book.title }]} />
      <PageHeader
        eyebrow="Step 2 of 3 · Set the mix"
        title={book.title}
        subtitle={`Choose how many MCQs, short and long answers you need, their Bloom's level and marks, for ${book.board} · Class ${book.grade} · ${book.subject}.`}
      />
      <div className="page">
        <GenerationHistory generations={history} />
        <ChapterPicker
          chapters={book.chapters}
          selected={selectedChapters}
          onChange={setSelectedChapters}
          topic={topic}
          onTopicChange={setTopic}
        />
        <SlotRows items={items} onChange={setItems} difficulty={difficulty} onDifficultyChange={setDifficulty} />
        <PageSplitSlider enabled={splitEnabled} onToggle={setSplitEnabled} ranges={pageSplit} onChange={setPageSplit} />

        {error && <p className="error" role="alert">{error}</p>}

        <SettingsSummary items={items} canGenerate={canGenerate} generating={generating} onGenerate={handleGenerate} />

        <QuestionBank bookId={book.id} chapters={book.chapters} />
      </div>
    </div>
  );
}
