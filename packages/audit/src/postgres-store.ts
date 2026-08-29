import type { SqlExecutor, SqlParameter } from '@taymex/data-postgres';
import type { AuditJsonValue, AuditQuery, AuditRecord, AuditStore } from './contracts.js';

const MAX_LIMIT = 100;

export class PostgresAuditStore implements AuditStore {
  constructor(private readonly db: SqlExecutor) {}

  async append(record: AuditRecord): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_records
        (id, occurred_at, action_code, category, severity,
         actor_kind, actor_id, actor_session_id,
         subject_type, subject_id, resource_type, resource_id,
         changes_json, correlation_id, metadata_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15::jsonb)`,
      [
        record.id,
        record.occurredAt,
        record.actionCode,
        record.category,
        record.severity,
        record.actor.kind,
        record.actor.kind === 'account' ? record.actor.accountId : record.actor.systemId,
        record.actor.kind === 'account' ? record.actor.sessionId ?? null : null,
        record.subject?.type ?? null,
        record.subject?.id ?? null,
        record.resource?.type ?? null,
        record.resource?.id ?? null,
        JSON.stringify(record.changes),
        record.correlationId ?? null,
        JSON.stringify(record.metadata),
      ],
    );
  }

  async query(filter: AuditQuery = {}): Promise<readonly AuditRecord[]> {
    const limit = filter.limit ?? 50;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new RangeError(`Audit query limit must be between 1 and ${MAX_LIMIT}.`);
    }
    const conditions: string[] = [];
    const params: SqlParameter[] = [];
    const add = (sql: string, value: SqlParameter): void => { params.push(value); conditions.push(sql.replace('?', `$${params.length}`)); };
    if (filter.actionCode) add('action_code = ?', filter.actionCode);
    if (filter.actionPrefix) add('action_code LIKE (? || \'%\')', escapeLikePrefix(filter.actionPrefix));
    if (filter.category) add('category = ?', filter.category);
    if (filter.actorAccountId) {
      conditions.push(`actor_kind = 'account'`);
      add('actor_id = ?', filter.actorAccountId);
    }
    if (filter.resourceType) add('resource_type = ?', filter.resourceType);
    if (filter.resourceId) add('resource_id = ?', filter.resourceId);
    if (filter.correlationId) add('correlation_id = ?', filter.correlationId);
    params.push(limit);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<AuditRow>(
      `SELECT id, occurred_at, action_code, category, severity,
              actor_kind, actor_id, actor_session_id,
              subject_type, subject_id, resource_type, resource_id,
              changes_json, correlation_id, metadata_json
         FROM audit_records
         ${where}
        ORDER BY occurred_at DESC, id DESC
        LIMIT $${params.length}`,
      params,
    );
    return Object.freeze(result.rows.map(recordFromRow));
  }
}

type AuditRow = Record<string, unknown> & {
  id:string;
  occurred_at:Date;
  action_code:string;
  category:AuditRecord['category'];
  severity:AuditRecord['severity'];
  actor_kind:'account'|'system';
  actor_id:string;
  actor_session_id:string|null;
  subject_type:string|null;
  subject_id:string|null;
  resource_type:string|null;
  resource_id:string|null;
  changes_json:AuditRecord['changes'];
  correlation_id:string|null;
  metadata_json:Record<string, AuditJsonValue>;
};

function recordFromRow(row: AuditRow): AuditRecord {
  const actor = row.actor_kind === 'account'
    ? Object.freeze({ kind: 'account' as const, accountId: row.actor_id, ...(row.actor_session_id ? { sessionId: row.actor_session_id } : {}) })
    : Object.freeze({ kind: 'system' as const, systemId: row.actor_id });
  return Object.freeze({
    id: row.id,
    occurredAt: new Date(row.occurred_at),
    actionCode: row.action_code,
    category: row.category,
    severity: row.severity,
    actor,
    ...(row.subject_type && row.subject_id ? { subject: Object.freeze({ type: row.subject_type, id: row.subject_id }) } : {}),
    ...(row.resource_type && row.resource_id ? { resource: Object.freeze({ type: row.resource_type, id: row.resource_id }) } : {}),
    changes: Object.freeze(structuredClone(row.changes_json)),
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    metadata: Object.freeze(structuredClone(row.metadata_json)),
  });
}

function escapeLikePrefix(value: string): string {
  return value.replace(/[\\%_]/gu, (char) => `\\${char}`);
}
