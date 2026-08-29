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

const TRANSACTION_SQL = Object.freeze({
  'READ COMMITTED': 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED',
  'REPEATABLE READ': 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ',
  SERIALIZABLE: 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE',
});

export class PostgresDatabase implements TransactionalSqlExecutor {
  readonly #transactionContext = new AsyncLocalStorage<SqlConnection>();

  constructor(private readonly pool: SqlPool) {}

  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: readonly SqlParameter[] = [],
  ): Promise<SqlQueryResult<Row>> {
    const active = this.#transactionContext.getStore();
    return (active ?? this.pool).query<Row>(text, params);
  }

  async transaction<T>(work: (executor: SqlExecutor) => Promise<T>, options: TransactionOptions = {}): Promise<T> {
    const existing = this.#transactionContext.getStore();
    if (existing) return work(this);

    const connection = await this.pool.connect();
    let began = false;
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
          // Preserve the original failure. Connection disposal prevents reuse of unknown state.
        }
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
