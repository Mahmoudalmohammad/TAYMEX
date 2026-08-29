import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { EncryptedNotificationPayload, NotificationPayloadCodec, SecretNotificationPayload } from './contracts.js';

export class AesGcmNotificationPayloadCodec implements NotificationPayloadCodec {
  readonly #key: Buffer;

  constructor(key: Buffer) {
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new TypeError('Notification encryption key must be exactly 32 bytes.');
    this.#key = Buffer.from(key);
  }

  encrypt(payload: SecretNotificationPayload, associatedId: string): EncryptedNotificationPayload {
    validatePayload(payload);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#key, iv);
    cipher.setAAD(Buffer.from(requireAssociatedId(associatedId), 'utf8'));
    const plaintext = Buffer.from(JSON.stringify({ purpose: payload.purpose, secret: payload.secret, expiresAt: payload.expiresAt.toISOString() }), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Object.freeze({
      algorithm: 'A256GCM' as const,
      keyVersion: 'v1' as const,
      ivBase64: iv.toString('base64'),
      ciphertextBase64: ciphertext.toString('base64'),
      authTagBase64: cipher.getAuthTag().toString('base64'),
    });
  }

  decrypt(payload: EncryptedNotificationPayload, associatedId: string): SecretNotificationPayload {
    if (payload.algorithm !== 'A256GCM' || payload.keyVersion !== 'v1') throw new Error('Unsupported encrypted notification payload version.');
    const iv = Buffer.from(payload.ivBase64, 'base64');
    const ciphertext = Buffer.from(payload.ciphertextBase64, 'base64');
    const authTag = Buffer.from(payload.authTagBase64, 'base64');
    if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length < 1) throw new Error('Encrypted notification payload is malformed.');
    const decipher = createDecipheriv('aes-256-gcm', this.#key, iv);
    decipher.setAAD(Buffer.from(requireAssociatedId(associatedId), 'utf8'));
    decipher.setAuthTag(authTag);
    const decoded = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')) as Record<string, unknown>;
    const result: SecretNotificationPayload = Object.freeze({
      purpose: requirePurpose(decoded.purpose),
      secret: requireSecret(decoded.secret),
      expiresAt: requireDate(decoded.expiresAt),
    });
    validatePayload(result);
    return result;
  }
}

export function notificationEncryptionKeyFromBase64(value: string): Buffer {
  const normalized = value.trim();
  if (!normalized) throw new TypeError('Notification encryption key is required.');
  const key = Buffer.from(normalized, 'base64');
  if (key.length !== 32 || key.toString('base64').replace(/=+$/u, '') !== normalized.replace(/=+$/u, '')) {
    throw new TypeError('Notification encryption key must be base64 encoding of exactly 32 bytes.');
  }
  return key;
}

function validatePayload(payload: SecretNotificationPayload): void {
  requirePurpose(payload.purpose);
  requireSecret(payload.secret);
  if (!(payload.expiresAt instanceof Date) || Number.isNaN(payload.expiresAt.getTime())) throw new TypeError('Notification expiry must be a valid Date.');
}

function requirePurpose(value: unknown): SecretNotificationPayload['purpose'] {
  if (value === 'password-reset' || value === 'email-verification') return value;
  throw new TypeError('Notification secret-delivery purpose is invalid.');
}

function requireSecret(value: unknown): string {
  if (typeof value !== 'string' || value.length < 16 || value.length > 4096) throw new TypeError('Notification secret is invalid.');
  return value;
}

function requireDate(value: unknown): Date {
  const result = new Date(String(value));
  if (Number.isNaN(result.getTime())) throw new TypeError('Notification expiry is invalid.');
  return result;
}

function requireAssociatedId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)) throw new TypeError('Notification associated id must be a UUID.');
  return normalized;
}
