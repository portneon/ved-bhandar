import { inject, injectable } from "tsyringe";
import { MongoClient } from "mongodb";
import { ITransactionManager, TransactionContext } from "../../../domain/interfaces/ITransactionManager.js";

@injectable()
export class MongoTransactionManager implements ITransactionManager {
  constructor(@inject("MongoClient") private readonly client: MongoClient) {}

  async withTransaction<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    const session = this.client.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }
}
