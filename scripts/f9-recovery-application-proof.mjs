import assert from 'node:assert/strict';
import {
  PostgresDatabase,
  PostgresIdempotencyStore,
  checkPostgresReadiness,
  createNodePgPool,
} from '../packages/data-postgres/dist/index.js';
import {
  PostgresIdentityRepository,
  PostgresRoleAccessStore,
} from '../packages/identity/dist/index.js';
import { PostgresSettingsValueStore } from '../packages/settings-runtime/dist/index.js';
import { PostgresAuditStore } from '../packages/audit/dist/index.js';

const connectionString = process.argv[2] || process.env.RESTORED_DATABASE_URL || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Missing connection string argument for restored database proof');
  process.exit(1);
}

const pool = await createNodePgPool({
  connectionString,
  applicationName: 'taymex-f9-recovery-app-proof',
  max: 2,
});
const db = new PostgresDatabase(pool);

try {
  console.log('--- 1. Application-Level Readiness Probe ---');
  const readiness = await checkPostgresReadiness(db);
  assert.equal(readiness.status, 'UP', `Expected readiness status UP, got ${JSON.stringify(readiness)}`);
  console.log('PASS: checkPostgresReadiness returned UP through application adapter.');

  console.log('--- 2. Identity Repository Restored State Proof ---');
  const identity = new PostgresIdentityRepository(db);
  const account = await identity.findAccountById('a0000000-0000-4000-8000-000000000001');
  assert.ok(account, 'Restored account not found via PostgresIdentityRepository');
  assert.equal(account.email, 'recovery.drill@taymex.test', `Expected email recovery.drill@taymex.test, got ${account.email}`);
  assert.equal(account.status, 'ACTIVE', `Expected status ACTIVE, got ${account.status}`);
  assert.equal(account.version, 1, `Expected version 1, got ${account.version}`);

  const credential = await identity.findPasswordCredential('a0000000-0000-4000-8000-000000000001');
  assert.ok(credential, 'Restored password credential not found via PostgresIdentityRepository');
  assert.equal(credential.passwordHash, '$argon2id$v=19$m=65536,t=3,p=4$deterministicRecoveryHash');
  console.log('PASS: PostgresIdentityRepository loaded restored account and password credentials.');

  console.log('--- 3. Role Access Store Restored State Proof ---');
  const roles = new PostgresRoleAccessStore(db);
  const role = await roles.findRoleById('recovery-drill-admin');
  assert.ok(role, 'Restored role not found via PostgresRoleAccessStore');
  assert.equal(role.name, 'Recovery Drill Admin');
  assert.ok(role.permissions.includes('catalog.products.read'), 'Role missing catalog.products.read permission');
  assert.ok(role.permissions.includes('settings.values.manage'), 'Role missing settings.values.manage permission');

  const resolved = await roles.resolveAccountRoles('a0000000-0000-4000-8000-000000000001');
  assert.ok(resolved.roleSet.roleIds.includes('recovery-drill-admin'), 'Account role set missing recovery-drill-admin role');
  assert.equal(resolved.roles.length, 1);
  console.log('PASS: PostgresRoleAccessStore verified restored role and account permissions.');

  console.log('--- 4. Settings Runtime Store Restored State Proof ---');
  const settings = new PostgresSettingsValueStore(db);
  const coordinate = Object.freeze({ key: 'recovery.drill.enabled', scope: 'project', scopeRef: '' });
  const currentSetting = await settings.findCurrent(coordinate);
  assert.ok(currentSetting, 'Restored setting value not found via PostgresSettingsValueStore');
  assert.equal(currentSetting.value?.enabled, true, 'Restored setting enabled value mismatch');
  assert.equal(currentSetting.value?.drillId, 'F9-002', 'Restored setting drillId value mismatch');
  assert.equal(currentSetting.version, 1, 'Restored setting version mismatch');

  const history = await settings.listHistory(coordinate);
  assert.equal(history.length, 1, `Expected 1 history entry, got ${history.length}`);
  assert.equal(history[0].source, 'f9-recovery-drill');
  console.log('PASS: PostgresSettingsValueStore loaded restored configuration value and audit history.');

  console.log('--- 5. Audit Store Restored State Proof & Immutability Trigger ---');
  const audit = new PostgresAuditStore(db);
  const auditRecords = await audit.query({ correlationId: 'f9-drill-corr-001' });
  assert.equal(auditRecords.length, 1, `Expected 1 audit record, got ${auditRecords.length}`);
  assert.equal(auditRecords[0].actionCode, 'f9.recovery.drill.initiate');
  assert.equal(auditRecords[0].actor?.accountId, 'a0000000-0000-4000-8000-000000000001');

  // Verify append-only trigger is enforced against application query
  await assert.rejects(
    () => db.query("UPDATE audit_records SET severity='warning' WHERE id=$1", ['d0000000-0000-4000-8000-000000000001']),
    /audit_records is append-only/,
    'Restored database must enforce append-only trigger against mutation',
  );
  console.log('PASS: PostgresAuditStore queried restored audit records and enforced immutability trigger.');

  console.log('--- 6. Idempotency Store Restored State Proof ---');
  const idempotency = new PostgresIdempotencyStore(db);
  const requestHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const now = new Date('2026-08-30T10:30:00Z');
  const expiresAt = new Date('2026-08-30T11:30:00Z');
  const claim = await idempotency.claim({
    operation: 'f9-recovery-drill',
    key: 'f9-drill-key-001',
    requestHash,
    now,
    expiresAt,
  });
  assert.equal(claim.status, 'replay', `Expected idempotency status replay, got ${claim.status}`);
  assert.deepEqual(claim.response, { status: 'ok' }, `Expected response { status: 'ok' }, got ${JSON.stringify(claim.response)}`);
  console.log('PASS: PostgresIdempotencyStore proved restored idempotency replay semantics.');

  console.log('\nAPPLICATION_RESTORED_STATE_PROOF=PASS');
  console.log(JSON.stringify({
    status: 'PASS',
    modules: ['@taymex/data-postgres', '@taymex/identity', '@taymex/settings-runtime', '@taymex/audit'],
    accountVerified: account.id,
    roleVerified: role.id,
    settingVerified: coordinate.key,
    auditVerified: auditRecords[0].id,
    idempotencyStatus: claim.status,
    readinessStatus: readiness.status,
  }, null, 2));
} finally {
  await db.close();
}
