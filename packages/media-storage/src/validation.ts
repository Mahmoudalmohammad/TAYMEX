import { createHash } from 'node:crypto';
import { MEDIA_CLASSIFICATIONS, type MediaClassification, type MediaMimeType } from './contracts.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class MediaValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

export function detectMediaMime(bytes: Buffer): MediaMimeType {
  if (bytes.length >= PNG_SIGNATURE.length && bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  throw new MediaValidationError('UNSUPPORTED_MEDIA_TYPE', 'Media content type is unsupported or does not match a recognized safe image signature.');
}

export function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function requireOriginalName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 255 || /[\u0000-\u001f\u007f]/u.test(trimmed) || /[\\/]/u.test(trimmed)) {
    throw new MediaValidationError('INVALID_ORIGINAL_NAME', 'Original filename is invalid.');
  }
  return trimmed;
}

export function requireAccountId(value: string, field: string): string {
  return requireUuid(value, field, 'INVALID_ACCOUNT_ID');
}

export function requireMediaId(value: string, field: string): string {
  return requireUuid(value, field, 'INVALID_MEDIA_ID');
}

export function requireMediaClassification(value: unknown): MediaClassification {
  if (typeof value === 'string' && (MEDIA_CLASSIFICATIONS as readonly string[]).includes(value)) return value as MediaClassification;
  throw new MediaValidationError('INVALID_MEDIA_CLASSIFICATION', 'Media classification is invalid.');
}

function requireUuid(value: string, field: string, code: string): string {
  const normalized = value.trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) throw new MediaValidationError(code, `${field} must be a UUID.`);
  return normalized;
}
