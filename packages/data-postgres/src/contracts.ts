export type SqlParameter = string | number | boolean | bigint | Date | Buffer | null | readonly SqlParameter[];

export type SqlQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> = Readonly<{
  rows: readonly Row[];
  rowCount: number;
}>;

export interface SqlExecutor {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: readonly SqlParameter[],
  ): Promise<SqlQueryResult<Row>>;
}

export interface SqlConnection extends SqlExecutor {
  release(destroy?: boolean): void;
}

export interface SqlPool extends SqlExecutor {
  connect(): Promise<SqlConnection>;
  end(): Promise<void>;
}

export const TRANSACTION_ISOLATION_LEVELS = [
  'READ COMMITTED',
  'REPEATABLE READ',
  'SERIALIZABLE',
] as const;
export type TransactionIsolation = (typeof TRANSACTION_ISOLATION_LEVELS)[number];

export type TransactionOptions = Readonly<{
  isolation?: TransactionIsolation;
  readOnly?: boolean;
}>;

export interface TransactionalSqlExecutor extends SqlExecutor {
  transaction<T>(work: (executor: SqlExecutor) => Promise<T>, options?: TransactionOptions): Promise<T>;
}
