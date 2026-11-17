import { inject, injectable } from "tsyringe";
import { randomUUID } from "crypto";
import { Book, ChapterRange } from "../../domain/entities/Book.js";
import { Chunk } from "../../domain/entities/Chunk.js";
import { IFileStorage } from "../../domain/interfaces/IFileStorage.js";
import { IPdfProcessor, PdfLine } from "../../domain/interfaces/IPdfProcessor.js";
import { IEmbeddingProvider } from "../../domain/interfaces/IEmbeddingProvider.js";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository.js";
import { IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository.js";
import { stripHeadersFooters } from "../ingestion/HeaderFooterStripper.js";
import { detectSections } from "../ingestion/SectionDetector.js";
import { buildChunks } from "../ingestion/Chunker.js";
import { ChunkTaggingService } from "./ChunkTaggingService.js";

const MIN_PAGE_CHARS = 20;
const EMBEDDING_BATCH_SIZE = 32;

export interface UploadInput {
  userId: string;
  title: string;
  board: string;
  grade: string;
  subject: string;
  buffer: Buffer;
  chapterHints?: ChapterRange[];
}

@injectable()
export class BookIngestionService {
  constructor(
    @inject("IFileStorage") private readonly fileStorage: IFileStorage,
    @inject("IPdfProcessor") private readonly pdfProcessor: IPdfProcessor,
    @inject("IEmbeddingProvider") private readonly embeddingProvider: IEmbeddingProvider,
    @inject("IBookRepository") private readonly bookRepo: IBookRepository,
    @inject("IChunkRepository") private readonly chunkRepo: IChunkRepository,
    @inject(ChunkTaggingService) private readonly taggingService: ChunkTaggingService,
  ) {}

  async upload(input: UploadInput): Promise<Book> {
    const bookId = randomUUID();
    const storageKey = `${bookId}/original.pdf`;
    await this.fileStorage.save(storageKey, input.buffer);

    const book = new Book(
      bookId,
      input.userId,
      input.title,
      input.board,
      input.grade,
      input.subject,
      storageKey,
      "uploaded",
      0,
      0,
      input.chapterHints ?? [],
      process.env.EMBEDDING_MODEL ?? "Xenova/bge-small-en-v1.5",
      { input: 0, output: 0 },
      null,
      new Date(),
    );
    await this.bookRepo.create(book);

    this.processInBackground(book, input.buffer, input.chapterHints).catch((error) => {
      console.error(`Ingestion failed for book ${bookId}`, error);
      void this.bookRepo.update(bookId, {
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Ingestion failed",
      });
    });

    return book;
  }

  private async processInBackground(book: Book, buffer: Buffer, chapterHints?: ChapterRange[]): Promise<void> {
    const bookId = book.id;
    await this.bookRepo.update(bookId, { status: "parsing", progress: 0 });

    const pageCount = await this.pdfProcessor.getPageCount(buffer);
    const pages: PdfLine[][] = [];
    let lastProgress = -1;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const lines = await this.pdfProcessor.extractStructuredPage(buffer, pageNumber);
      const totalChars = lines.reduce((sum, line) => sum + line.text.length, 0);
      if (totalChars < MIN_PAGE_CHARS) {
        await this.bookRepo.update(bookId, { status: "failed", failureReason: "needs OCR" });
        return;
      }
      pages.push(lines);

      const progress = Math.round((pageNumber / pageCount) * 25);
      if (progress !== lastProgress) {
        await this.bookRepo.update(bookId, { progress });
        lastProgress = progress;
      }
    }

    const strippedPages = stripHeadersFooters(pages);
    const sections = detectSections(strippedPages, chapterHints);
    const { chunks: chunkDrafts } = buildChunks(bookId, sections);

    const finalChapters: ChapterRange[] =
      chapterHints && chapterHints.length > 0
        ? chapterHints
        : [{ no: 1, title: book.title, pageStart: 1, pageEnd: pageCount }];

    const chunks: Chunk[] = chunkDrafts.map(
      (draft) =>
        new Chunk(
          randomUUID(),
          draft.bookId,
          draft.chapter,
          draft.sectionPath,
          draft.sectionTitle,
          draft.page,
          draft.pageEnd,
          draft.order,
          draft.text,
          "other",
          1,
          [],
          "",
          0,
          null,
          null,
          null,
          null,
        ),
    );
    await this.chunkRepo.insertMany(chunks);
    await this.bookRepo.update(bookId, { pages: pageCount, chapters: finalChapters, status: "tagging", progress: 40 });

    const sectionGroups = this.groupBySection(chunks);
    for (let i = 0; i < sectionGroups.length; i++) {
      const group = sectionGroups[i];
      const usage = await this.taggingService.tagSection({
        subject: book.subject,
        grade: book.grade,
        chapter: group[0].chapter,
        sectionPath: group[0].sectionPath,
        sectionTitle: group[0].sectionTitle,
        chunks: group,
      });
      await this.bookRepo.addTokenUsage(bookId, usage);
      await this.bookRepo.update(bookId, { progress: 40 + Math.round(((i + 1) / sectionGroups.length) * 45) });
    }

    await this.bookRepo.update(bookId, { status: "embedding", progress: 85 });

    const taggedChunks = await this.chunkRepo.findByBookId(bookId);
    for (let i = 0; i < taggedChunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = taggedChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const vectors = await this.embeddingProvider.embed(batch.map((chunk) => `${chunk.sectionTitle}: ${chunk.text}`));
      for (let j = 0; j < batch.length; j++) {
        await this.chunkRepo.applyEmbedding(batch[j].id, vectors[j]);
      }
      const progress = 85 + Math.round(((i + batch.length) / taggedChunks.length) * 13);
      await this.bookRepo.update(bookId, { progress });
    }

    await this.bookRepo.update(bookId, { status: "ready", progress: 100 });
  }

  private groupBySection(chunks: Chunk[]): Chunk[][] {
    const bySectionKey = new Map<string, Chunk[]>();
    for (const chunk of chunks) {
      const key = `${chunk.chapter}|${chunk.sectionPath}`;
      const group = bySectionKey.get(key) ?? [];
      group.push(chunk);
      bySectionKey.set(key, group);
    }
    return [...bySectionKey.values()];
  }
}
