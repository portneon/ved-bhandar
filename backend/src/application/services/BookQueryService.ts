import { inject, injectable } from "tsyringe";
import { Book } from "../../domain/entities/Book";
import { IBookRepository } from "../../domain/interfaces/repositories/IBookRepository";

@injectable()
export class BookQueryService {
  constructor(@inject("IBookRepository") private readonly bookRepo: IBookRepository) {}

  listBooks(): Promise<Book[]> {
    return this.bookRepo.findAll();
  }

  getBook(id: string): Promise<Book | null> {
    return this.bookRepo.findById(id);
  }
}
