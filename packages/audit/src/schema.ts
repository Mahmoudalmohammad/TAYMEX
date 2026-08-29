import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const auditRecords = pgTable('audit_records', {
  id: uuid('id').primaryKey(),
  occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull(),
  actionCode: text('action_code').notNull(),
  category: text('category').notNull(),
  severity: text('severity').notNull(),
  actorKind: text('actor_kind').notNull(),
  actorId: text('actor_id').notNull(),
  actorSessionId: text('actor_session_id'),
  subjectType: text('subject_type'),
  subjectId: text('subject_id'),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  changesJson: jsonb('changes_json').notNull(),
  correlationId: text('correlation_id'),
  metadataJson: jsonb('metadata_json').notNull(),
}, (table) => [
  index('audit_records_occurred_idx').on(table.occurredAt, table.id),
  index('audit_records_action_idx').on(table.actionCode, table.occurredAt),
  index('audit_records_actor_idx').on(table.actorId, table.occurredAt),
  index('audit_records_resource_idx').on(table.resourceType, table.resourceId, table.occurredAt),
  index('audit_records_correlation_idx').on(table.correlationId),
]);
