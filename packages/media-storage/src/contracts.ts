export const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number];

export const MEDIA_CLASSIFICATIONS = ['internal', 'confidential', 'restricted'] as const;
export type MediaClassification = (typeof MEDIA_CLASSIFICATIONS)[number];

export type StoredMediaMetadata = Readonly<{
  id: string;
  storageKey: string;
  originalName: string;
  detectedMimeType: MediaMimeType;
  sizeBytes: number;
  sha256: string;
  classification: MediaClassification;
  ownerAccountId: string;
  createdAt: Date;
}>;

export type StoredMediaObject = Readonly<{
  metadata: StoredMediaMetadata;
  bytes: Buffer;
}>;

export interface MediaStorageProvider {
  put(object: StoredMediaObject): Promise<void>;
  get(storageKey: string): Promise<StoredMediaObject | null>;
  remove(storageKey: string): Promise<void>;
}

export interface MediaAccessPolicy {
  canUpload(input: Readonly<{ actorAccountId: string; ownerAccountId: string; classification: MediaClassification }>): Promise<boolean>;
  canDownload(input: Readonly<{ actorAccountId: string; metadata: StoredMediaMetadata }>): Promise<boolean>;
  canDelete(input: Readonly<{ actorAccountId: string; metadata: StoredMediaMetadata }>): Promise<boolean>;
}

export interface ImageSanitizer {
  sanitize(mimeType: MediaMimeType, bytes: Buffer): Promise<Buffer>;
}

export type UploadMediaInput = Readonly<{
  actorAccountId: string;
  ownerAccountId: string;
  originalName: string;
  declaredMimeType?: string;
  classification: MediaClassification;
  correlationId?: string;
  bytes: Buffer;
}>;
