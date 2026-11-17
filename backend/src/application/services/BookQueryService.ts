import { inject, injectable } from "tsyringe";
import { Book } from "../../domain/entities/Book.js";
import { QuestionBankEntry } from "../../domain/entities/QuestionBankEntry.js";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository.js";
import { IQuestionBankRepository } from "../../domain/interfaces/repositories/IQuestionBankRepository.js";

@injectable()
export class BookQueryService {
  constructor(
    @inject("IBookRepository") private readonly bookRepo: IBookRepository,
    @inject("IQuestionBankRepository") private readonly questionBankRepo: IQuestionBankRepository,
  ) {}

  listBooks(userId: string): Promise<Book[]> {
    return this.bookRepo.findAll(userId);
  }

  getBook(id: string, userId: string): Promise<Book | null> {
    return this.bookRepo.findById(id, userId);
  }

  listQuestionBank(bookId: string, userId: string, chapter?: number): Promise<QuestionBankEntry[]> {
    return this.questionBankRepo.findByBook(bookId, userId, chapter);
  }
}
