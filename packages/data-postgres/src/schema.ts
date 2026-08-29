import { check, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const foundationSchemaMigrations = pgTable('foundation_schema_migrations', {
  version: text('version').primaryKey(),
  fileName: text('file_name').notNull().unique(),
  checksum: text('checksum').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  executionMs: integer('execution_ms').notNull(),
}, (table) => [
  check('foundation_schema_migrations_execution_nonnegative', sql`${table.executionMs} >= 0`),
]);

export const foundationIdempotencyKeys = pgTable('foundation_idempotency_keys', {
  operation: text('operation').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  status: text('status').notNull(),
  responseJson: jsonb('response_json'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.operation, table.idempotencyKey] }),
  check('foundation_idempotency_status', sql`${table.status} IN ('IN_PROGRESS','COMPLETED')`),
  index('foundation_idempotency_expiry_idx').on(table.expiresAt),
]);
