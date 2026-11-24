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

/** Reported as the file transfers, so a caller can show real progress instead of a bare spinner. */
export interface UploadProgress {
  stage: "uploading" | "finishing";
  sentChunks: number;
  totalChunks: number;
}

// Vercel rejects request bodies over ~4.5MB, so files above this are split into
// chunks and sent as separate requests, then reassembled server-side (see
// backend's ChunkedUploadService). Most uploads stay below this and go in one shot.
const CHUNK_SIZE = 3 * 1024 * 1024;
const DIRECT_UPLOAD_LIMIT = 3.5 * 1024 * 1024;

export async function uploadBook(input: UploadBookInput, onProgress?: (progress: UploadProgress) => void): Promise<Book> {
  const metadata: Record<string, string> = {
    title: input.title,
    board: input.board,
    grade: input.grade,
    subject: input.subject,
  };
  if (input.chapterHints && input.chapterHints.length > 0) {
    metadata.chapters = JSON.stringify(input.chapterHints);
  }

  if (input.file.size <= DIRECT_UPLOAD_LIMIT) {
    onProgress?.({ stage: "uploading", sentChunks: 0, totalChunks: 1 });
    const form = new FormData();
    form.append("file", input.file);
    for (const [key, value] of Object.entries(metadata)) form.append(key, value);
    return api.post<Book>("/api/books", form);
  }

  const uploadId = crypto.randomUUID();
  const chunkCount = Math.ceil(input.file.size / CHUNK_SIZE);
  for (let index = 0; index < chunkCount; index++) {
    const chunk = input.file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
    const form = new FormData();
    form.append("chunk", chunk, `chunk-${index}`);
    form.append("uploadId", uploadId);
    form.append("index", String(index));
    await api.post<void>("/api/books/chunks", form);
    onProgress?.({ stage: "uploading", sentChunks: index + 1, totalChunks: chunkCount });
  }

  onProgress?.({ stage: "finishing", sentChunks: chunkCount, totalChunks: chunkCount });
  return api.post<Book>("/api/books", { ...metadata, uploadId, chunkCount: String(chunkCount) });
}
