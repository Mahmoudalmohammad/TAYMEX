import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  PostgresDatabase,
  PostgresMigrationRunner,
  checkPostgresReadiness,
  createAtomicTransactionBoundary,
  hashIdempotencyRequest,
  loadMigrations,
  PostgresIdempotencyStore,
} from '../dist/index.js';

class FakeConnection {
  constructor(handler = async () => ({ rows: [], rowCount: 0 })) { this.handler = handler; this.queries = []; this.releaseCount = 0; this.releaseArgs = []; }
  async query(text, params = []) { this.queries.push({ text, params }); return this.handler(text, params, this); }
  release(destroy = false) { this.releaseCount += 1; this.releaseArgs.push(destroy); }
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
  assert.deepEqual(connection.releaseArgs, [false]);
});

test('transaction destroys the connection if rollback itself fails', async () => {
  const expected = new Error('work-failed');
  const connection = new FakeConnection(async (text) => {
    if (text === 'ROLLBACK') throw new Error('rollback-failed');
    return { rows: [], rowCount: 0 };
  });
  const db = new PostgresDatabase(new FakePool(connection));
  await assert.rejects(() => db.transaction(async () => { throw expected; }), (error) => error === expected);
  assert.deepEqual(connection.releaseArgs, [true]);
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
      if (text.startsWith('SELECT version, file_name, checksum')) return { rows: [], rowCount: 0 };
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


test('migration loader rejects malformed SQL filenames instead of silently ignoring them', async () => {
  const root = await mkdtemp(join(tmpdir(), 'taymex-invalid-migrations-'));
  try {
    await writeFile(join(root, 'migration.sql'), 'SELECT 1;\n');
    await assert.rejects(() => loadMigrations(root), /Invalid migration filename/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('migration runner rejects missing applied migration, filename drift, and checksum drift', async () => {
  const root = await mkdtemp(join(tmpdir(), 'taymex-history-migrations-'));
  try {
    await writeFile(join(root, '0001_first.sql'), 'SELECT 1;\n');
    const scenarios = [
      [{ version: '0000', file_name: '0000_missing.sql', checksum: 'a'.repeat(64) }, /missing from repository/],
      [{ version: '0001', file_name: '0001_renamed.sql', checksum: hashText('SELECT 1;\n') }, /filename mismatch/],
      [{ version: '0001', file_name: '0001_first.sql', checksum: 'b'.repeat(64) }, /checksum mismatch/],
    ];
    for (const [applied, pattern] of scenarios) {
      const connection = new FakeConnection(async (text) => {
        if (text.startsWith('SELECT version, file_name, checksum')) return { rows: [applied], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });
      await assert.rejects(() => new PostgresMigrationRunner(new FakePool(connection)).migrate(root), pattern);
      assert.deepEqual(connection.releaseArgs, [false]);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('migration runner destroys connection when migration rollback fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'taymex-rollback-migrations-'));
  try {
    await writeFile(join(root, '0001_first.sql'), 'BROKEN SQL;\n');
    const expected = new Error('migration-failed');
    const connection = new FakeConnection(async (text) => {
      if (text.startsWith('SELECT version, file_name, checksum')) return { rows: [], rowCount: 0 };
      if (text === 'BROKEN SQL;\n') throw expected;
      if (text === 'ROLLBACK') throw new Error('rollback-failed');
      return { rows: [], rowCount: 0 };
    });
    await assert.rejects(() => new PostgresMigrationRunner(new FakePool(connection)).migrate(root), (error) => error === expected);
    assert.deepEqual(connection.releaseArgs, [true]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('idempotency claim generation fences a stale worker after expiry and reclaim', async () => {
  const state = new Map();
  const db = fakeTransactionalExecutor(async (text, params) => {
    const operation = params[0]; const key = params[1]; const mapKey = `${operation}:${key}`;
    if (text.startsWith('INSERT INTO foundation_idempotency_keys')) {
      if (state.has(mapKey)) return { rows: [], rowCount: 0 };
      const row = { request_hash: params[2], claim_generation: 1, status: 'IN_PROGRESS', response_json: null, expires_at: params[4] };
      state.set(mapKey, row); return { rows: [{ claim_generation: 1 }], rowCount: 1 };
    }
    if (text.includes('FROM foundation_idempotency_keys') && text.includes('FOR UPDATE')) {
      const row = state.get(mapKey); return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (text.startsWith('UPDATE foundation_idempotency_keys') && text.includes('claim_generation = claim_generation + 1')) {
      const row = state.get(mapKey);
      if (!row || new Date(row.expires_at).getTime() > new Date(params[3]).getTime()) return { rows: [], rowCount: 0 };
      Object.assign(row, { request_hash: params[2], claim_generation: row.claim_generation + 1, status: 'IN_PROGRESS', response_json: null, expires_at: params[4] });
      return { rows: [{ claim_generation: row.claim_generation }], rowCount: 1 };
    }
    if (text.startsWith('UPDATE foundation_idempotency_keys') && text.includes("status = 'COMPLETED'")) {
      const row = state.get(mapKey);
      const active = row && row.request_hash === params[2] && row.claim_generation === params[3] && row.status === 'IN_PROGRESS' && new Date(row.expires_at).getTime() > new Date(params[5]).getTime();
      if (!active) return { rows: [], rowCount: 0 };
      row.status = 'COMPLETED'; row.response_json = JSON.parse(params[4]); return { rows: [{ operation }], rowCount: 1 };
    }
    throw new Error(`Unexpected SQL in fake idempotency executor: ${text}`);
  });
  const store = new PostgresIdempotencyStore(db);
  const hash = hashIdempotencyRequest({ a: 1 });
  const t0 = new Date('2026-08-29T00:00:00Z');
  const first = await store.claim({ operation: 'op', key: 'key', requestHash: hash, now: t0, expiresAt: new Date(t0.getTime() + 1000) });
  assert.deepEqual(first, { status: 'started', claimGeneration: 1 });
  const t1 = new Date(t0.getTime() + 2000);
  const second = await store.claim({ operation: 'op', key: 'key', requestHash: hash, now: t1, expiresAt: new Date(t1.getTime() + 1000) });
  assert.deepEqual(second, { status: 'started', claimGeneration: 2 });
  await assert.rejects(() => store.complete({ operation: 'op', key: 'key', requestHash: hash, claimGeneration: 1, response: { stale: true }, now: t1 }), /active matching/);
  await store.complete({ operation: 'op', key: 'key', requestHash: hash, claimGeneration: 2, response: { ok: true }, now: t1 });
});

function fakeTransactionalExecutor(handler) {
  const executor = { query: handler, transaction: async (work) => work(executor) };
  return executor;
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('query instrumentation records safe fingerprints and deterministic budgets without parameter values', async () => {
  const { SqlQueryRecorder, requireSqlQueryBudget } = await import('../dist/index.js');
  const recorder = new SqlQueryRecorder();
  const pool = new FakePool(new FakeConnection());
  pool.query = async (text, params = []) => {
    pool.queries.push({ text, params });
    return { rows: [{ id: 'row-1' }], rowCount: 1 };
  };
  const db = new PostgresDatabase(pool, { queryObserver: recorder });
  await db.query('SELECT id FROM example WHERE secret = $1', ['do-not-record']);

  const events = recorder.snapshot();
  assert.equal(events.length, 1);
  assert.equal(events[0].operation, 'SELECT');
  assert.equal(events[0].parameterCount, 1);
  assert.equal(events[0].rowCount, 1);
  assert.equal(events[0].outcome, 'success');
  assert.match(events[0].fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(events).includes('do-not-record'), false);
  assert.deepEqual(requireSqlQueryBudget(events, { maxQueries: 1, maxRepeatedFingerprint: 1 }).totalQueries, 1);
  assert.throws(() => requireSqlQueryBudget([...events, ...events], { maxQueries: 1 }), /query budget exceeded/i);
  assert.throws(() => requireSqlQueryBudget([...events, ...events], { maxQueries: 2, maxRepeatedFingerprint: 1 }), /fingerprint budget exceeded/i);
});

test('query instrumentation records failures without leaking error or parameter contents', async () => {
  const { SqlQueryRecorder } = await import('../dist/index.js');
  const recorder = new SqlQueryRecorder();
  const pool = new FakePool(new FakeConnection());
  pool.query = async () => { throw new Error('database detail with credential-like value'); };
  const db = new PostgresDatabase(pool, { queryObserver: recorder });
  await assert.rejects(() => db.query('SELECT id FROM example WHERE secret = $1', ['hidden-value']));
  const events = recorder.snapshot();
  const serialized = JSON.stringify(events);
  assert.equal(events[0]?.outcome, 'error');
  assert.equal(serialized.includes('hidden-value'), false);
  assert.equal(serialized.includes('credential-like'), false);
});
