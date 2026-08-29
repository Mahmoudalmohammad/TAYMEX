# TAYMEX Foundation F7 — Files, Events, Notifications, and Durable Side Effects

**Stage:** F7 — Files and Side-Effect Foundation
**Final stage decision:** **CLOSED**
**Next foundation stage:** `F8` — ready to begin; implementation not started by this closure.
**Broad feature expansion:** remains **BLOCKED** until the complete Foundation Readiness Gate is satisfied.

## 1. F7 scope

F7 establishes only two required foundation capabilities:

- `files.media-storage` — one controlled private media path;
- `notifications.events-side-effects` — one canonical notification event path with a durable transactional side effect.

The stage deliberately does not create a generalized storage platform, CDN, broker, queue ecosystem, scheduler, notification matrix, or background-worker framework. The implementation exists to prove the smallest reusable boundaries required by actual application pressure.

## 2. Private media boundary

`@taymex/media-storage` defines a provider-neutral `MediaStorageProvider` contract and a filesystem proof adapter. The application-facing `MediaService` owns validation, authorization, sanitization, integrity metadata, and cleanup behavior independently of the storage adapter.

The initial allowlist is intentionally narrow:

- `image/jpeg`;
- `image/png`.

Unsupported content fails closed. F7 does not claim safe handling for arbitrary document or active-content formats.

Before persistence the media path:

1. validates actor and owner identifiers;
2. bounds upload size before storage;
3. checks upload authorization;
4. derives the trusted type from bytes rather than filename or request MIME alone;
5. rejects path-like original names, requires the original extension to agree with the detected type, and rejects declared-MIME disagreement;
6. validates supported container structure, PNG CRCs, and conservative image-dimension bounds;
7. decodes and re-encodes the accepted image through one pinned image decoder so malformed payloads fail and embedded EXIF/XMP/text metadata is not copied into stored bytes;
8. computes SHA-256 over the normalized stored bytes;
9. validates stored sidecar metadata before it can influence authorization and stores under an opaque UUID key rather than a user-controlled filename;
10. records upload/download/delete activity through the existing audit contract; failed upload audit removes the new object, while failed delete audit restores the removed object before returning failure.

The filesystem adapter writes beneath one private root, tightens that root to `0700`, and uses exclusive creation with `0600` file permissions. A failed second-file commit removes a newly created binary so a half-written object is not accepted. Download and delete require explicit access-policy decisions. Download also rechecks stored size and SHA-256 integrity.

## 3. Canonical notification event

The event registry declares:

```text
notification.secret-delivery.requested
owner=notifications
version=1
delivery=outbox
classification=sensitive
idempotencyKey=deliveryId
```

Generated bindings are derived from that registry for both identity and notification consumers. The runtime sink refuses to operate if the generated event descriptor no longer matches the expected outbox, sensitivity, and idempotency contract.

## 4. Transactional side-effect rule

Password-reset and email-verification challenge creation now execute the following operations in one identity database transaction:

- create challenge;
- emit the corresponding identity security event;
- enqueue the secret-delivery request through the durable outbox sink.

The sink performs database persistence only. It does not call an external notification provider. Therefore a rollback after outbox enqueue also rolls back the challenge and outbox record together.

External provider I/O occurs only later when a separate outbox processor claims durable work.

The provider request carries a stable template ID plus an explicit locale and `mandatory=true` classification. The current password-reset and email-verification events are mandatory security notifications, so optional-notification preferences are intentionally not invented in F7; a preference policy is added only when a real optional notification exists.

## 5. Secret protection

Outbox payloads use AES-256-GCM with:

- a 32-byte configured encryption key;
- a random 12-byte IV per payload;
- authentication tag verification;
- the outbox UUID as additional authenticated data;
- an explicit payload algorithm and key version.

The persisted row contains ciphertext fields rather than a plaintext secret or recipient address. The API runtime requires `NOTIFICATION_OUTBOX_ENCRYPTION_KEY` during startup. Missing encryption material fails runtime construction rather than producing account-dependent delivery behavior, plaintext persistence, or an in-memory fallback.

F7 proves the encryption boundary and key input contract. Key rotation, secret-manager integration, and production provider credentials remain operations/deployment responsibilities and are not silently claimed by this stage.

## 6. Bounded outbox processing

`NotificationOutboxProcessor` is intentionally a bounded process-once mechanism rather than a worker framework. It provides:

- batch size bounded to `1..100`;
- lease duration bounded to `1 second..5 minutes`;
- PostgreSQL claims using `FOR UPDATE SKIP LOCKED`;
- expired-lease reclamation;
- bounded retry attempts;
- bounded exponential retry delay;
- terminal `DEAD` state for poison or expired deliveries;
- opaque persisted error codes;
- a stable provider idempotency key derived from the delivery request.

Delivery semantics are at-least-once across the external-provider boundary. If provider delivery succeeds but database acknowledgement loses its lease, a later retry may occur; the stable provider idempotency key is the required duplicate-suppression mechanism at that boundary.

No scheduler is introduced by F7. A later governed runtime/operations stage may decide how `processOnce()` is invoked without changing the transactional outbox contract.

## 7. PostgreSQL schema

Migration `0003_f7_outbox.sql` adds only `foundation_outbox_messages` and its required indexes. The `notifications` module owns the table and its Drizzle projection; the central migration runner remains the single migration execution path. The schema is additive and contains:

- unique dedupe key;
- encrypted payload metadata/ciphertext fields;
- bounded state model: `PENDING`, `PROCESSING`, `DELIVERED`, `DEAD`;
- lease token/expiry state;
- attempt count and opaque error code;
- availability and delivery timestamps;
- a partial claim index and recipient lookup index.

No broker persistence, notification-template catalog, product table, or public-media schema is added.

## 8. Proof contract already encoded

The F7 PostgreSQL integration test is designed to prove on PostgreSQL 18 that:

- the actual server major version is 18;
- all real migrations apply;
- a forced failure after outbox enqueue rolls back both challenge and outbox;
- a successful identity request persists one encrypted outbox record;
- the exact decrypted secret and recipient address do not appear in the persisted row;
- two concurrent claims cannot claim the same message;
- delivery receives a stable provider idempotency key;
- repeated provider failures retry and then transition to `DEAD` at the configured bound;
- the required dedupe and claim indexes exist.

The media package tests use a real temporary filesystem and prove opaque filenames, extension/MIME/content agreement, decode/re-encode metadata removal, PNG CRC validation, baseline-JPEG/container bounds, private root/file permissions, authorization-gated access, audit recording and upload/delete audit-failure compensation, stored-metadata validation, integrity verification, storage-key traversal rejection, path-like original-name rejection, classification rejection, upload bounds, no overwrite, and partial-write cleanup.

## 9. Deliberate exclusions

F7 does **not** introduce or claim proof for:

- Kafka, RabbitMQ, Redis queues, BullMQ, or another broker;
- a generic worker/scheduler subsystem;
- S3/Azure/GCS or a multi-provider storage ecosystem;
- public URLs or CDN serving;
- arbitrary document scanning/sanitization;
- email/SMS/push provider implementations;
- notification campaign/template management (the F7 provider request carries only a stable template ID, locale, and mandatory-security classification);
- wall-clock throughput or latency targets;
- product-specific notifications or resumed Catalog feature work.

These exclusions prevent foundation work from becoming a new horizontal platform before real consumers require it.

## 10. Exact-SHA real proof accepted

The exact committed F7 implementation revision `9affa751b5a5e3be9820aa1ff530be63fd571a33` passed the complete local-validation contract on Node `v24.14.0`, pnpm `11.24.0`, a real temporary filesystem, and PostgreSQL `18.6` (`server_version_num=180006`). The returned raw proof ZIP has SHA-256 `d3fe0b65c9361df341248578b9fd5354818af997eb0d755049ea7f0c60f53f72`.

Accepted proof includes:

- frozen clean install, build, typecheck, and package tests;
- real media filesystem tests: `6/6` PASS with opaque keys, decode/re-encode normalization, integrity, authorization/audit, compensation, permissions, metadata validation, and malformed/traversal/polyglot rejection;
- PostgreSQL 18 migrations `0001`, `0002`, and `0003`, followed by an idempotent second migration run with no work;
- F4 and F6 PostgreSQL regressions on the same F7 SHA;
- F7 outbox proof with `rollback_atomic=PASS`, `plaintext_persisted=false`, `concurrent_double_claim=false`, stable provider idempotency, bounded retry/dead-letter behavior, and `foundation_outbox_claim_idx`;
- F5 real HTTP regression and actual API liveness/readiness smoke;
- generated checks, F0–F7 structural verifiers, Governance, Trust, Consumer Boundary, Handoff, and final exact-SHA integrity.

The durable side-effect boundary remains explicitly at-least-once across the external-provider boundary. F7 does not convert provider idempotency into a false exactly-once claim.

The full accepted evidence contract is recorded in `docs/evidence/F7_FILES_SIDE_EFFECTS_REAL_PROOF.md`.

## 11. Closure scope and lineage

The runtime proof belongs to `9affa751b5a5e3be9820aa1ff530be63fd571a33`. This separate closure changes only governed task metadata, maturity/evidence documentation, and structural verifiers. It does not change media/runtime code, notification/runtime code, identity transactions, encryption, SQL, migrations, dependencies, contracts, registry entries, platform artifacts, or trust-root implementation.

Therefore the accepted real proof remains valid for the proven runtime SHA while this non-runtime closure records its result. Any future change that affects those proven paths must receive its own relevant proof on the changed SHA.

## 12. Final F7 status

```text
files.media-storage                    PROVEN
notifications.events-side-effects      PROVEN
F7                                     CLOSED
Foundation current stage               F8 (READY; implementation not started by this closure)
Foundation readiness                   BLOCKED
Broad feature expansion                BLOCKED
Generalized broker/worker framework    NOT INTRODUCED
Generalized storage ecosystem          NOT INTRODUCED
Public media/CDN serving                NOT INTRODUCED
```

**F7 is closed from real exact-SHA filesystem and PostgreSQL 18 proof while retaining the deliberately narrow used-path architecture and all later foundation obligations.**
