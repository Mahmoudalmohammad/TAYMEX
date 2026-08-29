import { fileURLToPath } from 'node:url';
import { PostgresMigrationRunner } from './migrations.js';
import { createNodePgPool } from './node-pg.js';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error('DATABASE_URL is required for database migration.');
  process.exitCode = 2;
} else {
  const pool = await createNodePgPool({
    connectionString,
    applicationName: 'taymex-migrator',
    max: 2,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    statementTimeoutMs: 120_000,
  });
  try {
    const directory = fileURLToPath(new URL('../migrations/', import.meta.url));
    const executed = await new PostgresMigrationRunner(pool).migrate(directory);
    process.stdout.write(JSON.stringify({ status: 'ok', executed }) + '\n');
  } finally {
    await pool.end();
  }
}
