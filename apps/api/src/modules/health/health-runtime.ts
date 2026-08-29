import { SystemClock } from '@taymex/foundation';
import { PostgresDatabase, checkPostgresReadiness, createNodePgPool } from '@taymex/data-postgres';
import { RuntimeHealthReporter, type HealthCheck } from '@taymex/observability';

let database: PostgresDatabase | null = null;
let initialization: Promise<PostgresDatabase> | null = null;

async function getDatabase(): Promise<PostgresDatabase> {
  if (database) return database;
  if (!initialization) {
    initialization = (async () => {
      const connectionString = process.env.DATABASE_URL?.trim();
      if (!connectionString) throw new Error('DATABASE_URL is not configured.');
      const pool = await createNodePgPool({
        connectionString,
        applicationName: 'taymex-api',
        max: integerEnv('DATABASE_POOL_MAX', 10, 1, 50),
        connectionTimeoutMillis: integerEnv('DATABASE_CONNECT_TIMEOUT_MS', 5_000, 250, 60_000),
        idleTimeoutMillis: integerEnv('DATABASE_IDLE_TIMEOUT_MS', 30_000, 1_000, 300_000),
        statementTimeoutMs: integerEnv('DATABASE_STATEMENT_TIMEOUT_MS', 15_000, 100, 300_000),
      });
      const created = new PostgresDatabase(pool);
      database = created;
      return created;
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

const postgresReadiness: HealthCheck = Object.freeze({
  name: 'postgresql',
  async check() {
    if (!process.env.DATABASE_URL?.trim()) return Object.freeze({ status: 'DOWN' as const, detail: 'database-not-configured' });
    try {
      return await checkPostgresReadiness(await getDatabase());
    } catch {
      return Object.freeze({ status: 'DOWN' as const, detail: 'database-unavailable' });
    }
  },
});

export const apiHealthReporter = new RuntimeHealthReporter(
  {
    service: 'taymex-api',
    version: process.env.APP_VERSION?.trim() || '0.0.0-private',
    environment: process.env.NODE_ENV?.trim() || 'development',
    buildRevision: process.env.BUILD_REVISION?.trim() || 'unavailable',
  },
  new SystemClock(),
  [postgresReadiness],
);

function integerEnv(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}
