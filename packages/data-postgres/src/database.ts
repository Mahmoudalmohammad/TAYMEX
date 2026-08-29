import { AsyncLocalStorage } from 'node:async_hooks';
import type {
  SqlConnection,
  SqlExecutor,
  SqlParameter,
  SqlPool,
  SqlQueryResult,
  TransactionOptions,
  TransactionalSqlExecutor,
} from './contracts.js';
import { classifySqlOperation, fingerprintSqlStatement, type SqlQueryObserver } from './performance.js';

const TRANSACTION_SQL = Object.freeze({
  'READ COMMITTED': 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED',
  'REPEATABLE READ': 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ',
  SERIALIZABLE: 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE',
});

export type PostgresDatabaseOptions = Readonly<{
  queryObserver?: SqlQueryObserver;
}>;

export class PostgresDatabase implements TransactionalSqlExecutor {
  readonly #transactionContext = new AsyncLocalStorage<SqlConnection>();
  readonly #queryObserver?: SqlQueryObserver;

  constructor(private readonly pool: SqlPool, options: PostgresDatabaseOptions = {}) {
    this.#queryObserver = options.queryObserver;
  }

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: readonly SqlParameter[] = [],
  ): Promise<SqlQueryResult<Row>> {
    const active = this.#transactionContext.getStore();
    const executor = active ?? this.pool;
    if (!this.#queryObserver) return executor.query<Row>(text, params);

    const observationBase = Object.freeze({
      operation: classifySqlOperation(text),
      fingerprint: fingerprintSqlStatement(text),
      parameterCount: params.length,
    });
    let result: SqlQueryResult<Row>;
    try {
      result = await executor.query<Row>(text, params);
    } catch (error) {
      this.#queryObserver.observe(Object.freeze({
        ...observationBase,
        rowCount: null,
        outcome: 'error' as const,
      }));
      throw error;
    }
    this.#queryObserver.observe(Object.freeze({
      ...observationBase,
      rowCount: result.rowCount,
      outcome: 'success' as const,
    }));
    return result;
  }

  async transaction<T>(work: (executor: SqlExecutor) => Promise<T>, options: TransactionOptions = {}): Promise<T> {
    const existing = this.#transactionContext.getStore();
    if (existing) return work(this);

    const connection = await this.pool.connect();
    let began = false;
    let destroyConnection = false;
    try {
      await connection.query('BEGIN');
      began = true;
      if (options.isolation) await connection.query(TRANSACTION_SQL[options.isolation]);
      if (options.readOnly) await connection.query('SET TRANSACTION READ ONLY');
      const result = await this.#transactionContext.run(connection, () => work(this));
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      if (began) {
        try {
          await connection.query('ROLLBACK');
        } catch {
          // Preserve the original failure and destroy the connection because its transaction state is unknown.
          destroyConnection = true;
        }
      }
      throw error;
    } finally {
      connection.release(destroyConnection);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
