import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthorizationDeniedError } from '@engineering-platform/authorization';
import { FixedClock, ValidationError } from '@taymex/foundation';
import { createActorContext, IDENTITY_ERROR_CODES, IdentityError } from '@taymex/identity';
import {
  AuditQueryService,
  AuditService,
  IdentitySecurityAuditSink,
  REDACTED_VALUE,
  auditRecordsReadPermission,
} from '../dist/index.js';
import { MemoryAuditStore } from '../dist/testing.js';

const T0 = new Date('2026-08-29T09:00:00.000Z');

class SequenceIds {
  value = 1;
  next() { return `550e8400-e29b-41d4-a716-${String(1000 + this.value++).padStart(12, '0')}`; }
}

function actor(permissions = [], assurance = 'AAL2') {
  return createActorContext({
    accountId: '550e8400-e29b-41d4-a716-446655440001',
    sessionId: 'session-audit-1',
    roleIds: [],
    permissions,
    assurance,
    authenticatedAt: T0,
  });
}

function harness() {
  const store = new MemoryAuditStore();
  const audit = new AuditService(store, new FixedClock(T0), new SequenceIds());
  return { store, audit };
}

test('audit records are immutable append-only structured records with recursive sensitive redaction', async () => {
  const { store, audit } = harness();
  const record = await audit.record({
    actionCode: 'settings.value.changed',
    category: 'settings',
    severity: 'info',
    actor: { kind: 'account', accountId: 'acc-1', sessionId: 'session-1' },
    resource: { type: 'setting', id: 'catalog.products.defaultPageSize@project' },
    changes: [
      { field: 'password', before: 'old', after: 'new' },
      { field: 'pageSize', before: 25, after: 50 },
    ],
    correlationId: 'corr-12345678',
    metadata: {
      nested: { token: 'raw-token', safe: 'kept' },
      authorization: 'Bearer secret',
      reason: 'admin-change',
    },
  });

  assert.equal(record.id, '550e8400-e29b-41d4-a716-000000001001');
  assert.equal(record.occurredAt.toISOString(), T0.toISOString());
  assert.equal(record.changes[0].before, REDACTED_VALUE);
  assert.equal(record.changes[0].after, REDACTED_VALUE);
  assert.equal(record.changes[1].after, 50);
  assert.deepEqual(record.metadata.nested, { token: REDACTED_VALUE, safe: 'kept' });
  assert.equal(record.metadata.authorization, REDACTED_VALUE);
  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.metadata), true);
  assert.equal(typeof store.update, 'undefined');
  assert.equal(typeof store.delete, 'undefined');

  const rows = await store.query({ limit: 10 });
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0], record);
  assert.equal(rows[0].changes[0].after, REDACTED_VALUE);
});

test('audit rejects non-UUID record identifiers before reaching persistence', async () => {
  const store = new MemoryAuditStore();
  const audit = new AuditService(store, new FixedClock(T0), { next: () => 'not-a-uuid' });
  await assert.rejects(
    () => audit.record({ actionCode: 'system.started', category: 'system', severity: 'info', actor: { kind: 'system', systemId: 'api' }, changes: [], metadata: {} }),
    (error) => error instanceof ValidationError && error.issues.some((issue) => issue.field === 'auditId' && issue.code === 'UUID'),
  );
  assert.equal((await store.query({ limit: 10 })).length, 0);
});

test('audit store rejects duplicate IDs and bounds query size', async () => {
  const { store, audit } = harness();
  const first = await audit.record({
    actionCode: 'system.started', category: 'system', severity: 'info', actor: { kind: 'system', systemId: 'api' }, changes: [], metadata: {},
  });
  await assert.rejects(() => store.append(first), /Duplicate audit record id/);
  await assert.rejects(() => store.query({ limit: 101 }), RangeError);
});

test('identity security events map into the canonical audit contract with correlation and safe reason', async () => {
  const { store, audit } = harness();
  const sink = new IdentitySecurityAuditSink(audit);
  await sink.emit({
    eventId: 'identity.sign-in.failed',
    occurredAt: T0,
    subjectAccountId: 'acc-subject',
    reason: 'wrong-password',
    correlationId: 'corr-identity-0001',
  });

  const rows = await store.query({ actionCode: 'identity.sign-in.failed', limit: 5 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].category, 'security');
  assert.equal(rows[0].severity, 'warning');
  assert.equal(rows[0].correlationId, 'corr-identity-0001');
  assert.deepEqual(rows[0].subject, { type: 'identity.account', id: 'acc-subject' });
  assert.equal(rows[0].metadata.reason, 'wrong-password');
  assert.equal(JSON.stringify(rows[0]).includes('raw-token'), false);
});

test('audit query requires canonical permission and AAL2 assurance', async () => {
  const { store, audit } = harness();
  await audit.record({ actionCode: 'system.started', category: 'system', severity: 'info', actor: { kind: 'system', systemId: 'api' }, changes: [], metadata: {} });
  const query = new AuditQueryService(store);

  await assert.rejects(
    () => query.query(actor([], 'AAL2')),
    (error) => error instanceof AuthorizationDeniedError && error.permission === auditRecordsReadPermission,
  );

  await assert.rejects(
    () => query.query(actor([auditRecordsReadPermission], 'AAL1')),
    (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.assuranceRequired,
  );

  const rows = await query.query(actor([auditRecordsReadPermission], 'AAL2'), { actionPrefix: 'system.', limit: 10 });
  assert.equal(rows.length, 1);
});

test('audit filtering is bounded and supports correlation/resource investigation', async () => {
  const { store, audit } = harness();
  await audit.record({ actionCode: 'domain.product.changed', category: 'domain', severity: 'info', actor: { kind: 'account', accountId: 'a1' }, resource: { type: 'product', id: 'p1' }, changes: [], correlationId: 'corr-aaaaaaaa', metadata: {} });
  await audit.record({ actionCode: 'domain.product.changed', category: 'domain', severity: 'info', actor: { kind: 'account', accountId: 'a2' }, resource: { type: 'product', id: 'p2' }, changes: [], correlationId: 'corr-bbbbbbbb', metadata: {} });

  assert.equal((await store.query({ resourceType: 'product', resourceId: 'p1', limit: 5 })).length, 1);
  assert.equal((await store.query({ actorAccountId: 'a2', correlationId: 'corr-bbbbbbbb', limit: 5 })).length, 1);
});
