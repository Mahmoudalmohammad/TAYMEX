import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PostgresDatabase,
  PostgresIdempotencyStore,
  PostgresMigrationRunner,
  checkPostgresReadiness,
  createAtomicTransactionBoundary,
  createNodePgPool,
  hashIdempotencyRequest,
} from '../dist/index.js';
import { FixedClock } from '../../foundation/dist/index.js';
import { PostgresIdentityRepository, PostgresRoleAccessStore, createActorContext } from '../../identity/dist/index.js';
import { PostgresSettingsValueStore, SettingsRuntimeService, settingsValuesManagePermission } from '../../settings-runtime/dist/index.js';
import { AuditService, PostgresAuditStore } from '../../audit/dist/index.js';

const url = process.env.TEST_DATABASE_URL?.trim();
const mutationAllowed = process.env.F4_DATABASE_TESTS === '1';
const skipReason = !url ? 'TEST_DATABASE_URL is not configured' : !mutationAllowed ? 'F4_DATABASE_TESTS=1 is required for the disposable database test' : false;

test('PostgreSQL 18 proves F4 migration, CAS, rollback, audit, idempotency, and readiness', { skip: skipReason }, async () => {
  const pool = await createNodePgPool({ connectionString: url, applicationName: 'taymex-f4-integration', max: 4 });
  const db = new PostgresDatabase(pool);
  const migrations = fileURLToPath(new URL('../migrations/', import.meta.url));
  try {
    const version = await db.query('SHOW server_version_num');
    const versionNum = Number(version.rows[0]?.server_version_num);
    assert.equal(Math.floor(versionNum / 10000), 18, `Expected PostgreSQL 18, got ${versionNum}`);

    await new PostgresMigrationRunner(pool).migrate(migrations);
    assert.deepEqual(await new PostgresMigrationRunner(pool).migrate(migrations), [], 'second migration run must be a checksum-verified no-op');
    assert.deepEqual(await checkPostgresReadiness(db), { status: 'UP' });

    const tampered = await mkdtemp(join(tmpdir(), 'taymex-tampered-migration-'));
    try {
      const source0002 = await readFile(join(migrations, '0002_f4_integrity_hardening.sql'), 'utf8');
      const source0003 = await readFile(join(migrations, '0003_f7_outbox.sql'), 'utf8');
      await writeFile(join(tampered, '0001_foundation.sql'), '-- tampered applied migration\nSELECT 1;\n');
      await writeFile(join(tampered, '0002_f4_integrity_hardening.sql'), source0002);
      await writeFile(join(tampered, '0003_f7_outbox.sql'), source0003);
      await assert.rejects(() => new PostgresMigrationRunner(pool).migrate(tampered), /checksum mismatch/);
    } finally { await rm(tampered, { recursive: true, force: true }); }

    const identity = new PostgresIdentityRepository(db);
    const accountId = randomUUID();
    const now = new Date();
    const account = Object.freeze({
      id: accountId, email: `f4-${accountId}@example.invalid`, normalizedEmail: `f4-${accountId}@example.invalid`,
      status: 'ACTIVE', emailVerifiedAt: null, version: 1, createdAt: now, updatedAt: now,
    });
    assert.equal(await identity.createAccount(account), 'created');
    await identity.replacePasswordCredential(Object.freeze({ accountId, passwordHash: 'integration-only-hash', changedAt: now, version: 1 }));
    await identity.replacePasswordCredential(Object.freeze({ accountId, passwordHash: 'integration-only-hash-v2', changedAt: new Date(now.getTime() + 1), version: 2 }));
    await assert.rejects(
      () => identity.replacePasswordCredential(Object.freeze({ accountId, passwordHash: 'stale', changedAt: now, version: 2 })),
      /version conflict/,
    );
    const accountV2 = Object.freeze({ ...account, version: 2, updatedAt: new Date(now.getTime() + 2) });
    assert.equal(await identity.replaceAccountIfVersionMatches(accountV2, 1), 'updated');
    const staleAccountV2 = Object.freeze({ ...account, version: 2, updatedAt: new Date(now.getTime() + 3) });
    assert.equal(await identity.replaceAccountIfVersionMatches(staleAccountV2, 1), 'version-conflict');
    await assert.rejects(() => identity.replaceAccountIfVersionMatches(Object.freeze({ ...accountV2, version: 3 }), 1), RangeError);

    const sessionId = randomUUID();
    const session = Object.freeze({
      id: sessionId, accountId, tokenHash: `hash-${randomUUID()}`, assurance: 'AAL1', clientLabel: 'integration',
      createdAt: now, expiresAt: new Date(now.getTime() + 60_000), rotatedAt: null, revokedAt: null, version: 1,
    });
    await identity.createSession(session);
    assert.equal(await identity.replaceSessionIfVersionMatches(Object.freeze({ ...session, version: 2, rotatedAt: new Date(now.getTime() + 3) }), 1), 'updated');
    const staleSessionV2 = Object.freeze({ ...session, version: 2, rotatedAt: new Date(now.getTime() + 4) });
    assert.equal(await identity.replaceSessionIfVersionMatches(staleSessionV2, 1), 'version-conflict');
    await assert.rejects(() => identity.replaceSessionIfVersionMatches(Object.freeze({ ...session, version: 3 }), 1), RangeError);

    const challengeId = randomUUID();
    await identity.createChallenge(Object.freeze({
      id: challengeId, kind: 'PASSWORD_RESET', accountId, tokenHash: `challenge-${randomUUID()}`,
      createdAt: now, expiresAt: new Date(now.getTime() + 60_000), consumedAt: null, version: 1,
    }));
    assert.equal(await identity.consumeChallengeIfActive(challengeId, 1, new Date(now.getTime() + 4)), 'consumed');
    assert.equal(await identity.consumeChallengeIfActive(challengeId, 1, new Date(now.getTime() + 5)), 'unavailable');

    const roles = new PostgresRoleAccessStore(db);
    const roleId = `f4-role-${randomUUID()}`;
    const role = Object.freeze({ id: roleId, name: `F4 ${roleId}`, permissions: Object.freeze(['catalog.products.read']), version: 1, createdAt: now, updatedAt: now });
    assert.equal(await roles.createRole(role), 'created');
    assert.equal(await roles.replaceAccountRolesIfVersionMatches(accountId, [roleId], 0, now), 'updated');
    assert.equal(await roles.replaceAccountRolesIfVersionMatches(accountId, [roleId], 0, now), 'version-conflict');
    assert.equal((await roles.getAccountRoleSet(accountId)).version, 1);

    const settings = new PostgresSettingsValueStore(db);
    const coordinate = Object.freeze({ key: `f4.integration.${randomUUID()}`, scope: 'project' });
    const saved = await settings.compareAndWrite({
      coordinate, value: { enabled: true }, expectedVersion: 0, savedAt: now, savedByAccountId: accountId, source: 'f4-integration', operation: 'write',
    });
    assert.equal(saved.status, 'written');
    assert.equal((await settings.compareAndWrite({
      coordinate, value: { enabled: false }, expectedVersion: 0, savedAt: now, savedByAccountId: accountId, source: 'f4-stale', operation: 'write',
    })).status, 'version-conflict');
    assert.equal((await settings.listHistory(coordinate)).length, 1);
    assert.equal(await settings.markApplied(coordinate, 1), 'applied');

    const audit = new PostgresAuditStore(db);
    const auditId = randomUUID();
    await audit.append(Object.freeze({
      id: auditId, occurredAt: now, actionCode: 'f4.integration.audit', category: 'system', severity: 'info',
      actor: Object.freeze({ kind: 'account', accountId }), changes: Object.freeze([]), correlationId: `f4-${accountId}`,
      metadata: Object.freeze({ proof: true }),
    }));
    assert.equal((await audit.query({ correlationId: `f4-${accountId}` })).length, 1);
    await assert.rejects(() => db.query('UPDATE audit_records SET severity=$2 WHERE id=$1', [auditId, 'warning']), /audit_records is append-only/);

    // Prove the service-level transaction boundary, not only manual database.transaction usage.
    // The setting write must roll back if its audit append fails inside the same outer transaction.
    const serviceAtomicCoordinate = Object.freeze({ key: `f4.atomic.${randomUUID()}`, scope: 'project' });
    const serviceDefinition = Object.freeze({
      key: serviceAtomicCoordinate.key, owner: 'f4-integration', kind: 'configuration', lifecycle: 'experimental', runtimeBehavior: 'restart',
      valueType: 'integer', resolution: 'OVERRIDE', scopes: ['project'], precedence: ['project'], default: 1, minimum: 1, maximum: 10, sensitive: false,
    });
    const atomicActor = createActorContext({
      accountId, sessionId, roleIds: [], permissions: [settingsValuesManagePermission], assurance: 'AAL2', authenticatedAt: now,
    });
    const duplicateAudit = new AuditService(new PostgresAuditStore(db), new FixedClock(now), { next: () => auditId });
    const atomicSettings = new SettingsRuntimeService(
      settings, duplicateAudit, new FixedClock(now), createAtomicTransactionBoundary(db),
    );
    await assert.rejects(() => atomicSettings.write({
      definition: serviceDefinition, scope: 'project', value: 2, expectedVersion: 0, actor: atomicActor, correlationId: `f4-atomic-${randomUUID()}`,
    }));
    assert.equal(await settings.findCurrent(serviceAtomicCoordinate), null, 'failed audit append must roll back the setting state write');
    assert.equal((await settings.listHistory(serviceAtomicCoordinate)).length, 0, 'failed audit append must roll back setting history');

    const rollbackCoordinate = Object.freeze({ key: `f4.rollback.${randomUUID()}`, scope: 'project' });
    const rollbackCorrelation = `f4-rollback-${randomUUID()}`;
    await assert.rejects(() => db.transaction(async () => {
      await settings.compareAndWrite({
        coordinate: rollbackCoordinate, value: 1, expectedVersion: 0, savedAt: now, savedByAccountId: accountId, source: 'rollback-proof', operation: 'write',
      });
      await audit.append(Object.freeze({
        id: randomUUID(), occurredAt: now, actionCode: 'f4.integration.rollback', category: 'system', severity: 'info',
        actor: Object.freeze({ kind: 'account', accountId }), changes: Object.freeze([]), correlationId: rollbackCorrelation, metadata: Object.freeze({}),
      }));
      throw new Error('force-rollback');
    }), /force-rollback/);
    assert.equal(await settings.findCurrent(rollbackCoordinate), null);
    assert.equal((await audit.query({ correlationId: rollbackCorrelation })).length, 0);

    const idempotency = new PostgresIdempotencyStore(db);
    const key = `f4-${randomUUID()}`;
    const hash = hashIdempotencyRequest({ operation: 'f4-proof', amount: 1 });
    const otherHash = hashIdempotencyRequest({ operation: 'f4-proof', amount: 2 });
    const expiresAt = new Date(now.getTime() + 60_000);
    const firstClaim = await idempotency.claim({ operation: 'integration-proof', key, requestHash: hash, now, expiresAt });
    assert.deepEqual(firstClaim, { status: 'started', claimGeneration: 1 });
    assert.deepEqual(await idempotency.claim({ operation: 'integration-proof', key, requestHash: hash, now, expiresAt }), { status: 'in-progress' });
    assert.deepEqual(await idempotency.claim({ operation: 'integration-proof', key, requestHash: otherHash, now, expiresAt }), { status: 'conflict' });
    await idempotency.complete({ operation: 'integration-proof', key, requestHash: hash, claimGeneration: firstClaim.claimGeneration, response: { ok: true }, now });
    assert.deepEqual(await idempotency.claim({ operation: 'integration-proof', key, requestHash: hash, now, expiresAt }), { status: 'replay', response: { ok: true } });

    const fencedKey = `f4-fenced-${randomUUID()}`;
    const firstNow = new Date(now.getTime() + 10_000);
    const firstExpiry = new Date(firstNow.getTime() + 1_000);
    const staleClaim = await idempotency.claim({ operation: 'integration-fencing', key: fencedKey, requestHash: hash, now: firstNow, expiresAt: firstExpiry });
    assert.equal(staleClaim.status, 'started');
    const reclaimNow = new Date(firstExpiry.getTime() + 1);
    const activeClaim = await idempotency.claim({ operation: 'integration-fencing', key: fencedKey, requestHash: hash, now: reclaimNow, expiresAt: new Date(reclaimNow.getTime() + 60_000) });
    assert.deepEqual(activeClaim, { status: 'started', claimGeneration: staleClaim.claimGeneration + 1 });
    await assert.rejects(() => idempotency.complete({
      operation: 'integration-fencing', key: fencedKey, requestHash: hash, claimGeneration: staleClaim.claimGeneration,
      response: { stale: true }, now: reclaimNow,
    }), /active matching IN_PROGRESS claim generation/);
    await idempotency.complete({
      operation: 'integration-fencing', key: fencedKey, requestHash: hash, claimGeneration: activeClaim.claimGeneration,
      response: { ok: true }, now: reclaimNow,
    });
  } finally {
    await db.close();
  }
  assert.deepEqual(await checkPostgresReadiness(db), { status: 'DOWN', detail: 'database-unavailable' });
});
