import type { TransactionalSqlExecutor } from './contracts.js';

export interface AtomicTransactionBoundary {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export function createAtomicTransactionBoundary(database: TransactionalSqlExecutor): AtomicTransactionBoundary {
  return Object.freeze({
    run<T>(work: () => Promise<T>): Promise<T> {
      return database.transaction(() => work());
    },
  });
}
