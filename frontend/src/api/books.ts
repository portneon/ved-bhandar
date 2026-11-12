import { api } from "./client";
import { Book, ChapterRange } from "../types";

export function listBooks(): Promise<Book[]> {
  return api.get<Book[]>("/api/books");
}

export function getBook(id: string): Promise<Book> {
  return api.get<Book>(`/api/books/${id}`);
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
