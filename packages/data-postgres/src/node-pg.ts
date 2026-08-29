import type { SqlConnection, SqlParameter, SqlPool, SqlQueryResult } from './contracts.js';

export type NodePgPoolOptions = Readonly<{
  connectionString: string;
  max?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  statementTimeoutMs?: number;
  applicationName?: string;
}>;

type PgSingleQueryResult = Readonly<{ rows: readonly Record<string, unknown>[]; rowCount: number | null }>;
type PgQueryResult = PgSingleQueryResult | readonly PgSingleQueryResult[];
type PgClientLike = Readonly<{
  query(text: string, values?: readonly unknown[]): Promise<PgQueryResult>;
  release(destroy?: boolean): void;
}>;
type PgPoolLike = Readonly<{
  query(text: string, values?: readonly unknown[]): Promise<PgQueryResult>;
  connect(): Promise<PgClientLike>;
  end(): Promise<void>;
}>;
type PgModule = Readonly<{ Pool: new (config: Record<string, unknown>) => PgPoolLike }>;

export async function createNodePgPool(options: NodePgPoolOptions): Promise<SqlPool> {
  const connectionString = requireConnectionString(options.connectionString);
  const specifier = 'pg';
  const module = (await import(specifier)) as unknown as PgModule;
  const pool = new module.Pool({
    connectionString,
    max: boundedInteger(options.max ?? 10, 'max', 1, 50),
    connectionTimeoutMillis: boundedInteger(options.connectionTimeoutMillis ?? 5_000, 'connectionTimeoutMillis', 100, 60_000),
    idleTimeoutMillis: boundedInteger(options.idleTimeoutMillis ?? 30_000, 'idleTimeoutMillis', 1_000, 300_000),
    statement_timeout: boundedInteger(options.statementTimeoutMs ?? 15_000, 'statementTimeoutMs', 100, 120_000),
    application_name: options.applicationName?.trim() || 'taymex-api',
  });
  return new NodePgPoolAdapter(pool);
}

class NodePgPoolAdapter implements SqlPool {
  constructor(private readonly pool: PgPoolLike) {}

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: readonly SqlParameter[] = [],
  ): Promise<SqlQueryResult<Row>> {
    return normalizeResult<Row>(await this.pool.query(text, params));
  }

  async connect(): Promise<SqlConnection> {
    return new NodePgConnectionAdapter(await this.pool.connect());
  }

  end(): Promise<void> {
    return this.pool.end();
  }
}

class NodePgConnectionAdapter implements SqlConnection {
  #released = false;

  constructor(private readonly client: PgClientLike) {}

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: readonly SqlParameter[] = [],
  ): Promise<SqlQueryResult<Row>> {
    if (this.#released) throw new Error('PostgreSQL connection has already been released.');
    return normalizeResult<Row>(await this.client.query(text, params));
  }

  release(): void {
    if (this.#released) return;
    this.#released = true;
    this.client.release();
  }
}

function normalizeResult<Row extends Record<string, unknown>>(result: PgQueryResult): SqlQueryResult<Row> {
  const normalized: PgSingleQueryResult | undefined = Array.isArray(result)
    ? result.at(-1)
    : result as PgSingleQueryResult;
  if (!normalized) return Object.freeze({ rows: Object.freeze([]), rowCount: 0 });
  return Object.freeze({
    rows: Object.freeze(normalized.rows as readonly Row[]),
    rowCount: normalized.rowCount ?? normalized.rows.length,
  });
}

function requireConnectionString(value: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('PostgreSQL connectionString is required.');
  return value.trim();
}

function boundedInteger(value: number, field: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${field} must be between ${min} and ${max}.`);
  return value;
}
