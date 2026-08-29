import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  PostgresDatabase,
  PostgresMigrationRunner,
  SqlQueryRecorder,
  createNodePgPool,
  requireSqlQueryBudget,
} from '../../../packages/data-postgres/dist/index.js';
import { PostgresAuditStore } from '../../../packages/audit/dist/index.js';

const url = process.env.TEST_DATABASE_URL?.trim();
const mutationAllowed = process.env.F6_DATABASE_TESTS === '1';
const skipReason = !url
  ? 'TEST_DATABASE_URL is not configured'
  : !mutationAllowed
    ? 'F6_DATABASE_TESTS=1 is required for the disposable database proof'
    : false;

const EXPECTED_INDEX = 'audit_records_action_idx';
const MAX_AUDIT_LIMIT = 100;

test('PostgreSQL 18 proves deterministic F6 list query budget, bounded pagination, and index evidence', { skip: skipReason }, async (t) => {
  const pool = await createNodePgPool({
    connectionString: url,
    applicationName: 'taymex-f6-performance-proof',
    max: 4,
    statementTimeoutMs: 15_000,
  });
  const setupDb = new PostgresDatabase(pool);
  const migrations = fileURLToPath(new URL('../../../packages/data-postgres/migrations/', import.meta.url));

  try {
    const version = await setupDb.query('SHOW server_version_num');
    const versionNum = Number(version.rows[0]?.server_version_num);
    assert.equal(Math.floor(versionNum / 10000), 18, `Expected PostgreSQL 18, got ${versionNum}`);
    t.diagnostic(`postgres.server_version_num=${versionNum}`);

    await new PostgresMigrationRunner(pool).migrate(migrations);

    const marker = randomUUID();
    const targetAction = `f6.performance.target.${marker}`;
    const noiseAction = `f6.performance.noise.${marker}`;
    const base = Date.now();

    // Seed enough rows for a meaningful selective plan without introducing a new schema/index.
    await setupDb.query(
      `INSERT INTO audit_records
        (id, occurred_at, action_code, category, severity, actor_kind, actor_id,
         changes_json, metadata_json)
       SELECT (md5($3::text || n::text))::uuid,
              to_timestamp((($1::bigint + n)::double precision) / 1000.0),
              $2,
              'system', 'info', 'system', 'f6-proof', '[]'::jsonb, '{}'::jsonb
         FROM generate_series(1, 5000) AS n`,
      [base - 100_000, noiseAction, `noise-${marker}`],
    );
    await setupDb.query(
      `INSERT INTO audit_records
        (id, occurred_at, action_code, category, severity, actor_kind, actor_id,
         changes_json, metadata_json)
       SELECT (md5($3::text || n::text))::uuid,
              to_timestamp((($1::bigint + n)::double precision) / 1000.0),
              $2,
              'system', 'info', 'system', 'f6-proof', '[]'::jsonb, '{}'::jsonb
         FROM generate_series(1, 40) AS n`,
      [base, targetAction, `target-${marker}`],
    );
    await setupDb.query('ANALYZE audit_records');

    const recorder = new SqlQueryRecorder();
    const measuredDb = new PostgresDatabase(pool, { queryObserver: recorder });
    const audit = new PostgresAuditStore(measuredDb);

    const rows = await audit.query({ actionCode: targetAction, limit: 40 });
    assert.equal(rows.length, 40);
    const summary = requireSqlQueryBudget(recorder.snapshot(), {
      maxQueries: 1,
      maxRepeatedFingerprint: 1,
    });
    assert.deepEqual(
      { totalQueries: summary.totalQueries, maximumFingerprintCount: summary.maximumFingerprintCount },
      { totalQueries: 1, maximumFingerprintCount: 1 },
      'returning many rows must not amplify database queries',
    );
    t.diagnostic(`audit.rows=${rows.length}`);
    t.diagnostic(`audit.total_queries=${summary.totalQueries}`);
    t.diagnostic(`audit.max_repeated_fingerprint=${summary.maximumFingerprintCount}`);

    recorder.clear();
    await assert.rejects(() => audit.query({ actionCode: targetAction, limit: MAX_AUDIT_LIMIT + 1 }), /limit must be between 1 and 100/i);
    assert.equal(recorder.snapshot().length, 0, 'invalid list bounds must fail before database I/O');

    const planResult = await setupDb.query(
      `EXPLAIN (FORMAT JSON)
       SELECT id, occurred_at, action_code, category, severity,
              actor_kind, actor_id, actor_session_id,
              subject_type, subject_id, resource_type, resource_id,
              changes_json, correlation_id, metadata_json
         FROM audit_records
        WHERE action_code = $1
        ORDER BY occurred_at DESC, id DESC
        LIMIT $2`,
      [targetAction, 40],
    );
    const plan = planResult.rows[0]?.['QUERY PLAN'];
    assert.ok(plan, 'EXPLAIN JSON must return a plan');
    assert.equal(planContainsIndex(plan, EXPECTED_INDEX), true, `${EXPECTED_INDEX} must be present in the representative query plan`);

    const indexDefinition = await setupDb.query(
      `SELECT indexdef
         FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'audit_records'
          AND indexname = $1`,
      [EXPECTED_INDEX],
    );
    assert.equal(indexDefinition.rows.length, 1, 'representative evidence must use an already-declared index');
    assert.match(String(indexDefinition.rows[0]?.indexdef), /\(action_code, occurred_at DESC\)/i);
    t.diagnostic(`audit.plan_index=${EXPECTED_INDEX}`);
    t.diagnostic('audit.invalid_limit_database_queries=0');
  } finally {
    await setupDb.close();
  }
});

function planContainsIndex(value, expectedIndex) {
  if (Array.isArray(value)) return value.some((item) => planContainsIndex(item, expectedIndex));
  if (!value || typeof value !== 'object') return false;
  if (value['Index Name'] === expectedIndex) return true;
  return Object.values(value).some((item) => planContainsIndex(item, expectedIndex));
}
