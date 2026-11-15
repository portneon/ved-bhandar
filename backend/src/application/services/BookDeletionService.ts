import { inject, injectable } from "tsyringe";
import { IFileStorage } from "../../domain/interfaces/IFileStorage";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository";
import { IChunkRepository } from "../../domain/interfaces/repositories/IChunkRepository";
import { IGenerationRepository } from "../../domain/interfaces/repositories/IGenerationRepository";
import { IQuestionBankRepository } from "../../domain/interfaces/repositories/IQuestionBankRepository";

@injectable()
export class BookDeletionService {
  constructor(
    @inject("IBookRepository") private readonly bookRepo: IBookRepository,
    @inject("IChunkRepository") private readonly chunkRepo: IChunkRepository,
    @inject("IGenerationRepository") private readonly generationRepo: IGenerationRepository,
    @inject("IQuestionBankRepository") private readonly questionBankRepo: IQuestionBankRepository,
    @inject("IFileStorage") private readonly fileStorage: IFileStorage,
  ) {}

  async deleteBook(bookId: string, userId: string): Promise<boolean> {
    const book = await this.bookRepo.findById(bookId, userId);
    if (!book) return false;

    await Promise.all([
      this.chunkRepo.deleteByBookId(bookId),
      this.generationRepo.deleteByBookId(bookId),
      this.questionBankRepo.deleteByBookId(bookId),
      this.fileStorage.deleteContainingDir(book.storagePath),
    ]);
    await this.bookRepo.delete(bookId);
    return true;
  }
}
