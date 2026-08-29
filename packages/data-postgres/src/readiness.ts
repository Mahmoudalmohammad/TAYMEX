import type { SqlExecutor } from './contracts.js';

export type PostgresReadinessResult = Readonly<{ status: 'UP' | 'DOWN'; detail?: string }>;

export async function checkPostgresReadiness(executor: SqlExecutor): Promise<PostgresReadinessResult> {
  try {
    const result = await executor.query<{ ok: number }>('SELECT 1::int AS ok');
    return result.rows[0]?.ok === 1
      ? Object.freeze({ status: 'UP' })
      : Object.freeze({ status: 'DOWN', detail: 'unexpected-database-response' });
  } catch {
    return Object.freeze({ status: 'DOWN', detail: 'database-unavailable' });
  }
}
