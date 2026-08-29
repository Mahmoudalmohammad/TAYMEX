import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AesGcmNotificationPayloadCodec,
  NotificationOutboxProcessor,
  NotificationProviderError,
  SecretDeliveryOutboxSink,
  notificationEventDescriptors,
  notificationSecretDeliveryRequestedEvent,
} from '../dist/index.js';
import { CapturingNotificationProvider, MemoryNotificationOutboxStore, StaticRecipientResolver } from '../dist/testing.js';

const ACCOUNT = '550e8400-e29b-41d4-a716-446655440001';
const DELIVERY = '550e8400-e29b-41d4-a716-446655440002';
const OUTBOX = '550e8400-e29b-41d4-a716-446655440003';
const LEASE = '550e8400-e29b-41d4-a716-446655440004';
const SECRET = 'secret-reset-token-that-must-never-be-persisted';
const T0 = new Date('2026-08-29T16:00:00.000Z');

function harness() {
  const store = new MemoryNotificationOutboxStore();
  const codec = new AesGcmNotificationPayloadCodec(Buffer.alloc(32, 7));
  const sink = new SecretDeliveryOutboxSink(store, codec, () => T0, () => OUTBOX);
  return { store, codec, sink };
}

test('canonical secret-delivery event is sensitive, outbox-delivered and keyed by deliveryId', () => {
  assert.deepEqual(notificationEventDescriptors[notificationSecretDeliveryRequestedEvent], {
    id: 'notification.secret-delivery.requested', owner: 'notifications', version: 1,
    delivery: 'outbox', classification: 'sensitive', lifecycle: 'experimental', idempotencyKey: 'deliveryId',
  });
});

test('secret delivery is encrypted before durable enqueue and duplicate deliveryId is idempotent', async () => {
  const { store, codec, sink } = harness();
  const delivery = { deliveryId: DELIVERY, purpose: 'password-reset', accountId: ACCOUNT, secret: SECRET, expiresAt: new Date(T0.getTime() + 60_000) };
  await sink.deliver(delivery);
  await sink.deliver(delivery);
  assert.equal(store.records.size, 1);
  const row = [...store.records.values()][0];
  assert.equal(row.eventId, 'notification.secret-delivery.requested');
  assert.equal(row.dedupeKey, `secret-delivery:${DELIVERY}`);
  assert.equal(JSON.stringify(row).includes(SECRET), false);
  assert.deepEqual(codec.decrypt(row.payload, row.id), { purpose: 'password-reset', secret: SECRET, expiresAt: delivery.expiresAt });
});

test('processor claims bounded work, sends outside enqueue path with stable provider idempotency, and marks delivered', async () => {
  const { store, codec, sink } = harness();
  await sink.deliver({ deliveryId: DELIVERY, purpose: 'email-verification', accountId: ACCOUNT, secret: SECRET, expiresAt: new Date(T0.getTime() + 60_000) });
  const provider = new CapturingNotificationProvider();
  const resolver = new StaticRecipientResolver(new Map([[ACCOUNT, { channel: 'email', address: 'owner@example.test', locale: 'ar' }]]));
  const processor = new NotificationOutboxProcessor(store, codec, resolver, provider, { now: () => T0, batchSize: 1, nextLeaseToken: () => LEASE });
  assert.deepEqual(await processor.processOnce(), { claimed: 1, delivered: 1, retried: 0, dead: 0 });
  assert.equal(provider.deliveries.length, 1);
  assert.equal(provider.deliveries[0].idempotencyKey, `secret-delivery:${DELIVERY}`);
  assert.equal(provider.deliveries[0].secret, SECRET);
  assert.equal([...store.records.values()][0].status, 'DELIVERED');
  assert.deepEqual(await processor.processOnce(), { claimed: 0, delivered: 0, retried: 0, dead: 0 });
});

test('provider failures persist only opaque codes, retry with backoff, and end in DEAD after bounded attempts', async () => {
  const { store, codec, sink } = harness();
  await sink.deliver({ deliveryId: DELIVERY, purpose: 'password-reset', accountId: ACCOUNT, secret: SECRET, expiresAt: new Date(T0.getTime() + 600_000) });
  let now = new Date(T0);
  const provider = { async send() { throw new NotificationProviderError('smtp-unavailable'); } };
  const resolver = new StaticRecipientResolver(new Map([[ACCOUNT, { channel: 'email', address: 'owner@example.test', locale: 'ar' }]]));
  let leaseCounter = 4;
  const processor = new NotificationOutboxProcessor(store, codec, resolver, provider, {
    now: () => now, maxAttempts: 2, baseRetryDelayMs: 100, maxRetryDelayMs: 1000,
    nextLeaseToken: () => `550e8400-e29b-41d4-a716-44665544000${leaseCounter++}`,
  });
  assert.deepEqual(await processor.processOnce(), { claimed: 1, delivered: 0, retried: 1, dead: 0 });
  let row = [...store.records.values()][0];
  assert.equal(row.status, 'PENDING');
  assert.equal(row.attemptCount, 1);
  assert.equal(row.lastErrorCode, 'smtp-unavailable');
  assert.equal(JSON.stringify(row).includes(SECRET), false);
  now = new Date(row.availableAt.getTime());
  assert.deepEqual(await processor.processOnce(), { claimed: 1, delivered: 0, retried: 0, dead: 1 });
  row = [...store.records.values()][0];
  assert.equal(row.status, 'DEAD');
  assert.equal(row.attemptCount, 2);
});

test('expired secret is dead-lettered without provider I/O', async () => {
  const { store, codec } = harness();
  const earlier = new Date(T0.getTime() - 120_000);
  const sink = new SecretDeliveryOutboxSink(store, codec, () => earlier, () => OUTBOX);
  await sink.deliver({ deliveryId: DELIVERY, purpose: 'password-reset', accountId: ACCOUNT, secret: SECRET, expiresAt: new Date(T0.getTime() - 1) });
  const provider = new CapturingNotificationProvider();
  const resolver = new StaticRecipientResolver(new Map([[ACCOUNT, { channel: 'email', address: 'owner@example.test', locale: 'ar' }]]));
  const processor = new NotificationOutboxProcessor(store, codec, resolver, provider, { now: () => T0, nextLeaseToken: () => LEASE });
  assert.deepEqual(await processor.processOnce(), { claimed: 1, delivered: 0, retried: 0, dead: 1 });
  assert.equal(provider.deliveries.length, 0);
  assert.equal([...store.records.values()][0].lastErrorCode, 'delivery-expired');
});
