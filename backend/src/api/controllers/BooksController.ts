import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { z } from "zod";
import { Book } from "../../domain/entities/Book.js";
import { Generation } from "../../domain/entities/Generation.js";
import { QuestionBankEntry } from "../../domain/entities/QuestionBankEntry.js";
import { BookIngestionService } from "../../application/services/BookIngestionService.js";
import { BookQueryService } from "../../application/services/BookQueryService.js";
import { BookDeletionService } from "../../application/services/BookDeletionService.js";
import { GenerationService } from "../../application/services/GenerationService.js";
import { ChunkedUploadService } from "../../application/services/ChunkedUploadService.js";

const chapterHintSchema = z.object({
  no: z.number().int(),
  title: z.string(),
  pageStart: z.number().int(),
  pageEnd: z.number().int(),
});

@injectable()
export class BooksController {
  constructor(
    @inject(BookIngestionService) private readonly ingestionService: BookIngestionService,
    @inject(BookQueryService) private readonly queryService: BookQueryService,
    @inject(BookDeletionService) private readonly deletionService: BookDeletionService,
    @inject(GenerationService) private readonly generationService: GenerationService,
    @inject(ChunkedUploadService) private readonly chunkedUploadService: ChunkedUploadService,
  ) {}

  // Vercel rejects request bodies over ~4.5MB, so large PDFs arrive pre-split: the
  // frontend POSTs each chunk here first, then calls `upload` with uploadId/chunkCount
  // instead of a file so it can be reassembled from the chunks (see ChunkedUploadService).
  uploadChunk = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    const { uploadId, index } = req.body as Record<string, string | undefined>;
    if (!file || !uploadId || index === undefined || Number.isNaN(Number(index))) {
      res.status(400).json({ error: "uploadId, index and a chunk file are required" });
      return;
    }
    await this.chunkedUploadService.saveChunk(uploadId, Number(index), file.buffer);
    res.status(204).end();
  };

  upload = async (req: Request, res: Response): Promise<void> => {
    const { title, board, grade, subject, uploadId, chunkCount } = req.body as Record<string, string | undefined>;
    if (!title || !board || !grade || !subject) {
      res.status(400).json({ error: "title, board, grade and subject are required" });
      return;
    }

    let buffer: Buffer;
    if (req.file) {
      buffer = req.file.buffer;
    } else if (uploadId && chunkCount) {
      buffer = await this.chunkedUploadService.assembleAndCleanup(uploadId, Number(chunkCount));
    } else {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    let chapterHints;
    if (req.body.chapters) {
      try {
        chapterHints = z.array(chapterHintSchema).parse(JSON.parse(req.body.chapters));
      } catch {
        res.status(400).json({ error: "chapters must be a JSON array of {no,title,pageStart,pageEnd}" });
        return;
      }
    }

    const book = await this.ingestionService.upload({
      userId: req.user!.id,
      title,
      board,
      grade,
      subject,
      buffer,
      chapterHints,
    });
    res.status(202).json(this.toDto(book));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const books = await this.queryService.listBooks(req.user!.id);
    res.json(books.map((book) => this.toDto(book)));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const book = await this.queryService.getBook(req.params.id, req.user!.id);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    res.json(this.toDto(book));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const deleted = await this.deletionService.deleteBook(req.params.id, req.user!.id);
    if (!deleted) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    res.status(204).end();
  };

  listGenerations = async (req: Request, res: Response): Promise<void> => {
    const book = await this.queryService.getBook(req.params.id, req.user!.id);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    const generations = await this.generationService.listForBook(req.params.id, req.user!.id);
    res.json(generations.map((generation) => this.generationSummaryToDto(generation)));
  };

  questionBank = async (req: Request, res: Response): Promise<void> => {
    const book = await this.queryService.getBook(req.params.id, req.user!.id);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    const chapterParam = req.query.chapter;
    const chapter = typeof chapterParam === "string" && chapterParam.trim() !== "" ? Number(chapterParam) : undefined;
    if (chapter !== undefined && Number.isNaN(chapter)) {
      res.status(400).json({ error: "chapter must be a number" });
      return;
    }
    const entries = await this.queryService.listQuestionBank(req.params.id, req.user!.id, chapter);
    res.json(entries.map((entry) => this.questionBankEntryToDto(entry)));
  };

  private questionBankEntryToDto(entry: QuestionBankEntry) {
    return {
      id: entry.id,
      bookId: entry.bookId,
      generationId: entry.generationId,
      slotId: entry.slotId,
      chapters: entry.chapters,
      pages: entry.pages,
      questionType: entry.questionType,
      bloom: entry.bloom,
      marks: entry.marks,
      difficulty: entry.difficulty,
      stem: entry.stem,
      options: entry.options,
      answer: entry.answer,
      explanation: entry.explanation,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private generationSummaryToDto(generation: Generation) {
    const total = generation.questions.length;
    const accepted = generation.questions.filter((q) => q.status === "accepted").length;
    const exportable = generation.questions.filter(
      (q) => q.stem !== null && (q.status === "draft" || q.status === "accepted"),
    ).length;
    return {
      id: generation.id,
      bookId: generation.bookId,
      settings: generation.settings,
      tokenUsage: generation.tokenUsage,
      createdAt: generation.createdAt,
      totalQuestions: total,
      acceptedQuestions: accepted,
      exportableQuestions: exportable,
    };
  }

  private toDto(book: Book) {
    return {
      id: book.id,
      title: book.title,
      board: book.board,
      grade: book.grade,
      subject: book.subject,
      status: book.status,
      progress: book.progress,
      pages: book.pages,
      chapters: book.chapters,
      tokenUsage: book.tokenUsage,
      failureReason: book.failureReason,
      createdAt: book.createdAt,
    };
  }
}
