import { inject, injectable } from "tsyringe";
import { IFileStorage } from "../../domain/interfaces/IFileStorage.js";
import { ITransactionManager } from "../../domain/interfaces/ITransactionManager.js";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository.js";
import { IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository.js";
import { IGenerationRepository } from "../../domain/interfaces/repositories/IGenerationRepository.js";
import { IQuestionBankRepository } from "../../domain/interfaces/repositories/IQuestionBankRepository.js";

@injectable()
export class BookDeletionService {
  constructor(
    @inject("IBookRepository") private readonly bookRepo: IBookRepository,
    @inject("IChunkRepository") private readonly chunkRepo: IChunkRepository,
    @inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository,
    @inject("IQuestionBankRepository") private readonly questionBankRepo: IQuestionBankRepository,
    @inject("IFileStorage") private readonly fileStorage: IFileStorage,
    @inject("ITransactionManager") private readonly transactionManager: ITransactionManager,
  ) {}

  async deleteBook(bookId: string, userId: string): Promise<boolean> {
    const book = await this.bookRepo.findById(bookId, userId);
    if (!book) return false;

    // All-or-nothing: a partial failure here must not leave orphaned chunks/generations/files
    // or a book doc with nothing behind it, so the whole cascade runs as one transaction.
    // A MongoDB session only allows one operation in flight at a time, so these run
    // sequentially rather than via Promise.all.
    await this.transactionManager.withTransaction(async (ctx) => {
      await this.chunkRepo.deleteByBookId(bookId, ctx);
      await this.generationRepo.deleteByBookId(bookId, ctx);
      await this.questionBankRepo.deleteByBookId(bookId, ctx);
      await this.fileStorage.deleteContainingDir(book.storagePath, ctx);
      await this.bookRepo.delete(bookId, ctx);
    });

    return true;
  }
}
