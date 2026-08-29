import { randomUUID } from 'node:crypto';
import type { AuditRecorder } from '@taymex/audit';
import type { ImageSanitizer, MediaAccessPolicy, MediaStorageProvider, StoredMediaMetadata, StoredMediaObject, UploadMediaInput } from './contracts.js';
import { detectMediaMime, MediaValidationError, requireAccountId, requireMediaClassification, requireMediaId, requireOriginalName, sha256Hex } from './validation.js';

export type MediaServiceOptions = Readonly<{
  maxUploadBytes?: number;
  now?: () => Date;
  nextId?: () => string;
}>;

export class MediaService {
  readonly #maxUploadBytes: number;
  readonly #now: () => Date;
  readonly #nextId: () => string;

  constructor(
    private readonly storage: MediaStorageProvider,
    private readonly access: MediaAccessPolicy,
    private readonly sanitizer: ImageSanitizer,
    private readonly audit: AuditRecorder,
    options: MediaServiceOptions = {},
  ) {
    this.#maxUploadBytes = options.maxUploadBytes ?? 10 * 1024 * 1024;
    if (!Number.isSafeInteger(this.#maxUploadBytes) || this.#maxUploadBytes < 1 || this.#maxUploadBytes > 50 * 1024 * 1024) {
      throw new RangeError('maxUploadBytes must be between 1 byte and 50 MiB.');
    }
    this.#now = options.now ?? (() => new Date());
    this.#nextId = options.nextId ?? randomUUID;
  }

  async upload(input: UploadMediaInput): Promise<StoredMediaMetadata> {
    const actorAccountId = requireAccountId(input.actorAccountId, 'actorAccountId');
    const ownerAccountId = requireAccountId(input.ownerAccountId, 'ownerAccountId');
    const originalName = requireOriginalName(input.originalName);
    const classification = requireMediaClassification(input.classification);
    if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 1) throw new MediaValidationError('EMPTY_UPLOAD', 'Upload content is empty.');
    if (input.bytes.length > this.#maxUploadBytes) throw new MediaValidationError('UPLOAD_TOO_LARGE', 'Upload exceeds the configured media size limit.');
    if (!(await this.access.canUpload({ actorAccountId, ownerAccountId, classification }))) {
      throw new MediaValidationError('MEDIA_ACCESS_DENIED', 'Media upload is not authorized.');
    }

    const detectedMimeType = detectMediaMime(input.bytes);
    requireMatchingOriginalExtension(originalName, detectedMimeType);
    if (input.declaredMimeType && input.declaredMimeType.toLowerCase() !== detectedMimeType) {
      throw new MediaValidationError('MIME_MISMATCH', 'Declared media type does not match detected content.');
    }
    const sanitized = await this.sanitizer.sanitize(detectedMimeType, Buffer.from(input.bytes));
    if (detectMediaMime(sanitized) !== detectedMimeType) throw new MediaValidationError('SANITIZER_TYPE_DRIFT', 'Sanitized media type changed unexpectedly.');
    if (sanitized.length > this.#maxUploadBytes) throw new MediaValidationError('UPLOAD_TOO_LARGE', 'Sanitized media exceeds the configured media size limit.');

    const id = requireMediaId(this.#nextId(), 'mediaId');
    const metadata: StoredMediaMetadata = Object.freeze({
      id,
      storageKey: id,
      originalName,
      detectedMimeType,
      sizeBytes: sanitized.length,
      sha256: sha256Hex(sanitized),
      classification,
      ownerAccountId,
      createdAt: new Date(this.#now().getTime()),
    });
    const object = Object.freeze({ metadata, bytes: Buffer.from(sanitized) });
    await this.storage.put(object);
    try {
      await this.audit.record({
        actionCode: 'media.uploaded',
        category: 'data-access',
        severity: 'info',
        actor: { kind: 'account', accountId: actorAccountId },
        resource: { type: 'media.object', id },
        changes: [],
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
        metadata: { ownerAccountId, classification, detectedMimeType, sizeBytes: metadata.sizeBytes },
      });
    } catch (error) {
      await this.storage.remove(metadata.storageKey).catch(() => undefined);
      throw error;
    }
    return metadata;
  }

  async download(actorAccountId: string, storageKey: string, correlationId?: string): Promise<StoredMediaObject> {
    const actor = requireAccountId(actorAccountId, 'actorAccountId');
    const object = await this.storage.get(requireStorageKey(storageKey));
    if (!object) throw new MediaValidationError('MEDIA_NOT_FOUND', 'Media object was not found.');
    if (!(await this.access.canDownload({ actorAccountId: actor, metadata: object.metadata }))) {
      throw new MediaValidationError('MEDIA_ACCESS_DENIED', 'Media download is not authorized.');
    }
    if (object.bytes.length !== object.metadata.sizeBytes || sha256Hex(object.bytes) !== object.metadata.sha256) {
      throw new MediaValidationError('MEDIA_INTEGRITY_FAILED', 'Stored media failed integrity verification.');
    }
    await this.audit.record({
      actionCode: 'media.downloaded',
      category: 'data-access',
      severity: 'info',
      actor: { kind: 'account', accountId: actor },
      resource: { type: 'media.object', id: object.metadata.id },
      changes: [],
      ...(correlationId ? { correlationId } : {}),
      metadata: { ownerAccountId: object.metadata.ownerAccountId, classification: object.metadata.classification, detectedMimeType: object.metadata.detectedMimeType },
    });
    return Object.freeze({ metadata: object.metadata, bytes: Buffer.from(object.bytes) });
  }

  async delete(actorAccountId: string, storageKey: string, correlationId?: string): Promise<void> {
    const actor = requireAccountId(actorAccountId, 'actorAccountId');
    const key = requireStorageKey(storageKey);
    const object = await this.storage.get(key);
    if (!object) return;
    if (!(await this.access.canDelete({ actorAccountId: actor, metadata: object.metadata }))) {
      throw new MediaValidationError('MEDIA_ACCESS_DENIED', 'Media deletion is not authorized.');
    }
    await this.storage.remove(key);
    try {
      await this.audit.record({
        actionCode: 'media.deleted',
        category: 'data-access',
        severity: 'info',
        actor: { kind: 'account', accountId: actor },
        resource: { type: 'media.object', id: object.metadata.id },
        changes: [],
        ...(correlationId ? { correlationId } : {}),
        metadata: { ownerAccountId: object.metadata.ownerAccountId, classification: object.metadata.classification },
      });
    } catch (auditError) {
      try {
        await this.storage.put(object);
      } catch (restoreError) {
        throw new AggregateError([auditError, restoreError], 'Media deletion audit failed and the deleted object could not be restored.');
      }
      throw auditError;
    }
  }
}

function requireStorageKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)) {
    throw new MediaValidationError('INVALID_STORAGE_KEY', 'Storage key is invalid.');
  }
  return normalized;
}

function requireMatchingOriginalExtension(originalName: string, mimeType: StoredMediaMetadata['detectedMimeType']): void {
  const lower = originalName.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 1 || dot === lower.length - 1) throw new MediaValidationError('INVALID_FILE_EXTENSION', 'Original filename must include a supported image extension.');
  const extension = lower.slice(dot + 1);
  const accepted = mimeType === 'image/png' ? ['png'] : ['jpg', 'jpeg'];
  if (!accepted.includes(extension)) throw new MediaValidationError('FILE_EXTENSION_MISMATCH', 'Original filename extension does not match detected media content.');
}
