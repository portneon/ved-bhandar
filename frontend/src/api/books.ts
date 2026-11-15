import { api } from "./client";
import { Book, ChapterRange, GenerationSummary, QuestionBankEntry } from "../types";

export function listBooks(): Promise<Book[]> {
  return api.get<Book[]>("/api/books");
}

export function getBook(id: string): Promise<Book> {
  return api.get<Book>(`/api/books/${id}`);
}

export function deleteBook(id: string): Promise<void> {
  return api.delete<void>(`/api/books/${id}`);
}

export function listGenerationsForBook(bookId: string): Promise<GenerationSummary[]> {
  return api.get<GenerationSummary[]>(`/api/books/${bookId}/generations`);
}

export function listQuestionBank(bookId: string, chapter?: number): Promise<QuestionBankEntry[]> {
  const query = chapter !== undefined ? `?chapter=${chapter}` : "";
  return api.get<QuestionBankEntry[]>(`/api/books/${bookId}/question-bank${query}`);
}

export interface UploadBookInput {
  title: string;
  board: string;
  grade: string;
  subject: string;
  file: File;
  chapterHints?: ChapterRange[];
}

export function uploadBook(input: UploadBookInput): Promise<Book> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("title", input.title);
  form.append("board", input.board);
  form.append("grade", input.grade);
  form.append("subject", input.subject);
  if (input.chapterHints && input.chapterHints.length > 0) {
    form.append("chapters", JSON.stringify(input.chapterHints));
  }
  return api.post<Book>("/api/books", form);
}
