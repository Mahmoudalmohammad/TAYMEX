import assert from 'node:assert/strict';
import test from 'node:test';
import { REDACTED_VALUE } from '@taymex/audit';
import { FixedClock } from '@taymex/foundation';
import {
  CompositeIdentitySecurityEventSink,
  CorrelationIdService,
  IdentitySecurityLogSink,
  RuntimeHealthReporter,
  StructuredLogger,
} from '../dist/index.js';
import { MemoryLogSink } from '../dist/testing.js';

const T0 = new Date('2026-08-29T11:00:00.000Z');
const RUNTIME = Object.freeze({ service: 'taymex-api', version: '0.1.0', environment: 'test', buildRevision: 'abc123' });

class SequenceCorrelationIds {
  value = 1;
  next() { return `corr-generated-${String(this.value++).padStart(4, '0')}`; }
}

function loggerHarness() {
  const sink = new MemoryLogSink();
  const logger = new StructuredLogger(sink, new FixedClock(T0), RUNTIME);
  return { sink, logger };
}

test('correlation service preserves valid incoming IDs and replaces blank malformed or overlong values', () => {
  const service = new CorrelationIdService(new SequenceCorrelationIds());
  assert.deepEqual(service.resolve('corr-incoming-1234'), { id: 'corr-incoming-1234', source: 'incoming' });
  assert.deepEqual(service.resolve(''), { id: 'corr-generated-0001', source: 'generated' });
  assert.deepEqual(service.resolve('bad id'), { id: 'corr-generated-0002', source: 'generated' });
  assert.deepEqual(service.resolve('x'.repeat(129)), { id: 'corr-generated-0003', source: 'generated' });
});

test('structured logger emits immutable runtime metadata and recursively redacts sensitive fields', async () => {
  const { sink, logger } = loggerHarness();
  const record = await logger.log({
    level: 'info',
    event: 'settings.value.changed',
    message: 'Setting changed.',
    correlationId: 'corr-logger-1234',
    fields: {
      accountId: 'acc-1',
      password: 'secret-password',
      nested: { token: 'raw-token', safe: 7 },
      cookie: 'session=value',
    },
  });

  assert.equal(record.timestamp.toISOString(), T0.toISOString());
  assert.equal(record.fields.password, REDACTED_VALUE);
  assert.deepEqual(record.fields.nested, { token: REDACTED_VALUE, safe: 7 });
  assert.equal(record.fields.cookie, REDACTED_VALUE);
  assert.deepEqual(record.runtime, RUNTIME);
  assert.equal(JSON.stringify(record).includes('secret-password'), false);
  assert.equal((sink.records()).length, 1);
});

test('identity security log sink preserves correlation and safe reason without credential material', async () => {
  const { sink, logger } = loggerHarness();
  const identitySink = new IdentitySecurityLogSink(logger);
  await identitySink.emit({
    eventId: 'identity.sign-in.failed',
    occurredAt: T0,
    subjectAccountId: 'acc-subject',
    sessionId: 'session-1',
    reason: 'wrong-password',
    correlationId: 'corr-identity-log',
  });
  const row = sink.records()[0];
  assert.equal(row.level, 'warn');
  assert.equal(row.event, 'identity.sign-in.failed');
  assert.equal(row.correlationId, 'corr-identity-log');
  assert.equal(row.fields.reason, 'wrong-password');
  assert.equal(JSON.stringify(row).includes('passwordHash'), false);
});

test('composite identity sink attempts every sink and fails loudly when any sink fails', async () => {
  const calls = [];
  const failing = { async emit() { calls.push('failing'); throw new Error('audit unavailable'); } };
  const succeeding = { async emit() { calls.push('succeeding'); } };
  const composite = new CompositeIdentitySecurityEventSink([failing, succeeding]);
  await assert.rejects(
    () => composite.emit({ eventId: 'identity.session.revoked', occurredAt: T0 }),
    (error) => error instanceof AggregateError && error.errors.length === 1,
  );
  assert.deepEqual(calls, ['failing', 'succeeding']);
});

test('liveness is process-level while readiness depends on every registered dependency check', async () => {
  const reporter = new RuntimeHealthReporter(RUNTIME, new FixedClock(T0), [
    { name: 'registry', async check() { return { status: 'UP' }; } },
    { name: 'database-placeholder', async check() { return { status: 'DOWN', detail: 'not-configured' }; } },
  ]);
  assert.deepEqual(reporter.liveness(), { status: 'UP', checkedAt: T0, runtime: RUNTIME });
  const readiness = await reporter.readiness();
  assert.equal(readiness.status, 'NOT_READY');
  assert.deepEqual(readiness.checks, [
    { name: 'registry', status: 'UP' },
    { name: 'database-placeholder', status: 'DOWN', detail: 'not-configured' },
  ]);
});

test('readiness converts thrown dependency checks into safe DOWN results and rejects duplicate check names', async () => {
  const reporter = new RuntimeHealthReporter(RUNTIME, new FixedClock(T0), [
    { name: 'dependency', async check() { throw new Error('provider secret detail'); } },
  ]);
  const readiness = await reporter.readiness();
  assert.equal(readiness.status, 'NOT_READY');
  assert.deepEqual(readiness.checks, [{ name: 'dependency', status: 'DOWN', detail: 'check-failed' }]);
  assert.equal(JSON.stringify(readiness).includes('provider secret detail'), false);

  assert.throws(
    () => new RuntimeHealthReporter(RUNTIME, new FixedClock(T0), [
      { name: 'same', async check() { return { status: 'UP' }; } },
      { name: 'same', async check() { return { status: 'UP' }; } },
    ]),
    /Duplicate readiness check name/,
  );
});


test('reference memory log sink is bounded and drops oldest records instead of growing without limit', async () => {
  const sink = new MemoryLogSink(2);
  const logger = new StructuredLogger(sink, new FixedClock(T0), RUNTIME);
  await logger.log({ level: 'info', event: 'test.first', message: 'first' });
  await logger.log({ level: 'info', event: 'test.second', message: 'second' });
  await logger.log({ level: 'info', event: 'test.third', message: 'third' });
  assert.deepEqual(sink.records().map((row) => row.event), ['test.second', 'test.third']);
  assert.throws(() => new MemoryLogSink(0), RangeError);
});
