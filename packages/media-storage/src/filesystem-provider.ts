import { chmod, mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { MediaStorageProvider, StoredMediaMetadata, StoredMediaObject } from './contracts.js';
import { MEDIA_MIME_TYPES } from './contracts.js';
import { MediaValidationError, requireAccountId, requireMediaClassification, requireMediaId, requireOriginalName } from './validation.js';

export class FileSystemMediaStorageProvider implements MediaStorageProvider {
  readonly #root: string;

  constructor(rootDirectory: string) {
    if (!rootDirectory.trim()) throw new TypeError('rootDirectory is required.');
    this.#root = resolve(rootDirectory);
  }

  async put(object: StoredMediaObject): Promise<void> {
    const key = requireOpaqueKey(object.metadata.storageKey);
    await mkdir(this.#root, { recursive: true, mode: 0o700 });
    await chmod(this.#root, 0o700);
    const binaryPath = this.#path(key, 'bin');
    const metadataPath = this.#path(key, 'json');
    let binaryCommitted = false;
    try {
      await writeFileExclusive(binaryPath, object.bytes, 0o600);
      binaryCommitted = true;
      await writeFileExclusive(metadataPath, Buffer.from(JSON.stringify(serializeMetadata(object.metadata)), 'utf8'), 0o600);
    } catch (error) {
      if (binaryCommitted) await rm(binaryPath, { force: true });
      throw error;
    }
  }

  async get(storageKey: string): Promise<StoredMediaObject | null> {
    const key = requireOpaqueKey(storageKey);
    const binaryPath = this.#path(key, 'bin');
    const metadataPath = this.#path(key, 'json');
    try {
      const [bytes, metadataRaw] = await Promise.all([readFile(binaryPath), readFile(metadataPath, 'utf8')]);
      return Object.freeze({ metadata: deserializeMetadata(JSON.parse(metadataRaw) as Record<string, unknown>, key), bytes });
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async remove(storageKey: string): Promise<void> {
    const key = requireOpaqueKey(storageKey);
    await Promise.all([rm(this.#path(key, 'bin'), { force: true }), rm(this.#path(key, 'json'), { force: true })]);
  }

  #path(key: string, extension: string): string {
    const candidate = resolve(join(this.#root, `${key}.${extension}`));
    if (dirname(candidate) !== this.#root) throw new MediaValidationError('INVALID_STORAGE_KEY', 'Storage key escaped the private media root.');
    return candidate;
  }
}

async function writeFileExclusive(path: string, bytes: Buffer, mode: number): Promise<void> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let created = false;
  try {
    handle = await open(path, 'wx', mode);
    created = true;
    await handle.writeFile(bytes);
    await handle.close();
    handle = undefined;
    const info = await stat(path);
    if (!info.isFile()) throw new Error('Media provider did not create a regular file.');
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    if (created) await rm(path, { force: true });
    throw error;
  }
}

function requireOpaqueKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)) {
    throw new MediaValidationError('INVALID_STORAGE_KEY', 'Storage key must be an opaque UUID.');
  }
  return normalized;
}

function serializeMetadata(metadata: StoredMediaMetadata): Record<string, unknown> {
  return { ...metadata, createdAt: metadata.createdAt.toISOString() };
}

function deserializeMetadata(value: Record<string, unknown>, expectedKey: string): StoredMediaMetadata {
  const id = requireMediaId(String(value.id ?? ''), 'metadata.id');
  const storageKey = requireOpaqueKey(String(value.storageKey ?? ''));
  if (id !== expectedKey || storageKey !== expectedKey) throw new MediaValidationError('MEDIA_METADATA_INVALID', 'Stored media metadata does not match the requested object key.');
  const originalName = requireOriginalName(String(value.originalName ?? ''));
  const detectedMimeType = String(value.detectedMimeType ?? '');
  if (!(MEDIA_MIME_TYPES as readonly string[]).includes(detectedMimeType)) throw new MediaValidationError('MEDIA_METADATA_INVALID', 'Stored media MIME metadata is invalid.');
  const sizeBytes = Number(value.sizeBytes);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 50 * 1024 * 1024) throw new MediaValidationError('MEDIA_METADATA_INVALID', 'Stored media size metadata is invalid.');
  const sha256 = String(value.sha256 ?? '').toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(sha256)) throw new MediaValidationError('MEDIA_METADATA_INVALID', 'Stored media integrity metadata is invalid.');
  const classification = requireMediaClassification(value.classification);
  const ownerAccountId = requireAccountId(String(value.ownerAccountId ?? ''), 'metadata.ownerAccountId');
  const createdAt = new Date(String(value.createdAt ?? ''));
  if (Number.isNaN(createdAt.getTime())) throw new MediaValidationError('MEDIA_METADATA_INVALID', 'Stored media metadata timestamp is invalid.');
  return Object.freeze({
    id, storageKey, originalName,
    detectedMimeType: detectedMimeType as StoredMediaMetadata['detectedMimeType'],
    sizeBytes, sha256, classification, ownerAccountId, createdAt,
  });
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
}
