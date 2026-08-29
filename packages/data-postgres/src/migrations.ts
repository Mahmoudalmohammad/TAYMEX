import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type { SqlConnection, SqlPool } from './contracts.js';

const MIGRATION_FILE = /^([0-9]{4,})_[a-z0-9][a-z0-9_-]*\.sql$/u;
const MIGRATION_LOCK_KEY = 814_202_604;

export type MigrationFile = Readonly<{
  version: string;
  fileName: string;
  checksum: string;
  sql: string;
}>;

type AppliedMigration = Readonly<{
  version: string;
  fileName: string;
  checksum: string;
}>;

export async function loadMigrations(directory: string): Promise<readonly MigrationFile[]> {
  const root = resolve(directory);
  const allNames = await readdir(root);
  const invalidSql = allNames.filter((name) => name.endsWith('.sql') && !MIGRATION_FILE.test(name)).sort();
  if (invalidSql.length) {
    throw new Error(`Invalid migration filename(s): ${invalidSql.join(', ')}`);
  }
  const names = allNames.filter((name) => MIGRATION_FILE.test(name)).sort();
  const migrations: MigrationFile[] = [];
  const seen = new Set<string>();
  for (const fileName of names) {
    const match = MIGRATION_FILE.exec(fileName);
    if (!match?.[1]) throw new Error(`Invalid migration filename: ${fileName}`);
    const version = match[1];
    if (seen.has(version)) throw new Error(`Duplicate migration version: ${version}`);
    seen.add(version);
    const sql = await readFile(resolve(root, fileName), 'utf8');
    const checksum = createHash('sha256').update(sql, 'utf8').digest('hex');
    migrations.push(Object.freeze({ version, fileName: basename(fileName), checksum, sql }));
  }
  return Object.freeze(migrations);
}

export class PostgresMigrationRunner {
  constructor(private readonly pool: SqlPool) {}

  async migrate(directory: string): Promise<readonly string[]> {
    const migrations = await loadMigrations(directory);
    const connection = await this.pool.connect();
    let locked = false;
    let destroyConnection = false;
    try {
      await connection.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
      locked = true;
      await ensureMigrationTable(connection);
      const applied = await appliedMigrations(connection);
      assertAppliedHistoryPresent(applied, migrations);
      const executed: string[] = [];
      for (const migration of migrations) {
        const previous = applied.get(migration.version);
        if (previous) {
          if (previous.fileName !== migration.fileName) {
            throw new Error(`Applied migration filename mismatch for version ${migration.version}: database=${previous.fileName}, repository=${migration.fileName}`);
          }
          if (previous.checksum !== migration.checksum) {
            throw new Error(`Applied migration checksum mismatch: ${migration.fileName}`);
          }
          continue;
        }
        const started = Date.now();
        await connection.query('BEGIN');
        try {
          await connection.query(migration.sql);
          await connection.query(
            `INSERT INTO foundation_schema_migrations (version, file_name, checksum, execution_ms)
             VALUES ($1, $2, $3, $4)`,
            [migration.version, migration.fileName, migration.checksum, Math.max(0, Date.now() - started)],
          );
          await connection.query('COMMIT');
          executed.push(migration.version);
        } catch (error) {
          try {
            await connection.query('ROLLBACK');
          } catch {
            destroyConnection = true;
          }
          throw error;
        }
      }
      return Object.freeze(executed);
    } finally {
      if (locked && !destroyConnection) {
        try {
          await connection.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
        } catch {
          destroyConnection = true;
        }
      }
      connection.release(destroyConnection);
    }
  }
}

async function ensureMigrationTable(connection: SqlConnection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS foundation_schema_migrations (
      version text PRIMARY KEY,
      file_name text NOT NULL UNIQUE,
      checksum char(64) NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      execution_ms integer NOT NULL CHECK (execution_ms >= 0)
    )
  `);
}

async function appliedMigrations(connection: SqlConnection): Promise<Map<string, AppliedMigration>> {
  const result = await connection.query<{ version: string; file_name: string; checksum: string }>(
    'SELECT version, file_name, checksum FROM foundation_schema_migrations ORDER BY version',
  );
  return new Map(result.rows.map((row) => [row.version, Object.freeze({
    version: row.version,
    fileName: row.file_name,
    checksum: row.checksum,
  })]));
}

function assertAppliedHistoryPresent(
  applied: ReadonlyMap<string, AppliedMigration>,
  migrations: readonly MigrationFile[],
): void {
  const repositoryVersions = new Set(migrations.map((migration) => migration.version));
  for (const migration of applied.values()) {
    if (!repositoryVersions.has(migration.version)) {
      throw new Error(`Applied migration is missing from repository: ${migration.version} (${migration.fileName})`);
    }
  }
}
