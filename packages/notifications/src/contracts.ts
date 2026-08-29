import type { SecretDeliveryPurpose } from '@taymex/identity';
import type { GeneratedNotificationEventId } from './generated/events.generated.js';

export const OUTBOX_STATUSES = ['PENDING', 'PROCESSING', 'DELIVERED', 'DEAD'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export type EncryptedNotificationPayload = Readonly<{
  algorithm: 'A256GCM';
  keyVersion: 'v1';
  ivBase64: string;
  ciphertextBase64: string;
  authTagBase64: string;
}>;

export type SecretNotificationPayload = Readonly<{
  purpose: SecretDeliveryPurpose;
  secret: string;
  expiresAt: Date;
}>;

export type NotificationOutboxRecord = Readonly<{
  id: string;
  eventId: GeneratedNotificationEventId;
  eventVersion: number;
  dedupeKey: string;
  recipientAccountId: string;
  payload: EncryptedNotificationPayload;
  createdAt: Date;
  availableAt: Date;
  attemptCount: number;
  status: OutboxStatus;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  lastErrorCode: string | null;
  deliveredAt: Date | null;
}>;

export interface NotificationOutboxStore {
  enqueue(record: NotificationOutboxRecord): Promise<'enqueued' | 'duplicate'>;
  claimBatch(input: Readonly<{ now: Date; limit: number; leaseToken: string; leaseDurationMs: number }>): Promise<readonly NotificationOutboxRecord[]>;
  markDelivered(input: Readonly<{ id: string; leaseToken: string; deliveredAt: Date }>): Promise<'updated' | 'lease-lost'>;
  markFailed(input: Readonly<{ id: string; leaseToken: string; errorCode: string; nextAvailableAt: Date; maxAttempts: number }>): Promise<'PENDING' | 'DEAD' | 'lease-lost'>;
  markDead(input: Readonly<{ id: string; leaseToken: string; errorCode: string }>): Promise<'updated' | 'lease-lost'>;
}

export interface NotificationPayloadCodec {
  encrypt(payload: SecretNotificationPayload, associatedId: string): EncryptedNotificationPayload;
  decrypt(payload: EncryptedNotificationPayload, associatedId: string): SecretNotificationPayload;
}

export type NotificationRecipient = Readonly<{
  channel: 'email';
  address: string;
  locale: string;
}>;

export interface NotificationRecipientResolver {
  resolve(accountId: string): Promise<NotificationRecipient | null>;
}

export type NotificationProviderRequest = Readonly<{
  deliveryId: string;
  idempotencyKey: string;
  recipient: NotificationRecipient;
  templateId: 'identity.password-reset' | 'identity.email-verification';
  locale: string;
  mandatory: true;
  secret: string;
  expiresAt: Date;
}>;

export interface NotificationProvider {
  send(request: NotificationProviderRequest): Promise<void>;
}

export class NotificationProviderError extends Error {
  constructor(public readonly code: string) {
    super('Notification provider failed.');
    this.name = 'NotificationProviderError';
  }
}
