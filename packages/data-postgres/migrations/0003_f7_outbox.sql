-- TAYMEX F7 additive transactional side-effect foundation. PostgreSQL 18.
-- The outbox contains encrypted delivery payloads only; external provider I/O happens after claim.

CREATE TABLE foundation_outbox_messages (
  id uuid PRIMARY KEY,
  event_id text NOT NULL,
  event_version integer NOT NULL CHECK (event_version >= 1),
  dedupe_key text NOT NULL,
  recipient_account_id uuid NOT NULL,
  payload_algorithm text NOT NULL CHECK (payload_algorithm = 'A256GCM'),
  payload_key_version text NOT NULL CHECK (payload_key_version = 'v1'),
  payload_iv_base64 text NOT NULL,
  payload_ciphertext_base64 text NOT NULL,
  payload_auth_tag_base64 text NOT NULL,
  created_at timestamptz NOT NULL,
  available_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  status text NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'DEAD')),
  lease_token uuid NULL,
  lease_expires_at timestamptz NULL,
  last_error_code text NULL,
  delivered_at timestamptz NULL,
  CONSTRAINT foundation_outbox_event_id_format CHECK (event_id ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$'),
  CONSTRAINT foundation_outbox_dedupe_bounds CHECK (char_length(btrim(dedupe_key)) BETWEEN 1 AND 256),
  CONSTRAINT foundation_outbox_payload_nonblank CHECK (
    btrim(payload_iv_base64) <> '' AND btrim(payload_ciphertext_base64) <> '' AND btrim(payload_auth_tag_base64) <> ''
  ),
  CONSTRAINT foundation_outbox_error_code_format CHECK (last_error_code IS NULL OR last_error_code ~ '^[a-z][a-z0-9-]{0,63}$'),
  CONSTRAINT foundation_outbox_time_order CHECK (available_at >= created_at),
  CONSTRAINT foundation_outbox_lease_state CHECK (
    (status = 'PROCESSING' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (status <> 'PROCESSING' AND lease_token IS NULL AND lease_expires_at IS NULL)
  ),
  CONSTRAINT foundation_outbox_delivery_state CHECK (
    (status = 'DELIVERED' AND delivered_at IS NOT NULL)
    OR (status <> 'DELIVERED' AND delivered_at IS NULL)
  )
);

CREATE UNIQUE INDEX foundation_outbox_dedupe_key_idx
  ON foundation_outbox_messages (dedupe_key);

CREATE INDEX foundation_outbox_claim_idx
  ON foundation_outbox_messages (available_at, created_at, id)
  WHERE status IN ('PENDING', 'PROCESSING');

CREATE INDEX foundation_outbox_recipient_idx
  ON foundation_outbox_messages (recipient_account_id, created_at DESC);
