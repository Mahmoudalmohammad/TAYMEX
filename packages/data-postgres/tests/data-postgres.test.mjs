import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  PostgresDatabase,
  PostgresMigrationRunner,
  checkPostgresReadiness,
  createAtomicTransactionBoundary,
  hashIdempotencyRequest,
  loadMigrations,
} from '../dist/index.js';

class FakeConnection {
  constructor(handler = async () => ({ rows: [], rowCount: 0 })) { this.handler = handler; this.queries = []; this.releaseCount = 0; }
  async query(text, params = []) { this.queries.push({ text, params }); return this.handler(text, params, this); }
  release() { this.releaseCount += 1; }
}
class FakePool {
  constructor(connection) { this.connection = connection; this.queries = []; this.connectCount = 0; this.endCount = 0; }
  async query(text, params = []) { this.queries.push({ text, params }); return { rows: [], rowCount: 0 }; }
  async connect() { this.connectCount += 1; return this.connection; }
  async end() { this.endCount += 1; }
}

test('transaction commits on success and nested transaction reuses one connection', async () => {
  const connection = new FakeConnection();
  const pool = new FakePool(connection);
  const db = new PostgresDatabase(pool);
  const result = await db.transaction(async () => {
    await db.query('SELECT outer');
    return db.transaction(async () => { await db.query('SELECT inner'); return 42; });
  }, { isolation: 'SERIALIZABLE', readOnly: true });
  assert.equal(result, 42);
  assert.equal(pool.connectCount, 1);
  assert.equal(connection.releaseCount, 1);
  assert.deepEqual(connection.queries.map((q) => q.text), [
    'BEGIN',
    'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE',
    'SET TRANSACTION READ ONLY',
    'SELECT outer',
    'SELECT inner',
    'COMMIT',
  ]);
});

test('transaction rolls back and preserves original error', async () => {
  const connection = new FakeConnection();
  const db = new PostgresDatabase(new FakePool(connection));
  const expected = new Error('boom');
  await assert.rejects(() => db.transaction(async () => { throw expected; }), (error) => error === expected);
  assert.deepEqual(connection.queries.map((q) => q.text), ['BEGIN', 'ROLLBACK']);
  assert.equal(connection.releaseCount, 1);
});

test('atomic boundary delegates to the database transaction', async () => {
  let calls = 0;
  const boundary = createAtomicTransactionBoundary({
    query: async () => ({ rows: [], rowCount: 0 }),
    transaction: async (work) => { calls += 1; return work({ query: async () => ({ rows: [], rowCount: 0 }) }); },
  });
  assert.equal(await boundary.run(async () => 'ok'), 'ok');
  assert.equal(calls, 1);
});

test('readiness distinguishes an available database from failures', async () => {
  assert.deepEqual(await checkPostgresReadiness({ query: async () => ({ rows: [{ ok: 1 }], rowCount: 1 }) }), { status: 'UP' });
  assert.deepEqual(await checkPostgresReadiness({ query: async () => { throw new Error('down'); } }), { status: 'DOWN', detail: 'database-unavailable' });
});

test('idempotency hash is canonical for object key order and rejects non-JSON values', () => {
  assert.equal(hashIdempotencyRequest({ b: 2, a: [1, true] }), hashIdempotencyRequest({ a: [1, true], b: 2 }));
  assert.notEqual(hashIdempotencyRequest({ a: 1 }), hashIdempotencyRequest({ a: 2 }));
  assert.throws(() => hashIdempotencyRequest({ value: undefined }), /JSON-compatible/);
  const circular = {}; circular.self = circular;
  assert.throws(() => hashIdempotencyRequest(circular), /circular/);
});


test('foundation migration is additive and declares every persisted F4 table', async () => {
  const sql = await readFile(new URL('../migrations/0001_foundation.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE)\b/iu);
  for (const table of [
    'identity_accounts', 'identity_password_credentials', 'identity_sessions', 'identity_challenges',
    'identity_roles', 'identity_role_permissions', 'identity_account_role_sets', 'identity_account_roles',
    'runtime_setting_values', 'runtime_setting_history', 'runtime_setting_application', 'audit_records',
    'foundation_idempotency_keys',
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE ${table}\\b`, 'u'), `missing ${table}`);
  }
  assert.match(sql, /CREATE TRIGGER audit_records_no_update/u);
  assert.match(sql, /CREATE TRIGGER audit_records_no_delete/u);
});

test('migration loader sorts, hashes, and rejects duplicate versions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'taymex-migrations-'));
  try {
    await writeFile(join(root, '0002_second.sql'), 'SELECT 2;\n');
    await writeFile(join(root, '0001_first.sql'), 'SELECT 1;\n');
    await writeFile(join(root, 'README.md'), 'ignored');
    const migrations = await loadMigrations(root);
    assert.deepEqual(migrations.map((m) => m.version), ['0001', '0002']);
    assert.match(migrations[0].checksum, /^[a-f0-9]{64}$/);
    await writeFile(join(root, '0001_duplicate.sql'), 'SELECT 9;\n');
    await assert.rejects(() => loadMigrations(root), /Duplicate migration version/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('migration runner uses an advisory lock and commits an unapplied migration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'taymex-runner-'));
  try {
    await writeFile(join(root, '0001_first.sql'), 'CREATE TABLE example(id integer);\n');
    const connection = new FakeConnection(async (text) => {
      if (text.startsWith('SELECT version, checksum')) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    const executed = await new PostgresMigrationRunner(new FakePool(connection)).migrate(root);
    assert.deepEqual(executed, ['0001']);
    const sql = connection.queries.map((q) => q.text);
    assert.match(sql[0], /pg_advisory_lock/);
    assert.ok(sql.includes('BEGIN'));
    assert.ok(sql.includes('CREATE TABLE example(id integer);\n'));
    assert.ok(sql.includes('COMMIT'));
    assert.match(sql.at(-1), /pg_advisory_unlock/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
