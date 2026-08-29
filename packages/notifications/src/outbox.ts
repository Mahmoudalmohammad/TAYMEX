import { randomUUID } from 'node:crypto';
import type { IdentityRepository, SecretDelivery, SecretDeliverySink } from '@taymex/identity';
import type {
  NotificationOutboxRecord,
  NotificationOutboxStore,
  NotificationPayloadCodec,
  NotificationProvider,
  NotificationRecipientResolver,
  NotificationProviderRequest,
} from './contracts.js';
import { NotificationProviderError } from './contracts.js';
import { notificationEventDescriptors, notificationSecretDeliveryRequestedEvent } from './generated/events.generated.js';

const SECRET_EVENT = notificationEventDescriptors[notificationSecretDeliveryRequestedEvent];

export class SecretDeliveryOutboxSink implements SecretDeliverySink {
  constructor(
    private readonly store: NotificationOutboxStore,
    private readonly codec: NotificationPayloadCodec,
    private readonly now: () => Date = () => new Date(),
    private readonly nextId: () => string = randomUUID,
  ) {
    if (SECRET_EVENT.delivery !== 'outbox' || SECRET_EVENT.classification !== 'sensitive' || SECRET_EVENT.idempotencyKey !== 'deliveryId') {
      throw new Error('Canonical secret-delivery event registry metadata is incompatible with the outbox runtime contract.');
    }
  }

  async deliver(delivery: SecretDelivery): Promise<void> {
    const id = requireUuid(this.nextId(), 'outboxId');
    const deliveryId = requireUuid(delivery.deliveryId, 'deliveryId');
    const accountId = requireUuid(delivery.accountId, 'accountId');
    const createdAt = new Date(this.now().getTime());
    if (!(delivery.expiresAt instanceof Date) || Number.isNaN(delivery.expiresAt.getTime()) || delivery.expiresAt <= createdAt) {
      throw new TypeError('Secret delivery expiry must be in the future.');
    }
    const payload = this.codec.encrypt(Object.freeze({ purpose: delivery.purpose, secret: delivery.secret, expiresAt: new Date(delivery.expiresAt.getTime()) }), id);
    const record: NotificationOutboxRecord = Object.freeze({
      id,
      eventId: notificationSecretDeliveryRequestedEvent,
      eventVersion: SECRET_EVENT.version,
      dedupeKey: `secret-delivery:${deliveryId}`,
      recipientAccountId: accountId,
      payload,
      createdAt,
      availableAt: createdAt,
      attemptCount: 0,
      status: 'PENDING',
      leaseToken: null,
      leaseExpiresAt: null,
      lastErrorCode: null,
      deliveredAt: null,
    });
    await this.store.enqueue(record);
  }
}

export type NotificationOutboxProcessorOptions = Readonly<{
  batchSize?: number;
  leaseDurationMs?: number;
  maxAttempts?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  now?: () => Date;
  nextLeaseToken?: () => string;
}>;

export class NotificationOutboxProcessor {
  readonly #batchSize: number;
  readonly #leaseDurationMs: number;
  readonly #maxAttempts: number;
  readonly #baseRetryDelayMs: number;
  readonly #maxRetryDelayMs: number;
  readonly #now: () => Date;
  readonly #nextLeaseToken: () => string;

  constructor(
    private readonly store: NotificationOutboxStore,
    private readonly codec: NotificationPayloadCodec,
    private readonly recipients: NotificationRecipientResolver,
    private readonly provider: NotificationProvider,
    options: NotificationOutboxProcessorOptions = {},
  ) {
    this.#batchSize = boundedInteger(options.batchSize ?? 25, 1, 100, 'batchSize');
    this.#leaseDurationMs = boundedInteger(options.leaseDurationMs ?? 30_000, 1_000, 5 * 60_000, 'leaseDurationMs');
    this.#maxAttempts = boundedInteger(options.maxAttempts ?? 5, 1, 10, 'maxAttempts');
    this.#baseRetryDelayMs = boundedInteger(options.baseRetryDelayMs ?? 5_000, 100, 60 * 60_000, 'baseRetryDelayMs');
    this.#maxRetryDelayMs = boundedInteger(options.maxRetryDelayMs ?? 5 * 60_000, this.#baseRetryDelayMs, 24 * 60 * 60_000, 'maxRetryDelayMs');
    this.#now = options.now ?? (() => new Date());
    this.#nextLeaseToken = options.nextLeaseToken ?? randomUUID;
  }

  async processOnce(): Promise<Readonly<{ claimed: number; delivered: number; retried: number; dead: number }>> {
    const claimTime = new Date(this.#now().getTime());
    const leaseToken = requireUuid(this.#nextLeaseToken(), 'leaseToken');
    const jobs = await this.store.claimBatch({ now: claimTime, limit: this.#batchSize, leaseToken, leaseDurationMs: this.#leaseDurationMs });
    let delivered = 0;
    let retried = 0;
    let dead = 0;
    for (const job of jobs) {
      try {
        const payload = this.codec.decrypt(job.payload, job.id);
        const now = new Date(this.#now().getTime());
        if (payload.expiresAt <= now) {
          if (await this.store.markDead({ id: job.id, leaseToken, errorCode: 'delivery-expired' }) === 'updated') dead += 1;
          continue;
        }
        const recipient = await this.recipients.resolve(job.recipientAccountId);
        if (!recipient) {
          const outcome = await this.store.markFailed({ id: job.id, leaseToken, errorCode: 'recipient-unavailable', nextAvailableAt: new Date(now.getTime() + this.#retryDelay(job.attemptCount)), maxAttempts: this.#maxAttempts });
          if (outcome === 'DEAD') dead += 1; else if (outcome === 'PENDING') retried += 1;
          continue;
        }
        const request: NotificationProviderRequest = Object.freeze({
          deliveryId: job.id,
          idempotencyKey: job.dedupeKey,
          recipient,
          templateId: payload.purpose === 'password-reset' ? 'identity.password-reset' : 'identity.email-verification',
          locale: requireLocale(recipient.locale),
          mandatory: true,
          secret: payload.secret,
          expiresAt: new Date(payload.expiresAt.getTime()),
        });
        await this.provider.send(request);
        if (await this.store.markDelivered({ id: job.id, leaseToken, deliveredAt: now }) === 'updated') delivered += 1;
      } catch (error) {
        const now = new Date(this.#now().getTime());
        const errorCode = error instanceof NotificationProviderError ? normalizeErrorCode(error.code) : 'provider-error';
        const outcome = await this.store.markFailed({ id: job.id, leaseToken, errorCode, nextAvailableAt: new Date(now.getTime() + this.#retryDelay(job.attemptCount)), maxAttempts: this.#maxAttempts });
        if (outcome === 'DEAD') dead += 1; else if (outcome === 'PENDING') retried += 1;
      }
    }
    return Object.freeze({ claimed: jobs.length, delivered, retried, dead });
  }

  #retryDelay(attemptCount: number): number {
    return Math.min(this.#maxRetryDelayMs, this.#baseRetryDelayMs * (2 ** Math.min(attemptCount, 16)));
  }
}

export class IdentityRepositoryRecipientResolver implements NotificationRecipientResolver {
  constructor(private readonly repository: IdentityRepository, private readonly defaultLocale: string) {
    requireLocale(defaultLocale);
  }
  async resolve(accountId: string) {
    const account = await this.repository.findAccountById(requireUuid(accountId, 'accountId'));
    if (!account || account.status !== 'ACTIVE') return null;
    return Object.freeze({ channel: 'email' as const, address: account.email, locale: requireLocale(this.defaultLocale) });
  }
}

function boundedInteger(value: number, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
  return value;
}

function requireUuid(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)) throw new TypeError(`${field} must be a UUID.`);
  return normalized;
}

function requireLocale(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(normalized)) throw new TypeError('Notification locale is invalid.');
  return normalized;
}

function normalizeErrorCode(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,63}$/u.test(normalized)) return 'provider-error';
  return normalized;
}
