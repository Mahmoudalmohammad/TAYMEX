import assert from 'node:assert/strict';
import { chmod, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import test from 'node:test';
import sharp from 'sharp';
import {
  FileSystemMediaStorageProvider,
  MediaService,
  MediaValidationError,
  MetadataStrippingImageSanitizer,
} from '../dist/index.js';
import { OwnerOnlyMediaAccessPolicy } from '../dist/testing.js';

const OWNER = '550e8400-e29b-41d4-a716-446655440001';
const OTHER = '550e8400-e29b-41d4-a716-446655440002';
const MEDIA_ID = '550e8400-e29b-41d4-a716-446655440003';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  result.write(type, 4, 4, 'ascii');
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, 8 + data.length)), 8 + data.length);
  return result;
}

async function pngWithText() {
  const base = await sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 20, g: 40, b: 60, alpha: 1 } } }).png().toBuffer();
  const firstChunkEnd = 8 + 12 + base.readUInt32BE(8);
  return Buffer.concat([
    base.subarray(0, firstChunkEnd),
    pngChunk('tEXt', Buffer.from('Comment\u0000secret metadata', 'latin1')),
    base.subarray(firstChunkEnd),
  ]);
}

async function jpegWithMetadata() {
  const base = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 20, g: 40, b: 60 } } }).jpeg({ quality: 90 }).toBuffer();
  const app1Data = Buffer.from('Exif\0\0secret-metadata', 'latin1');
  const app1 = Buffer.alloc(4 + app1Data.length);
  app1[0] = 0xff; app1[1] = 0xe1; app1.writeUInt16BE(app1Data.length + 2, 2); app1Data.copy(app1, 4);
  return Buffer.concat([base.subarray(0, 2), app1, base.subarray(2)]);
}

function capturingAudit() {
  const records = [];
  return { records, recorder: { async record(input) { records.push(structuredClone(input)); return Object.freeze({ ...input, id: MEDIA_ID, occurredAt: new Date() }); } } };
}

async function withHarness(work) {
  const root = await mkdtemp(join(tmpdir(), 'taymex-media-f7-'));
  await chmod(root, 0o755); // provider must tighten an existing root to private permissions.
  const audit = capturingAudit();
  try {
    const provider = new FileSystemMediaStorageProvider(root);
    const service = new MediaService(provider, new OwnerOnlyMediaAccessPolicy(), new MetadataStrippingImageSanitizer(), audit.recorder, {
      maxUploadBytes: 1024 * 1024,
      now: () => new Date('2026-08-29T15:30:00.000Z'),
      nextId: () => MEDIA_ID,
    });
    await work({ root, provider, service, audit });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('private filesystem media path uses opaque keys, re-encodes PNG metadata, verifies integrity and audits authorized access', async () => {
  await withHarness(async ({ root, service, audit }) => {
    const original = await pngWithText();
    const metadata = await service.upload({
      actorAccountId: OWNER,
      ownerAccountId: OWNER,
      originalName: 'avatar.png',
      declaredMimeType: 'image/png',
      classification: 'confidential',
      correlationId: 'media-proof-upload',
      bytes: original,
    });
    assert.equal(metadata.storageKey, MEDIA_ID);
    assert.equal(metadata.originalName, 'avatar.png');
    assert.equal(metadata.detectedMimeType, 'image/png');
    assert.equal(metadata.sha256.length, 64);

    const files = (await readdir(root)).sort();
    assert.deepEqual(files, [`${MEDIA_ID}.bin`, `${MEDIA_ID}.json`]);
    assert.equal(files.some((name) => name.includes('avatar')), false);
    assert.equal((await stat(root)).mode & 0o077, 0);
    assert.equal((await stat(join(root, `${MEDIA_ID}.bin`))).mode & 0o077, 0);
    assert.equal((await stat(join(root, `${MEDIA_ID}.json`))).mode & 0o077, 0);
    const storedBytes = await readFile(join(root, `${MEDIA_ID}.bin`));
    assert.equal(storedBytes.includes(Buffer.from('secret metadata')), false);
    assert.equal((await sharp(storedBytes).metadata()).format, 'png');

    await assert.rejects(() => service.download(OTHER, MEDIA_ID), (error) => error instanceof MediaValidationError && error.code === 'MEDIA_ACCESS_DENIED');
    const downloaded = await service.download(OWNER, MEDIA_ID, 'media-proof-download');
    assert.equal(downloaded.metadata.sha256, metadata.sha256);
    assert.deepEqual(downloaded.bytes, storedBytes);

    await assert.rejects(() => service.delete(OTHER, MEDIA_ID), (error) => error instanceof MediaValidationError && error.code === 'MEDIA_ACCESS_DENIED');
    await service.delete(OWNER, MEDIA_ID, 'media-proof-delete');
    await assert.rejects(() => service.download(OWNER, MEDIA_ID), (error) => error instanceof MediaValidationError && error.code === 'MEDIA_NOT_FOUND');
    assert.deepEqual(audit.records.map((record) => record.actionCode), ['media.uploaded', 'media.downloaded', 'media.deleted']);
    assert.equal(JSON.stringify(audit.records).includes('secret metadata'), false);
  });
});

test('media upload rejects extension/MIME drift, unsupported bytes, oversize content, invalid classification, bad CRC and traversal keys', async () => {
  await withHarness(async ({ provider, service }) => {
    const png = await pngWithText();
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'x.jpg', declaredMimeType: 'image/png', classification: 'internal', bytes: png }), (e) => e instanceof MediaValidationError && e.code === 'FILE_EXTENSION_MISMATCH');
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'x.png', declaredMimeType: 'image/jpeg', classification: 'internal', bytes: png }), (e) => e instanceof MediaValidationError && e.code === 'MIME_MISMATCH');
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'x.bin', classification: 'internal', bytes: Buffer.from('not-an-image') }), (e) => e instanceof MediaValidationError && e.code === 'UNSUPPORTED_MEDIA_TYPE');
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: '../../x.png', classification: 'internal', bytes: png }), (e) => e instanceof MediaValidationError && e.code === 'INVALID_ORIGINAL_NAME');
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'C:\\fakepath\\x.png', classification: 'internal', bytes: png }), (e) => e instanceof MediaValidationError && e.code === 'INVALID_ORIGINAL_NAME');
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'huge.png', classification: 'internal', bytes: Buffer.concat([png, Buffer.alloc(1024 * 1024)]) }), (e) => e instanceof MediaValidationError && e.code === 'UPLOAD_TOO_LARGE');
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'x.png', classification: 'public', bytes: png }), (e) => e instanceof MediaValidationError && e.code === 'INVALID_MEDIA_CLASSIFICATION');
    const badCrc = Buffer.from(png); badCrc[29] ^= 0x01;
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'crc.png', classification: 'internal', bytes: badCrc }), (e) => e instanceof MediaValidationError && e.code === 'MALFORMED_IMAGE');
    await assert.rejects(() => provider.get('../../etc/passwd'), (e) => e instanceof MediaValidationError && e.code === 'INVALID_STORAGE_KEY');
  });
});

test('filesystem provider does not overwrite an existing object and validates stored metadata before authorization', async () => {
  await withHarness(async ({ root, service }) => {
    const png = await pngWithText();
    const first = await service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'first.png', declaredMimeType: 'image/png', classification: 'internal', bytes: png });
    await rm(join(root, `${MEDIA_ID}.bin`));
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'second.png', declaredMimeType: 'image/png', classification: 'internal', bytes: png }), (error) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST');
    const files = (await readdir(root)).sort();
    assert.deepEqual(files, [`${MEDIA_ID}.json`]);
    const metadata = JSON.parse(await readFile(join(root, `${MEDIA_ID}.json`), 'utf8'));
    assert.equal(metadata.originalName, first.originalName);

    await writeFile(join(root, `${MEDIA_ID}.bin`), Buffer.from('tampered'));
    metadata.ownerAccountId = OTHER;
    await writeFile(join(root, `${MEDIA_ID}.json`), JSON.stringify(metadata));
    await assert.rejects(() => service.download(OTHER, MEDIA_ID), (e) => e instanceof MediaValidationError && e.code === 'MEDIA_INTEGRITY_FAILED');
  });
});

test('audit failure compensates a newly stored upload rather than leaving an unaudited private object', async () => {
  const root = await mkdtemp(join(tmpdir(), 'taymex-media-f7-audit-'));
  try {
    const provider = new FileSystemMediaStorageProvider(root);
    const service = new MediaService(provider, new OwnerOnlyMediaAccessPolicy(), new MetadataStrippingImageSanitizer(), { async record() { throw new Error('audit-unavailable'); } }, { nextId: () => MEDIA_ID });
    const png = await pngWithText();
    await assert.rejects(() => service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'x.png', classification: 'restricted', bytes: png }), /audit-unavailable/u);
    assert.deepEqual(await readdir(root), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('delete audit failure restores the private object instead of leaving an unaudited deletion', async () => {
  const root = await mkdtemp(join(tmpdir(), 'taymex-media-f7-delete-audit-'));
  let failDeleteAudit = false;
  try {
    const provider = new FileSystemMediaStorageProvider(root);
    const audit = { async record(input) { if (failDeleteAudit && input.actionCode === 'media.deleted') throw new Error('delete-audit-unavailable'); return Object.freeze({ ...input, id: MEDIA_ID, occurredAt: new Date() }); } };
    const service = new MediaService(provider, new OwnerOnlyMediaAccessPolicy(), new MetadataStrippingImageSanitizer(), audit, { nextId: () => MEDIA_ID });
    const png = await pngWithText();
    await service.upload({ actorAccountId: OWNER, ownerAccountId: OWNER, originalName: 'x.png', classification: 'restricted', bytes: png });
    failDeleteAudit = true;
    await assert.rejects(() => service.delete(OWNER, MEDIA_ID), /delete-audit-unavailable/u);
    failDeleteAudit = false;
    const restored = await service.download(OWNER, MEDIA_ID);
    assert.equal(restored.metadata.storageKey, MEDIA_ID);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('JPEG path decodes/re-encodes APP1 metadata and rejects trailing polyglot bytes', async () => {
  const sanitizer = new MetadataStrippingImageSanitizer();
  const original = await jpegWithMetadata();
  const sanitized = await sanitizer.sanitize('image/jpeg', original);
  assert.equal(sanitized.includes(Buffer.from('secret-metadata')), false);
  assert.equal((await sharp(sanitized).metadata()).format, 'jpeg');
  await assert.rejects(() => sanitizer.sanitize('image/jpeg', Buffer.concat([original, Buffer.from('trailing')])), (e) => e instanceof MediaValidationError && e.code === 'MALFORMED_IMAGE');
});
