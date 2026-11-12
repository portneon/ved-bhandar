import { inject, injectable } from "tsyringe";
import { Collection, Db } from "mongodb";
import { Book, BookStatus, ChapterRange, TokenUsage } from "../../../domain/entities/Book";
import { BookPatch, IBookRepository } from "../../../domain/interfaces/repositories/IBookRepository";

interface BookDoc {
  _id: string;
  title: string;
  board: string;
  grade: string;
  subject: string;
  storagePath: string;
  status: BookStatus;
  progress: number;
  pages: number;
  chapters: ChapterRange[];
  embeddingModel: string;
  tokenUsage: TokenUsage;
  failureReason: string | null;
  createdAt: Date;
}

@injectable()
export class MongoBookRepository implements IBookRepository {
  private readonly collection: Collection<BookDoc>;

  constructor(@inject("Db") db: Db) {
    this.collection = db.collection<BookDoc>("books");
  }

  async create(book: Book): Promise<Book> {
    await this.collection.insertOne(this.toDoc(book));
    return book;
  }

  async findById(id: string): Promise<Book | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<Book[]> {
    const docs = await this.collection.find().sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async update(id: string, patch: BookPatch): Promise<void> {
    await this.collection.updateOne({ _id: id }, { $set: patch });
  }

  async addTokenUsage(id: string, usage: TokenUsage): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      { $inc: { "tokenUsage.input": usage.input, "tokenUsage.output": usage.output } },
    );
  }

  private toDoc(book: Book): BookDoc {
    return {
      _id: book.id,
      title: book.title,
      board: book.board,
      grade: book.grade,
      subject: book.subject,
      storagePath: book.storagePath,
      status: book.status,
      progress: book.progress,
      pages: book.pages,
      chapters: book.chapters,
      embeddingModel: book.embeddingModel,
      tokenUsage: book.tokenUsage,
      failureReason: book.failureReason,
      createdAt: book.createdAt,
    };
  }

  private toDomain(doc: BookDoc): Book {
    return new Book(
      doc._id,
      doc.title,
      doc.board,
      doc.grade,
      doc.subject,
      doc.storagePath,
      doc.status,
      doc.progress,
      doc.pages,
      doc.chapters,
      doc.embeddingModel,
      doc.tokenUsage,
      doc.failureReason,
      doc.createdAt,
    );
  }
}
