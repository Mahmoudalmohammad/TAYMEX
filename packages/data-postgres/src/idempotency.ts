import { createHash } from 'node:crypto';
import type { SqlExecutor, TransactionalSqlExecutor } from './contracts.js';

const MAX_OPERATION = 128;
const MAX_KEY = 256;

export type IdempotencyClaim = Readonly<
  | { status: 'started' }
  | { status: 'in-progress' }
  | { status: 'replay'; response: unknown }
  | { status: 'conflict' }
>;

export class PostgresIdempotencyStore {
  constructor(private readonly database: TransactionalSqlExecutor) {}

  async claim(input: Readonly<{
    operation: string;
    key: string;
    requestHash: string;
    now: Date;
    expiresAt: Date;
  }>): Promise<IdempotencyClaim> {
    const operation = boundedText(input.operation, 'operation', MAX_OPERATION);
    const key = boundedText(input.key, 'key', MAX_KEY);
    const requestHash = requireSha256(input.requestHash);
    const now = validDate(input.now, 'now');
    const expiresAt = validDate(input.expiresAt, 'expiresAt');
    if (expiresAt.getTime() <= now.getTime()) throw new RangeError('expiresAt must be after now.');

    return this.database.transaction(async (tx) => {
      const inserted = await tx.query(
        `INSERT INTO foundation_idempotency_keys
           (operation, idempotency_key, request_hash, status, response_json, created_at, updated_at, expires_at)
         VALUES ($1, $2, $3, 'IN_PROGRESS', NULL, $4, $4, $5)
         ON CONFLICT (operation, idempotency_key) DO NOTHING
         RETURNING operation`,
        [operation, key, requestHash, now, expiresAt],
      );
      if (inserted.rowCount === 1) return Object.freeze({ status: 'started' as const });

      const existing = await tx.query<{
        request_hash: string;
        status: string;
        response_json: unknown;
        expires_at: Date;
      }>(
        `SELECT request_hash, status, response_json, expires_at
           FROM foundation_idempotency_keys
          WHERE operation = $1 AND idempotency_key = $2
          FOR UPDATE`,
        [operation, key],
      );
      const row = existing.rows[0];
      if (!row) throw new Error('Idempotency claim disappeared during conflict resolution.');
      if (new Date(row.expires_at).getTime() <= now.getTime()) {
        const replaced = await tx.query(
          `UPDATE foundation_idempotency_keys
              SET request_hash = $3, status = 'IN_PROGRESS', response_json = NULL,
                  created_at = $4, updated_at = $4, expires_at = $5
            WHERE operation = $1 AND idempotency_key = $2 AND expires_at <= $4
            RETURNING operation`,
          [operation, key, requestHash, now, expiresAt],
        );
        if (replaced.rowCount === 1) return Object.freeze({ status: 'started' as const });
      }
      if (row.request_hash !== requestHash) return Object.freeze({ status: 'conflict' as const });
      if (row.status === 'COMPLETED') return Object.freeze({ status: 'replay' as const, response: row.response_json });
      return Object.freeze({ status: 'in-progress' as const });
    }, { isolation: 'READ COMMITTED' });
  }

  async complete(input: Readonly<{
    operation: string;
    key: string;
    requestHash: string;
    response: unknown;
    now: Date;
  }>): Promise<void> {
    const result = await this.database.query(
      `UPDATE foundation_idempotency_keys
          SET status = 'COMPLETED', response_json = $4::jsonb, updated_at = $5
        WHERE operation = $1 AND idempotency_key = $2
          AND request_hash = $3 AND status = 'IN_PROGRESS'
        RETURNING operation`,
      [
        boundedText(input.operation, 'operation', MAX_OPERATION),
        boundedText(input.key, 'key', MAX_KEY),
        requireSha256(input.requestHash),
        JSON.stringify(input.response ?? null),
        validDate(input.now, 'now'),
      ],
    );
    if (result.rowCount !== 1) throw new Error('Idempotency completion requires one matching IN_PROGRESS claim.');
  }
}

export function hashIdempotencyRequest(value: unknown): string {
  return createHash('sha256').update(stableJson(value, new WeakSet<object>()), 'utf8').digest('hex');
}

function stableJson(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Idempotency request must contain only finite JSON numbers.');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    throw new TypeError('Idempotency request must be JSON-compatible and cannot contain undefined, bigint, symbols, or functions.');
  }
  if (seen.has(value)) throw new TypeError('Idempotency request cannot contain circular references.');
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => stableJson(item, seen)).join(',')}]`;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Idempotency request objects must be plain JSON objects.');
    }
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key], seen)}`).join(',')}}`;
  } finally {
    seen.delete(value);
  }
}

function requireSha256(value: string): string {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new TypeError('requestHash must be a lowercase SHA-256 hex digest.');
  return value;
}

function boundedText(value: string, field: string, max: number): string {
  if (typeof value !== 'string') throw new TypeError(`${field} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new RangeError(`${field} must be 1..${max} characters.`);
  return normalized;
}

function validDate(value: Date, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError(`${field} must be a valid Date.`);
  return new Date(value.getTime());
}
