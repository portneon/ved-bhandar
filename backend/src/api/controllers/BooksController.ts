import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { z } from "zod";
import { Book } from "../../domain/entities/Book";
import { BookIngestionService } from "../../application/services/BookIngestionService";
import { BookQueryService } from "../../application/services/BookQueryService";

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
  ) {}

  upload = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const { title, board, grade, subject } = req.body as Record<string, string | undefined>;
    if (!title || !board || !grade || !subject) {
      res.status(400).json({ error: "title, board, grade and subject are required" });
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

    const book = await this.ingestionService.upload({ title, board, grade, subject, buffer: file.buffer, chapterHints });
    res.status(202).json(this.toDto(book));
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const books = await this.queryService.listBooks();
    res.json(books.map((book) => this.toDto(book)));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const book = await this.queryService.getBook(req.params.id);
    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }
    res.json(this.toDto(book));
  };

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
