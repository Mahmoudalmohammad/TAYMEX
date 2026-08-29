import type { AuditQuery, AuditRecord, AuditStore } from './contracts.js';

const MAX_LIMIT = 100;

export class MemoryAuditStore implements AuditStore {
  #records: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    if (this.#records.some((item) => item.id === record.id)) {
      throw new Error(`Duplicate audit record id: ${record.id}`);
    }
    this.#records.push(cloneRecord(record));
  }

  async query(filter: AuditQuery = {}): Promise<readonly AuditRecord[]> {
    const limit = filter.limit ?? 50;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new RangeError(`Audit query limit must be between 1 and ${MAX_LIMIT}.`);
    }
    const rows = this.#records.filter((record) => matches(record, filter));
    return Object.freeze(rows.slice(-limit).reverse().map(cloneRecord));
  }
}

function matches(record: AuditRecord, filter: AuditQuery): boolean {
  if (filter.actionCode && record.actionCode !== filter.actionCode) return false;
  if (filter.actionPrefix && !record.actionCode.startsWith(filter.actionPrefix)) return false;
  if (filter.category && record.category !== filter.category) return false;
  if (filter.actorAccountId && (record.actor.kind !== 'account' || record.actor.accountId !== filter.actorAccountId)) return false;
  if (filter.resourceType && record.resource?.type !== filter.resourceType) return false;
  if (filter.resourceId && record.resource?.id !== filter.resourceId) return false;
  if (filter.correlationId && record.correlationId !== filter.correlationId) return false;
  return true;
}

function cloneRecord(record: AuditRecord): AuditRecord {
  return Object.freeze({
    ...record,
    occurredAt: new Date(record.occurredAt.getTime()),
    actor: Object.freeze({ ...record.actor }),
    ...(record.subject ? { subject: Object.freeze({ ...record.subject }) } : {}),
    ...(record.resource ? { resource: Object.freeze({ ...record.resource }) } : {}),
    changes: Object.freeze(record.changes.map((item) => Object.freeze({ ...item }))),
    metadata: Object.freeze({ ...record.metadata }),
  });
}
