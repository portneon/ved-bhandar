import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBook } from "../../api/books";
import { createGeneration } from "../../api/generations";
import { Book, Difficulty, GenerationItem, PageSplitRange } from "../../types";
import { ChapterPicker } from "./ChapterPicker";
import { SlotRows } from "./SlotRows";
import { PageSplitSlider } from "./PageSplitSlider";
import { SettingsSummary } from "./SettingsSummary";

export function ConfigurePage(): JSX.Element {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
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
      <div className="page">
        <p className="muted">{error ?? "Loading book…"}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{book.title}</h1>
      <p className="muted">
        {book.board} · Class {book.grade} · {book.subject}
      </p>

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
    </div>
  );
}
