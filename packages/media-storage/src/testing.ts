import type { MediaAccessPolicy, StoredMediaMetadata } from './contracts.js';

export class OwnerOnlyMediaAccessPolicy implements MediaAccessPolicy {
  async canUpload(input: Readonly<{ actorAccountId: string; ownerAccountId: string }>): Promise<boolean> {
    return input.actorAccountId === input.ownerAccountId;
  }
  async canDownload(input: Readonly<{ actorAccountId: string; metadata: StoredMediaMetadata }>): Promise<boolean> {
    return input.actorAccountId === input.metadata.ownerAccountId;
  }
  async canDelete(input: Readonly<{ actorAccountId: string; metadata: StoredMediaMetadata }>): Promise<boolean> {
    return input.actorAccountId === input.metadata.ownerAccountId;
  }
}
