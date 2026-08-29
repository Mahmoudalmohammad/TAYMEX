import type { SqlExecutor, SqlParameter } from '@taymex/data-postgres';
import type { EncryptedNotificationPayload, NotificationOutboxRecord, NotificationOutboxStore, OutboxStatus } from './contracts.js';

export class PostgresNotificationOutboxStore implements NotificationOutboxStore {
  constructor(private readonly db: SqlExecutor) {}

  async enqueue(record: NotificationOutboxRecord): Promise<'enqueued' | 'duplicate'> {
    const result = await this.db.query(
      `INSERT INTO foundation_outbox_messages
        (id, event_id, event_version, dedupe_key, recipient_account_id,
         payload_algorithm, payload_key_version, payload_iv_base64, payload_ciphertext_base64, payload_auth_tag_base64,
         created_at, available_at, attempt_count, status, lease_token, lease_expires_at, last_error_code, delivered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (dedupe_key) DO NOTHING`,
      paramsForRecord(record),
    );
    return result.rowCount === 1 ? 'enqueued' : 'duplicate';
  }

  async claimBatch(input: Readonly<{ now: Date; limit: number; leaseToken: string; leaseDurationMs: number }>): Promise<readonly NotificationOutboxRecord[]> {
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100) throw new RangeError('Outbox claim limit must be between 1 and 100.');
    if (!Number.isSafeInteger(input.leaseDurationMs) || input.leaseDurationMs < 1_000 || input.leaseDurationMs > 300_000) throw new RangeError('Outbox lease duration is out of bounds.');
    const leaseExpiresAt = new Date(input.now.getTime() + input.leaseDurationMs);
    const result = await this.db.query<OutboxRow>(
      `WITH candidates AS (
         SELECT id
           FROM foundation_outbox_messages
          WHERE available_at <= $1
            AND (status = 'PENDING' OR (status = 'PROCESSING' AND lease_expires_at <= $1))
          ORDER BY available_at ASC, created_at ASC, id ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
       )
       UPDATE foundation_outbox_messages AS o
          SET status = 'PROCESSING', lease_token = $3, lease_expires_at = $4
         FROM candidates
        WHERE o.id = candidates.id
       RETURNING o.*`,
      [input.now, input.limit, input.leaseToken, leaseExpiresAt],
    );
    return Object.freeze(result.rows.map(recordFromRow));
  }

  async markDelivered(input: Readonly<{ id: string; leaseToken: string; deliveredAt: Date }>): Promise<'updated' | 'lease-lost'> {
    const result = await this.db.query(
      `UPDATE foundation_outbox_messages
          SET status='DELIVERED', delivered_at=$3, lease_token=NULL, lease_expires_at=NULL, last_error_code=NULL
        WHERE id=$1 AND status='PROCESSING' AND lease_token=$2`,
      [input.id, input.leaseToken, input.deliveredAt],
    );
    return result.rowCount === 1 ? 'updated' : 'lease-lost';
  }

  async markFailed(input: Readonly<{ id: string; leaseToken: string; errorCode: string; nextAvailableAt: Date; maxAttempts: number }>): Promise<'PENDING' | 'DEAD' | 'lease-lost'> {
    const result = await this.db.query<{ status: OutboxStatus }>(
      `UPDATE foundation_outbox_messages
          SET attempt_count = attempt_count + 1,
              status = CASE WHEN attempt_count + 1 >= $4 THEN 'DEAD' ELSE 'PENDING' END,
              available_at = CASE WHEN attempt_count + 1 >= $4 THEN available_at ELSE $3 END,
              last_error_code = $5,
              lease_token = NULL,
              lease_expires_at = NULL
        WHERE id=$1 AND status='PROCESSING' AND lease_token=$2
       RETURNING status`,
      [input.id, input.leaseToken, input.nextAvailableAt, input.maxAttempts, input.errorCode],
    );
    const status = result.rows[0]?.status;
    return status === 'PENDING' || status === 'DEAD' ? status : 'lease-lost';
  }

  async markDead(input: Readonly<{ id: string; leaseToken: string; errorCode: string }>): Promise<'updated' | 'lease-lost'> {
    const result = await this.db.query(
      `UPDATE foundation_outbox_messages
          SET status='DEAD', attempt_count=attempt_count + 1, last_error_code=$3, lease_token=NULL, lease_expires_at=NULL
        WHERE id=$1 AND status='PROCESSING' AND lease_token=$2`,
      [input.id, input.leaseToken, input.errorCode],
    );
    return result.rowCount === 1 ? 'updated' : 'lease-lost';
  }
}

type OutboxRow = Record<string, unknown> & {
  id: string;
  event_id: NotificationOutboxRecord['eventId'];
  event_version: number;
  dedupe_key: string;
  recipient_account_id: string;
  payload_algorithm: EncryptedNotificationPayload['algorithm'];
  payload_key_version: EncryptedNotificationPayload['keyVersion'];
  payload_iv_base64: string;
  payload_ciphertext_base64: string;
  payload_auth_tag_base64: string;
  created_at: Date;
  available_at: Date;
  attempt_count: number;
  status: OutboxStatus;
  lease_token: string | null;
  lease_expires_at: Date | null;
  last_error_code: string | null;
  delivered_at: Date | null;
};

function recordFromRow(row: OutboxRow): NotificationOutboxRecord {
  return Object.freeze({
    id: row.id,
    eventId: row.event_id,
    eventVersion: row.event_version,
    dedupeKey: row.dedupe_key,
    recipientAccountId: row.recipient_account_id,
    payload: Object.freeze({
      algorithm: row.payload_algorithm,
      keyVersion: row.payload_key_version,
      ivBase64: row.payload_iv_base64,
      ciphertextBase64: row.payload_ciphertext_base64,
      authTagBase64: row.payload_auth_tag_base64,
    }),
    createdAt: new Date(row.created_at),
    availableAt: new Date(row.available_at),
    attemptCount: row.attempt_count,
    status: row.status,
    leaseToken: row.lease_token,
    leaseExpiresAt: row.lease_expires_at ? new Date(row.lease_expires_at) : null,
    lastErrorCode: row.last_error_code,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
  });
}

function paramsForRecord(record: NotificationOutboxRecord): readonly SqlParameter[] {
  return [
    record.id, record.eventId, record.eventVersion, record.dedupeKey, record.recipientAccountId,
    record.payload.algorithm, record.payload.keyVersion, record.payload.ivBase64, record.payload.ciphertextBase64, record.payload.authTagBase64,
    record.createdAt, record.availableAt, record.attemptCount, record.status, record.leaseToken, record.leaseExpiresAt, record.lastErrorCode, record.deliveredAt,
  ];
}
