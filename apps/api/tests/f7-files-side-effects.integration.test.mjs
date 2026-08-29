import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { FixedClock } from '@taymex/foundation';
import {
  IdentityService,
  PostgresIdentityRepository,
  ScryptPasswordHasher,
  SecretTokenService,
} from '@taymex/identity';
import { MemoryAuthenticationThrottle } from '@taymex/identity/testing';
import {
  PostgresDatabase,
  PostgresMigrationRunner,
  createAtomicTransactionBoundary,
  createNodePgPool,
} from '@taymex/data-postgres';
import {
  AesGcmNotificationPayloadCodec,
  NotificationOutboxProcessor,
  NotificationProviderError,
  PostgresNotificationOutboxStore,
  SecretDeliveryOutboxSink,
} from '@taymex/notifications';
import { CapturingNotificationProvider, StaticRecipientResolver } from '@taymex/notifications/testing';

const url = process.env.TEST_DATABASE_URL?.trim();
const enabled = process.env.F7_DATABASE_TESTS === '1';
const skipReason = !url ? 'TEST_DATABASE_URL is not configured' : !enabled ? 'F7_DATABASE_TESTS=1 is required for the disposable database proof' : false;
const T0 = new Date('2026-08-29T16:30:00.000Z');
const PASSWORD = 'Correct-Horse-Battery-2026!';
const ACCOUNT_EMAIL = 'f7-proof@taymex.example';
const KEY = Buffer.alloc(32, 11);

class SequenceIds {
  value = 10;
  next() { return `550e8400-e29b-41d4-a716-${String(446655440000 + this.value++).padStart(12, '0')}`; }
}

function makeIdentity(database, secretDelivery, clock, ids) {
  return new IdentityService(
    new PostgresIdentityRepository(database),
    { async resolve() { return Object.freeze({ roleIds: Object.freeze([]), permissions: new Set() }); } },
    new ScryptPasswordHasher(),
    new SecretTokenService(),
    new MemoryAuthenticationThrottle(),
    { async emit() {} },
    secretDelivery,
    clock,
    ids,
    createAtomicTransactionBoundary(database),
  );
}

test('PostgreSQL 18 proves F7 transactional encrypted outbox, claim concurrency, retry/dead-letter and delivery idempotency', { skip: skipReason }, async () => {
  const pool = await createNodePgPool({ connectionString: url, applicationName: 'taymex-f7-integration', max: 6 });
  const database = new PostgresDatabase(pool);
  const migrations = fileURLToPath(new URL('../../../packages/data-postgres/migrations/', import.meta.url));
  const clock = new FixedClock(T0);
  const codec = new AesGcmNotificationPayloadCodec(KEY);
  const store = new PostgresNotificationOutboxStore(database);
  const durableSink = new SecretDeliveryOutboxSink(store, codec, () => clock.now());
  const ids = new SequenceIds();
  try {
    const version = await database.query('SHOW server_version_num');
    const versionNum = Number(version.rows[0]?.server_version_num);
    assert.equal(Math.floor(versionNum / 10000), 18, `Expected PostgreSQL 18, got ${versionNum}`);
    await new PostgresMigrationRunner(pool).migrate(migrations);

    const identity = makeIdentity(database, durableSink, clock, ids);
    const account = await identity.provisionPasswordAccount({ email: ACCOUNT_EMAIL, password: PASSWORD, correlationId: 'f7-provision' });

    const forcedRollbackSink = {
      async deliver(delivery) {
        await durableSink.deliver(delivery);
        throw new Error('forced-after-outbox-enqueue');
      },
    };
    const rollbackIdentity = makeIdentity(database, forcedRollbackSink, clock, ids);
    await assert.rejects(() => rollbackIdentity.requestPasswordReset(account.email, 'f7-rollback'), /forced-after-outbox-enqueue/);
    const afterRollback = await database.query(
      `SELECT
         (SELECT count(*)::int FROM identity_challenges WHERE account_id=$1 AND kind='PASSWORD_RESET') AS challenges,
         (SELECT count(*)::int FROM foundation_outbox_messages WHERE recipient_account_id=$1) AS outbox`,
      [account.id],
    );
    assert.deepEqual(afterRollback.rows[0], { challenges: 0, outbox: 0 }, 'challenge and outbox must roll back together');

    assert.deepEqual(await identity.requestPasswordReset(account.email, 'f7-success'), { accepted: true });
    const pending = await database.query(
      `SELECT id, event_id, dedupe_key, payload_algorithm, payload_key_version,
              payload_ciphertext_base64, payload_iv_base64, payload_auth_tag_base64,
              status, attempt_count, recipient_account_id
         FROM foundation_outbox_messages
        WHERE recipient_account_id=$1`,
      [account.id],
    );
    assert.equal(pending.rows.length, 1);
    const first = pending.rows[0];
    assert.equal(first.event_id, 'notification.secret-delivery.requested');
    assert.equal(first.status, 'PENDING');
    assert.equal(first.attempt_count, 0);
    const decrypted = codec.decrypt({
      algorithm: first.payload_algorithm,
      keyVersion: first.payload_key_version,
      ciphertextBase64: first.payload_ciphertext_base64,
      ivBase64: first.payload_iv_base64,
      authTagBase64: first.payload_auth_tag_base64,
    }, first.id);
    const serializedRow = JSON.stringify(first);
    assert.equal(serializedRow.includes(decrypted.secret), false, 'persisted outbox row must not contain the decrypted delivery secret');
    assert.equal(serializedRow.includes('f7-proof@taymex.example'), false, 'persisted outbox row must not contain the recipient address');
    assert.equal(typeof first.payload_ciphertext_base64, 'string');

    const leaseA = '550e8400-e29b-41d4-a716-446655440080';
    const leaseB = '550e8400-e29b-41d4-a716-446655440081';
    const [claimedA, claimedB] = await Promise.all([
      store.claimBatch({ now: T0, limit: 1, leaseToken: leaseA, leaseDurationMs: 30_000 }),
      store.claimBatch({ now: T0, limit: 1, leaseToken: leaseB, leaseDurationMs: 30_000 }),
    ]);
    assert.equal(claimedA.length + claimedB.length, 1, 'SKIP LOCKED claim must not hand one row to two processors');
    const claimed = claimedA[0] ?? claimedB[0];
    const winningLease = claimedA.length ? leaseA : leaseB;
    assert.equal(await store.markFailed({ id: claimed.id, leaseToken: winningLease, errorCode: 'proof-requeue', nextAvailableAt: T0, maxAttempts: 5 }), 'PENDING');

    const provider = new CapturingNotificationProvider();
    const resolver = new StaticRecipientResolver(new Map([[account.id, { channel: 'email', address: account.email, locale: 'ar' }]]));
    const processor = new NotificationOutboxProcessor(store, codec, resolver, provider, {
      now: () => clock.now(), batchSize: 10, nextLeaseToken: () => '550e8400-e29b-41d4-a716-446655440082',
    });
    const deliverySummary = await processor.processOnce();
    assert.equal(deliverySummary.delivered, 1);
    assert.equal(provider.deliveries.length, 1);
    assert.match(provider.deliveries[0].idempotencyKey, /^secret-delivery:/u);
    assert.equal(provider.deliveries[0].recipient.address, account.email);
    const delivered = await database.query('SELECT status, delivered_at, lease_token, lease_expires_at FROM foundation_outbox_messages WHERE id=$1', [first.id]);
    assert.equal(delivered.rows[0].status, 'DELIVERED');
    assert.ok(delivered.rows[0].delivered_at instanceof Date);
    assert.equal(delivered.rows[0].lease_token, null);
    assert.equal(delivered.rows[0].lease_expires_at, null);

    await identity.requestEmailVerification(account.id, 'f7-retry');
    let now = new Date(T0);
    let lease = 90;
    const failingProcessor = new NotificationOutboxProcessor(
      store,
      codec,
      resolver,
      { async send() { throw new NotificationProviderError('provider-unavailable'); } },
      {
        now: () => now,
        maxAttempts: 2,
        baseRetryDelayMs: 100,
        maxRetryDelayMs: 100,
        nextLeaseToken: () => `550e8400-e29b-41d4-a716-4466554400${lease++}`,
      },
    );
    assert.deepEqual(await failingProcessor.processOnce(), { claimed: 1, delivered: 0, retried: 1, dead: 0 });
    const retryRow = await database.query("SELECT id, available_at, attempt_count, last_error_code, status FROM foundation_outbox_messages WHERE status='PENDING' ORDER BY created_at DESC LIMIT 1");
    assert.equal(retryRow.rows[0].attempt_count, 1);
    assert.equal(retryRow.rows[0].last_error_code, 'provider-unavailable');
    now = new Date(retryRow.rows[0].available_at);
    assert.deepEqual(await failingProcessor.processOnce(), { claimed: 1, delivered: 0, retried: 0, dead: 1 });
    const deadRow = await database.query('SELECT status, attempt_count, last_error_code FROM foundation_outbox_messages WHERE id=$1', [retryRow.rows[0].id]);
    assert.deepEqual(deadRow.rows[0], { status: 'DEAD', attempt_count: 2, last_error_code: 'provider-unavailable' });

    const indexes = await database.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename='foundation_outbox_messages' ORDER BY indexname");
    const indexByName = new Map(indexes.rows.map((row) => [row.indexname, row.indexdef]));
    assert.match(indexByName.get('foundation_outbox_claim_idx') ?? '', /WHERE/iu);
    assert.match(indexByName.get('foundation_outbox_claim_idx') ?? '', /PENDING/iu);
    assert.match(indexByName.get('foundation_outbox_claim_idx') ?? '', /PROCESSING/iu);
    assert.ok(indexByName.has('foundation_outbox_dedupe_key_idx'));

    console.log(`f7.postgres.server_version_num=${versionNum}`);
    console.log('f7.outbox.rollback_atomic=PASS');
    console.log('f7.outbox.plaintext_persisted=false');
    console.log('f7.outbox.concurrent_double_claim=false');
    console.log('f7.outbox.provider_idempotency_key=PASS');
    console.log('f7.outbox.retry_dead_letter=PASS');
    console.log('f7.outbox.claim_index=foundation_outbox_claim_idx');
  } finally {
    await database.close();
  }
});
