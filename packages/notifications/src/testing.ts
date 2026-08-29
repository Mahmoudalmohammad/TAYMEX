import type { NotificationOutboxRecord, NotificationOutboxStore, NotificationProvider, NotificationProviderRequest, NotificationRecipient, NotificationRecipientResolver, OutboxStatus } from './contracts.js';

export class MemoryNotificationOutboxStore implements NotificationOutboxStore {
  readonly records = new Map<string, NotificationOutboxRecord>();
  async enqueue(record: NotificationOutboxRecord): Promise<'enqueued' | 'duplicate'> {
    if ([...this.records.values()].some((item) => item.dedupeKey === record.dedupeKey)) return 'duplicate';
    this.records.set(record.id, clone(record));
    return 'enqueued';
  }
  async claimBatch(input: Readonly<{ now: Date; limit: number; leaseToken: string; leaseDurationMs: number }>) {
    const rows = [...this.records.values()]
      .filter((row) => row.availableAt <= input.now && (row.status === 'PENDING' || (row.status === 'PROCESSING' && row.leaseExpiresAt !== null && row.leaseExpiresAt <= input.now)))
      .sort((a, b) => a.availableAt.getTime() - b.availableAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
      .slice(0, input.limit)
      .map((row) => clone({ ...row, status: 'PROCESSING', leaseToken: input.leaseToken, leaseExpiresAt: new Date(input.now.getTime() + input.leaseDurationMs) }));
    for (const row of rows) this.records.set(row.id, row);
    return Object.freeze(rows);
  }
  async markDelivered(input: Readonly<{ id: string; leaseToken: string; deliveredAt: Date }>) {
    const row = this.records.get(input.id);
    if (!row || row.status !== 'PROCESSING' || row.leaseToken !== input.leaseToken) return 'lease-lost' as const;
    this.records.set(row.id, clone({ ...row, status: 'DELIVERED', deliveredAt: input.deliveredAt, leaseToken: null, leaseExpiresAt: null, lastErrorCode: null }));
    return 'updated' as const;
  }
  async markFailed(input: Readonly<{ id: string; leaseToken: string; errorCode: string; nextAvailableAt: Date; maxAttempts: number }>) {
    const row = this.records.get(input.id);
    if (!row || row.status !== 'PROCESSING' || row.leaseToken !== input.leaseToken) return 'lease-lost' as const;
    const attempts = row.attemptCount + 1;
    const status: OutboxStatus = attempts >= input.maxAttempts ? 'DEAD' : 'PENDING';
    this.records.set(row.id, clone({ ...row, attemptCount: attempts, status, availableAt: status === 'PENDING' ? input.nextAvailableAt : row.availableAt, lastErrorCode: input.errorCode, leaseToken: null, leaseExpiresAt: null }));
    return status;
  }
  async markDead(input: Readonly<{ id: string; leaseToken: string; errorCode: string }>) {
    const row = this.records.get(input.id);
    if (!row || row.status !== 'PROCESSING' || row.leaseToken !== input.leaseToken) return 'lease-lost' as const;
    this.records.set(row.id, clone({ ...row, attemptCount: row.attemptCount + 1, status: 'DEAD', lastErrorCode: input.errorCode, leaseToken: null, leaseExpiresAt: null }));
    return 'updated' as const;
  }
}

export class StaticRecipientResolver implements NotificationRecipientResolver {
  constructor(private readonly recipients: ReadonlyMap<string, NotificationRecipient>) {}
  async resolve(accountId: string): Promise<NotificationRecipient | null> { return this.recipients.get(accountId) ?? null; }
}

export class CapturingNotificationProvider implements NotificationProvider {
  readonly deliveries: NotificationProviderRequest[] = [];
  readonly seen = new Set<string>();
  async send(request: NotificationProviderRequest): Promise<void> {
    if (this.seen.has(request.idempotencyKey)) return;
    this.seen.add(request.idempotencyKey);
    this.deliveries.push(Object.freeze({ ...request, recipient: Object.freeze({ ...request.recipient }), expiresAt: new Date(request.expiresAt) }));
  }
}

function clone(record: NotificationOutboxRecord): NotificationOutboxRecord {
  return Object.freeze({
    ...record,
    payload: Object.freeze({ ...record.payload }),
    createdAt: new Date(record.createdAt), availableAt: new Date(record.availableAt),
    leaseExpiresAt: record.leaseExpiresAt ? new Date(record.leaseExpiresAt) : null,
    deliveredAt: record.deliveredAt ? new Date(record.deliveredAt) : null,
  });
}
