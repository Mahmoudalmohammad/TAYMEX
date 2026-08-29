export const AUDIT_CATEGORIES = ['security', 'settings', 'administration', 'domain', 'data-access', 'system'] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export type AuditJsonPrimitive = string | number | boolean | null;
export interface AuditJsonArray extends ReadonlyArray<AuditJsonValue> {}
export interface AuditJsonObject {
  readonly [key: string]: AuditJsonValue;
}
export type AuditJsonValue = AuditJsonPrimitive | AuditJsonArray | AuditJsonObject;

export type AuditActor = Readonly<
  | { kind: 'account'; accountId: string; sessionId?: string }
  | { kind: 'system'; systemId: string }
>;

export type AuditResource = Readonly<{ type: string; id: string }>;

export type AuditChange = Readonly<{
  field: string;
  before?: AuditJsonValue;
  after?: AuditJsonValue;
}>;

export type AuditRecord = Readonly<{
  id: string;
  occurredAt: Date;
  actionCode: string;
  category: AuditCategory;
  severity: AuditSeverity;
  actor: AuditActor;
  subject?: AuditResource;
  resource?: AuditResource;
  changes: readonly AuditChange[];
  correlationId?: string;
  metadata: Readonly<Record<string, AuditJsonValue>>;
}>;

export type AuditWriteInput = Readonly<Omit<AuditRecord, 'id' | 'occurredAt'>>;

export type AuditQuery = Readonly<{
  actionCode?: string;
  actionPrefix?: string;
  category?: AuditCategory;
  actorAccountId?: string;
  resourceType?: string;
  resourceId?: string;
  correlationId?: string;
  limit?: number;
}>;

export interface AuditStore {
  append(record: AuditRecord): Promise<void>;
  query(filter?: AuditQuery): Promise<readonly AuditRecord[]>;
}

export interface AuditRecorder {
  record(input: AuditWriteInput): Promise<AuditRecord>;
}

export interface AuditIdGenerator {
  next(): string;
}
