import { TransactionContext } from "./ITransactionManager.js";

export interface IFileStorage {
  save(relativeKey: string, data: Buffer): Promise<string>;
  read(relativeKey: string): Promise<Buffer>;
  getAbsolutePath(relativeKey: string): string;
  /** Removes the directory containing `relativeKey` (e.g. a book's whole `<bookId>/` folder). */
  deleteContainingDir(relativeKey: string, ctx?: TransactionContext): Promise<void>;
}
