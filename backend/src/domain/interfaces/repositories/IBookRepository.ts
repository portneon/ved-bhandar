import { Book, BookStatus, ChapterRange, TokenUsage } from "../../entities/Book";

export interface BookPatch {
  status?: BookStatus;
  progress?: number;
  pages?: number;
  chapters?: ChapterRange[];
  failureReason?: string | null;
}

export interface IBookRepository {
  create(book: Book): Promise<Book>;
  findById(id: string, userId: string): Promise<Book | null>;
  findAll(userId: string): Promise<Book[]>;
  update(id: string, patch: BookPatch): Promise<void>;
  addTokenUsage(id: string, usage: TokenUsage): Promise<void>;
  delete(id: string): Promise<void>;
}
