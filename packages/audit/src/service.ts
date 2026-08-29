import { requireNonBlank, requireUuid, type Clock } from '@taymex/foundation';
import { requirePermission } from '@engineering-platform/authorization';
import { requireAssurance, type ActorContext, type IdentitySecurityEvent, type IdentitySecurityEventSink } from '@taymex/identity';
import { auditRecordsReadPermission } from './generated/permissions.generated.js';
import { sanitizeAuditMetadata, sanitizeAuditValue } from './redaction.js';
import type {
  AuditActor,
  AuditChange,
  AuditIdGenerator,
  AuditQuery,
  AuditRecorder,
  AuditRecord,
  AuditResource,
  AuditStore,
  AuditWriteInput,
} from './contracts.js';

const MAX_AUDIT_QUERY = 100;

export class AuditService implements AuditRecorder {
  constructor(
    private readonly store: AuditStore,
    private readonly clock: Clock,
    private readonly ids: AuditIdGenerator,
  ) {}

  async record(input: AuditWriteInput): Promise<AuditRecord> {
    const actionCode = requireCode(input.actionCode, 'actionCode');
    const occurredAt = this.clock.now();
    const record = freezeRecord({
      ...input,
      id: requireUuid(this.ids.next(), 'auditId'),
      occurredAt,
      actionCode,
      actor: normalizeActor(input.actor),
      subject: input.subject ? normalizeResource(input.subject, 'subject') : undefined,
      resource: input.resource ? normalizeResource(input.resource, 'resource') : undefined,
      changes: input.changes.map(normalizeChange),
      metadata: sanitizeAuditMetadata(input.metadata),
      correlationId: normalizeOptional(input.correlationId, 128),
    });
    await this.store.append(record);
    return record;
  }
}

export class AuditQueryService {
  constructor(private readonly store: AuditStore) {}

  async query(actor: ActorContext, filter: AuditQuery = {}): Promise<readonly AuditRecord[]> {
    requirePermission(actor, auditRecordsReadPermission);
    requireAssurance(actor, 'AAL2');
    const limit = filter.limit ?? 50;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_AUDIT_QUERY) {
      throw new RangeError(`Audit query limit must be between 1 and ${MAX_AUDIT_QUERY}.`);
    }
    return this.store.query(Object.freeze({ ...filter, limit }));
  }
}

export class IdentitySecurityAuditSink implements IdentitySecurityEventSink {
  constructor(private readonly audit: AuditRecorder) {}

  async emit(event: IdentitySecurityEvent): Promise<void> {
    const actor: AuditActor = event.actorAccountId
      ? Object.freeze({ kind: 'account', accountId: event.actorAccountId, ...(event.sessionId ? { sessionId: event.sessionId } : {}) })
      : Object.freeze({ kind: 'system', systemId: 'identity-runtime' });
    await this.audit.record({
      actionCode: event.eventId,
      category: 'security',
      severity: event.eventId.endsWith('.failed') ? 'warning' : 'info',
      actor,
      ...(event.subjectAccountId ? { subject: { type: 'identity.account', id: event.subjectAccountId } } : {}),
      changes: [],
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      metadata: {
        ...(event.reason ? { reason: event.reason } : {}),
        ...(event.sessionId ? { sessionId: event.sessionId } : {}),
        ...(event.roleId ? { roleId: event.roleId } : {}),
      },
    });
  }
}

function normalizeActor(actor: AuditActor): AuditActor {
  if (actor.kind === 'account') {
    return Object.freeze({
      kind: 'account',
      accountId: requireNonBlank(actor.accountId, 'actor.accountId', 128),
      ...(actor.sessionId ? { sessionId: requireNonBlank(actor.sessionId, 'actor.sessionId', 128) } : {}),
    });
  }
  return Object.freeze({ kind: 'system', systemId: requireNonBlank(actor.systemId, 'actor.systemId', 128) });
}

function normalizeResource(resource: AuditResource, field: string): AuditResource {
  return Object.freeze({
    type: requireNonBlank(resource.type, `${field}.type`, 128),
    id: requireNonBlank(resource.id, `${field}.id`, 256),
  });
}

function normalizeChange(change: AuditChange): AuditChange {
  const field = requireNonBlank(change.field, 'change.field', 256);
  return Object.freeze({
    field,
    ...(Object.prototype.hasOwnProperty.call(change, 'before') ? { before: sanitizeAuditValue(change.before, field) } : {}),
    ...(Object.prototype.hasOwnProperty.call(change, 'after') ? { after: sanitizeAuditValue(change.after, field) } : {}),
  });
}

function requireCode(value: string, field: string): string {
  const code = requireNonBlank(value, field, 160);
  if (!/^[a-z][a-z0-9.-]+$/u.test(code)) throw new TypeError(`${field} must be a canonical lowercase code.`);
  return code;
}

function normalizeOptional(value: string | undefined, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  return requireNonBlank(value, 'correlationId', maxLength);
}

function freezeRecord(record: AuditRecord): AuditRecord {
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
