import sharp from 'sharp';
import type { ImageSanitizer, MediaMimeType } from './contracts.js';
import { MediaValidationError } from './validation.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_IMAGE_DIMENSION = 16_384;
const MAX_IMAGE_PIXELS = 40_000_000;

export class MetadataStrippingImageSanitizer implements ImageSanitizer {
  async sanitize(mimeType: MediaMimeType, bytes: Buffer): Promise<Buffer> {
    if (mimeType === 'image/png') validatePngContainer(bytes);
    else if (mimeType === 'image/jpeg') validateJpegContainer(bytes);
    else throw new MediaValidationError('UNSUPPORTED_MEDIA_TYPE', 'No sanitizer exists for this media type.');

    try {
      const image = sharp(bytes, {
        animated: false,
        failOn: 'error',
        limitInputPixels: MAX_IMAGE_PIXELS,
        sequentialRead: true,
      });
      const metadata = await image.metadata();
      const expectedFormat = mimeType === 'image/png' ? 'png' : 'jpeg';
      if (metadata.format !== expectedFormat) throw malformed('Decoded image format does not match the trusted media type.');
      if (!metadata.width || !metadata.height || metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
        throw malformed('Decoded image dimensions exceed the safe image bound.');
      }
      if ((metadata.pages ?? 1) !== 1) throw malformed('Animated or multi-page images are not accepted by the F7 media path.');

      // Decode then re-encode instead of copying source chunks/segments. This normalizes
      // the image payload and drops EXIF/XMP/ICC/text metadata unless explicitly added.
      const normalized = mimeType === 'image/png'
        ? await image.rotate().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
        : await image.rotate().jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
      if (!normalized.length) throw malformed('Image normalization produced no content.');
      return normalized;
    } catch (error) {
      if (error instanceof MediaValidationError) throw error;
      throw malformed('Image decoding or normalization failed.');
    }
  }
}

function validatePngContainer(bytes: Buffer): void {
  if (bytes.length < PNG_SIGNATURE.length + 12 || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) throw malformed('PNG signature is invalid.');
  let offset = PNG_SIGNATURE.length;
  let sawIhdr = false;
  let sawIdat = false;
  let endedIdat = false;
  let sawIend = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw malformed('PNG chunk header is truncated.');
    const length = bytes.readUInt32BE(offset);
    if (length > 64 * 1024 * 1024) throw malformed('PNG chunk length is invalid.');
    const end = offset + 12 + length;
    if (end > bytes.length) throw malformed('PNG chunk length exceeds input.');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/u.test(type)) throw malformed('PNG chunk type is invalid.');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (bytes.readUInt32BE(dataEnd) !== crc32(bytes.subarray(offset + 4, dataEnd))) throw malformed(`PNG ${type} CRC is invalid.`);
    if (!sawIhdr && type !== 'IHDR') throw malformed('PNG IHDR must be first.');
    if (type === 'IHDR') {
      if (sawIhdr || length !== 13) throw malformed('PNG IHDR is invalid.');
      validatePngHeader(bytes.subarray(dataStart, dataEnd));
      sawIhdr = true;
    }
    if (type === 'IDAT') {
      if (endedIdat) throw malformed('PNG IDAT chunks must be contiguous.');
      sawIdat = true;
    } else if (sawIdat && type !== 'IEND') {
      endedIdat = true;
    }
    if (type === 'IEND') {
      if (length !== 0 || !sawIdat) throw malformed('PNG IEND is invalid.');
      sawIend = true;
    }
    if (isUnknownCriticalPngChunk(type)) throw malformed(`Unsupported critical PNG chunk ${type}.`);
    offset = end;
    if (sawIend) break;
  }
  if (!sawIhdr || !sawIdat || !sawIend || offset !== bytes.length) throw malformed('PNG structure or trailing bytes are invalid.');
}

function validatePngHeader(header: Buffer): void {
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bitDepth = header[8]!;
  const colorType = header[9]!;
  const validDepths: Readonly<Record<number, readonly number[]>> = { 0: [1,2,4,8,16], 2: [8,16], 3: [1,2,4,8], 4: [8,16], 6: [8,16] };
  if (!width || !height || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS) throw malformed('PNG dimensions exceed the safe image bound.');
  if (!validDepths[colorType]?.includes(bitDepth) || header[10] !== 0 || header[11] !== 0 || (header[12] !== 0 && header[12] !== 1)) throw malformed('PNG IHDR encoding is unsupported.');
}

function isUnknownCriticalPngChunk(type: string): boolean {
  if ((type.charCodeAt(0) & 0x20) !== 0) return false;
  return type !== 'IHDR' && type !== 'PLTE' && type !== 'IDAT' && type !== 'IEND';
}

function validateJpegContainer(bytes: Buffer): void {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw malformed('JPEG SOI is invalid.');
  let offset = 2;
  let sawFrame = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw malformed('JPEG marker prefix is invalid.');
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) throw malformed('JPEG marker is truncated.');
    const marker = bytes[offset++]!;
    if (marker === 0xd9) {
      if (!sawFrame || offset !== bytes.length) throw malformed('JPEG is missing a frame or contains trailing data.');
      return;
    }
    if (marker === 0xda) {
      if (!sawFrame || offset + 2 > bytes.length) throw malformed('JPEG SOS is invalid.');
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) throw malformed('JPEG SOS length is invalid.');
      const eoi = findSingleScanEoi(bytes, offset + length);
      if (eoi < 0 || eoi + 2 !== bytes.length) throw malformed('JPEG scan is missing EOI or contains trailing data.');
      return;
    }
    if (marker >= 0xd0 && marker <= 0xd7) throw malformed('JPEG restart marker is invalid outside scan data.');
    if (marker === 0x01) continue;
    if (offset + 2 > bytes.length) throw malformed('JPEG segment length is truncated.');
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw malformed('JPEG segment length is invalid.');
    if (marker === 0xc0) {
      if (sawFrame) throw malformed('JPEG contains multiple baseline frames.');
      validateJpegFrame(bytes.subarray(offset + 2, offset + length));
      sawFrame = true;
    } else if (isUnsupportedSof(marker)) {
      throw malformed('Only baseline JPEG frames are accepted by the F7 media path.');
    }
    offset += length;
  }
  throw malformed('JPEG SOS/EOI is missing.');
}

function validateJpegFrame(frame: Buffer): void {
  if (frame.length < 6) throw malformed('JPEG frame is truncated.');
  const precision = frame[0]!;
  const height = frame.readUInt16BE(1);
  const width = frame.readUInt16BE(3);
  const components = frame[5]!;
  if (precision !== 8 || !width || !height || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS) throw malformed('JPEG dimensions or precision exceed the safe image bound.');
  if (components < 1 || components > 4 || frame.length !== 6 + components * 3) throw malformed('JPEG component layout is invalid.');
}

function isUnsupportedSof(marker: number): boolean {
  return [0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker);
}

function findSingleScanEoi(bytes: Buffer, start: number): number {
  for (let i = start; i + 1 < bytes.length; i += 1) {
    if (bytes[i] !== 0xff) continue;
    const next = bytes[i + 1]!;
    if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) { i += 1; continue; }
    if (next === 0xd9) return i;
    throw malformed('JPEG contains an unsupported marker inside the scan.');
  }
  return -1;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function malformed(message: string): MediaValidationError {
  return new MediaValidationError('MALFORMED_IMAGE', message);
}
