/** Opaque handle threaded through repository calls that must share one transaction; domain code never inspects it. */
export type TransactionContext = unknown;

export interface ITransactionManager {
  withTransaction<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
