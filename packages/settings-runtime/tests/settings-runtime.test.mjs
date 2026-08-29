import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthorizationDeniedError } from '@engineering-platform/authorization';
import { SettingsResolutionError } from '@engineering-platform/settings';
import { AuditService, REDACTED_VALUE } from '@taymex/audit';
import { MemoryAuditStore } from '@taymex/audit/testing';
import { FixedClock, ValidationError } from '@taymex/foundation';
import { createActorContext, IDENTITY_ERROR_CODES, IdentityError } from '@taymex/identity';
import {
  SETTINGS_RUNTIME_ERROR_CODES,
  SettingsRuntimeError,
  SettingsRuntimeService,
  settingsValuesManagePermission,
} from '../dist/index.js';
import { MemorySettingsValueStore } from '../dist/testing.js';

const PASS_THROUGH_TRANSACTION = Object.freeze({ run: async (work) => work() });

const T0 = new Date('2026-08-29T10:00:00.000Z');

const pageSize = Object.freeze({
  key: 'catalog.products.defaultPageSize',
  owner: 'catalog',
  kind: 'configuration',
  lifecycle: 'experimental',
  runtimeBehavior: 'restart',
  valueType: 'integer',
  resolution: 'OVERRIDE',
  scopes: ['platform', 'project'],
  precedence: ['platform', 'project'],
  default: 25,
  minimum: 1,
  maximum: 100,
  sensitive: false,
});

const hotFlag = Object.freeze({
  key: 'example.feature.enabled', owner: 'example', kind: 'feature-flag', lifecycle: 'experimental', runtimeBehavior: 'hot',
  valueType: 'boolean', resolution: 'OVERRIDE', scopes: ['platform'], precedence: ['platform'], default: false, sensitive: false,
});

const invariant = Object.freeze({
  key: 'platform.governance.enforcementMode', owner: 'platform-governance', kind: 'invariant', lifecycle: 'stable', runtimeBehavior: 'deploy',
  valueType: 'enum', resolution: 'NO_OVERRIDE', scopes: ['platform'], default: 'enforce', enumValues: ['enforce'], sensitive: false,
});

const sensitivePolicy = Object.freeze({
  key: 'security.integration.sharedSecret', owner: 'security', kind: 'security-policy', lifecycle: 'experimental', runtimeBehavior: 'reload',
  valueType: 'string', resolution: 'OVERRIDE', scopes: ['project'], precedence: ['project'], default: 'unset', sensitive: true,
});

class SequenceIds {
  value = 1;
  next() { return `550e8400-e29b-41d4-a716-${String(2000 + this.value++).padStart(12, '0')}`; }
}

function actor(permissions = [settingsValuesManagePermission], assurance = 'AAL2') {
  return createActorContext({
    accountId: '550e8400-e29b-41d4-a716-446655440002',
    sessionId: 'session-settings-1',
    roleIds: [],
    permissions,
    assurance,
    authenticatedAt: T0,
  });
}

function harness() {
  const store = new MemorySettingsValueStore();
  const auditStore = new MemoryAuditStore();
  const audit = new AuditService(auditStore, new FixedClock(T0), new SequenceIds());
  const runtime = new SettingsRuntimeService(store, audit, new FixedClock(T0), PASS_THROUGH_TRANSACTION);
  return { store, auditStore, runtime };
}

test('effective resolution reuses explicit platform resolver precedence and never invents a local default', async () => {
  const { runtime } = harness();
  const principal = actor();
  await runtime.write({ definition: pageSize, scope: 'platform', value: 30, expectedVersion: 0, actor: principal });
  await runtime.write({ definition: pageSize, scope: 'project', value: 45, expectedVersion: 0, actor: principal });

  const effective = await runtime.resolveEffective(pageSize);
  assert.equal(effective.trace.value, 45);
  assert.deepEqual(effective.trace.winner, { scope: 'project', source: 'runtime-admin', version: 1 });
  assert.equal(effective.sources.platform.value, 30);
  assert.equal(effective.sources.project.value, 45);
});

test('runtime settings writes require canonical permission and AAL2 before any store or audit mutation', async () => {
  const { runtime, auditStore } = harness();

  await assert.rejects(
    () => runtime.write({ definition: pageSize, scope: 'project', value: 40, expectedVersion: 0, actor: actor([], 'AAL2') }),
    (error) => error instanceof AuthorizationDeniedError && error.permission === settingsValuesManagePermission,
  );
  await assert.rejects(
    () => runtime.write({ definition: pageSize, scope: 'project', value: 40, expectedVersion: 0, actor: actor([settingsValuesManagePermission], 'AAL1') }),
    (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.assuranceRequired,
  );

  assert.equal((await runtime.history(actor(), { key: pageSize.key, scope: 'project' })).length, 0);
  assert.equal((await auditStore.query({ limit: 10 })).length, 0);
});



test('blank setting source is rejected before persistence so memory and PostgreSQL contracts agree', async () => {
  const { runtime, auditStore } = harness();
  await assert.rejects(
    () => runtime.write({ definition: pageSize, scope: 'project', value: 30, expectedVersion: 0, actor: actor(), source: '   ' }),
    (error) => error instanceof ValidationError && error.issues.some((issue) => issue.field === 'source' && issue.code === 'REQUIRED'),
  );
  assert.equal((await runtime.history(actor(), { key: pageSize.key, scope: 'project' })).length, 0);
  assert.equal((await auditStore.query({ limit: 10 })).length, 0);
});
test('invalid canonical setting values are rejected by the platform resolver before persistence', async () => {
  const { runtime } = harness();
  await assert.rejects(
    () => runtime.write({ definition: pageSize, scope: 'project', value: 101, expectedVersion: 0, actor: actor() }),
    (error) => error instanceof SettingsResolutionError && error.code === 'SETTING_VALUE_INVALID',
  );
  assert.equal((await runtime.history(actor(), { key: pageSize.key, scope: 'project' })).length, 0);
});



test('setting history is privileged and AAL2-gated before sensitive historical values can be read', async () => {
  const { runtime } = harness();
  await runtime.write({ definition: sensitivePolicy, scope: 'project', value: 'historical-secret', expectedVersion: 0, actor: actor() });

  await assert.rejects(
    () => runtime.history(actor([], 'AAL2'), { key: sensitivePolicy.key, scope: 'project' }),
    (error) => error instanceof AuthorizationDeniedError && error.permission === settingsValuesManagePermission,
  );
  await assert.rejects(
    () => runtime.history(actor([settingsValuesManagePermission], 'AAL1'), { key: sensitivePolicy.key, scope: 'project' }),
    (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.assuranceRequired,
  );
  const rows = await runtime.history(actor(), { key: sensitivePolicy.key, scope: 'project' });
  assert.equal(rows[0].value, 'historical-secret');
});

test('rollback authorizes before history lookup so unauthorized callers cannot probe historical-version existence', async () => {
  const { runtime } = harness();
  await runtime.write({ definition: pageSize, scope: 'project', value: 30, expectedVersion: 0, actor: actor() });
  await assert.rejects(
    () => runtime.rollback({ definition: pageSize, scope: 'project', targetVersion: 999, expectedVersion: 1, actor: actor([], 'AAL2') }),
    (error) => error instanceof AuthorizationDeniedError && error.permission === settingsValuesManagePermission,
  );
});

test('optimistic concurrency rejects stale setting writes without changing history or audit evidence', async () => {
  const { runtime, auditStore } = harness();
  const first = await runtime.write({ definition: pageSize, scope: 'project', value: 30, expectedVersion: 0, actor: actor() });
  assert.equal(first.version, 1);

  await assert.rejects(
    () => runtime.write({ definition: pageSize, scope: 'project', value: 40, expectedVersion: 0, actor: actor() }),
    (error) => error instanceof SettingsRuntimeError && error.code === SETTINGS_RUNTIME_ERROR_CODES.versionConflict,
  );

  const history = await runtime.history(actor(), { key: pageSize.key, scope: 'project' });
  assert.equal(history.length, 1);
  assert.equal(history[0].value, 30);
  assert.equal((await auditStore.query({ actionCode: 'settings.value.changed', limit: 10 })).length, 1);
});

test('rollback creates a new immutable version and never rewrites historical setting values', async () => {
  const { runtime } = harness();
  const principal = actor();
  await runtime.write({ definition: pageSize, scope: 'project', value: 30, expectedVersion: 0, actor: principal });
  await runtime.write({ definition: pageSize, scope: 'project', value: 40, expectedVersion: 1, actor: principal });
  const rolled = await runtime.rollback({ definition: pageSize, scope: 'project', targetVersion: 1, expectedVersion: 2, actor: principal });

  assert.equal(rolled.version, 3);
  assert.equal(rolled.value, 30);
  const history = await runtime.history(actor(), { key: pageSize.key, scope: 'project' });
  assert.deepEqual(history.map((row) => [row.version, row.value, row.operation]), [
    [3, 30, 'rollback'], [2, 40, 'write'], [1, 30, 'write'],
  ]);
  assert.equal(history[0].rolledBackFromVersion, 1);
});

test('restart settings are explicitly saved-but-not-applied until the matching version is acknowledged', async () => {
  const { runtime } = harness();
  await runtime.write({ definition: pageSize, scope: 'project', value: 30, expectedVersion: 0, actor: actor() });
  assert.deepEqual(await runtime.diagnostic(pageSize, { scope: 'project' }), {
    coordinate: { key: pageSize.key, scope: 'project' }, runtimeBehavior: 'restart', savedVersion: 1, appliedVersion: null, status: 'PENDING_RESTART',
  });

  await runtime.markApplied({ definition: pageSize, scope: 'project', version: 1, runtimeSource: 'api-bootstrap' });
  assert.equal((await runtime.diagnostic(pageSize, { scope: 'project' })).status, 'APPLIED');

  await runtime.write({ definition: pageSize, scope: 'project', value: 50, expectedVersion: 1, actor: actor() });
  const pending = await runtime.diagnostic(pageSize, { scope: 'project' });
  assert.equal(pending.savedVersion, 2);
  assert.equal(pending.appliedVersion, 1);
  assert.equal(pending.status, 'PENDING_RESTART');

  await assert.rejects(
    () => runtime.markApplied({ definition: pageSize, scope: 'project', version: 1, runtimeSource: 'stale-runtime' }),
    (error) => error instanceof SettingsRuntimeError && error.code === SETTINGS_RUNTIME_ERROR_CODES.applicationVersionMismatch,
  );
});

test('hot settings become applied at the accepted saved version immediately', async () => {
  const { runtime } = harness();
  const row = await runtime.write({ definition: hotFlag, scope: 'platform', value: true, expectedVersion: 0, actor: actor() });
  const diagnostic = await runtime.diagnostic(hotFlag, { scope: 'platform' });
  assert.equal(row.version, 1);
  assert.equal(diagnostic.savedVersion, 1);
  assert.equal(diagnostic.appliedVersion, 1);
  assert.equal(diagnostic.status, 'APPLIED');
});

test('invariants and secret references cannot be changed through runtime administration', async () => {
  const { runtime } = harness();
  await assert.rejects(
    () => runtime.write({ definition: invariant, scope: 'platform', value: 'enforce', expectedVersion: 0, actor: actor() }),
    (error) => error instanceof SettingsRuntimeError && error.code === SETTINGS_RUNTIME_ERROR_CODES.immutable,
  );
});

test('sensitive setting audit changes are redacted while history keeps the value behind the settings store boundary', async () => {
  const { runtime, auditStore } = harness();
  await runtime.write({ definition: sensitivePolicy, scope: 'project', value: 'do-not-log-me', expectedVersion: 0, actor: actor(), correlationId: 'corr-settings-secret' });
  const history = await runtime.history(actor(), { key: sensitivePolicy.key, scope: 'project' });
  assert.equal(history[0].value, 'do-not-log-me');
  const auditRows = await auditStore.query({ actionCode: 'settings.value.changed', limit: 10 });
  assert.equal(auditRows[0].changes[0].after, REDACTED_VALUE);
  assert.equal(JSON.stringify(auditRows[0]).includes('do-not-log-me'), false);
});

test('rollback rejects a missing historical version without changing current state', async () => {
  const { runtime } = harness();
  await runtime.write({ definition: pageSize, scope: 'project', value: 30, expectedVersion: 0, actor: actor() });
  await assert.rejects(
    () => runtime.rollback({ definition: pageSize, scope: 'project', targetVersion: 99, expectedVersion: 1, actor: actor() }),
    (error) => error instanceof SettingsRuntimeError && error.code === SETTINGS_RUNTIME_ERROR_CODES.historyNotFound,
  );
  assert.equal((await runtime.resolveEffective(pageSize)).trace.value, 30);
});
