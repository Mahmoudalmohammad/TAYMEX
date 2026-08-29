# F7 Files and Durable Side-Effects Real Proof

## Evidence state

**PROVEN**

F7 was executed on the exact committed consumer revision below using the pinned Node/pnpm toolchain, a real temporary filesystem, and a real disposable PostgreSQL 18 database. This evidence is not inferred from structural checks, mocks, documentation, or a different revision.

## Tested revisions and toolchain

```text
TAYMEX F7 implementation:    9affa751b5a5e3be9820aa1ff530be63fd571a33
F7 base:                     204e45fb22cdcb73f271c1457ee0d4996ce334db
ENGINEERING_PLATFORM:        c3d865ee97f33c7d0247e00fdd02e0c771ea6f98
Node:                        v24.14.0
pnpm:                        11.24.0
Python:                      3.13.5
PostgreSQL:                  18.6 (Debian 18.6-1.pgdg13+2)
server_version_num:          180006
```

The F7 closure commit that records this evidence changes only governed task metadata, maturity/evidence documentation, and structural verifiers. It does not modify the media runtime, notification runtime, identity transaction path, encryption logic, SQL, migrations, dependencies, contracts, event registry, platform artifacts, or trust-root implementation proven at `9affa751b5a5e3be9820aa1ff530be63fd571a33`.

## Raw evidence package

The returned unmodified proof artifact is:

```text
F7_VALIDATION_RESULTS_20260829T163456Z.zip
SHA-256: d3fe0b65c9361df341248578b9fd5354818af997eb0d755049ea7f0c60f53f72
```

Its final proof manifest deliberately records the pre-closure state:

```text
FOUNDATION_STAGE=F7
FILES_MEDIA_STORAGE_MATURITY=IMPLEMENTED
NOTIFICATIONS_SIDE_EFFECTS_MATURITY=IMPLEMENTED
F7_MEDIA_FILESYSTEM_PROOF=PASS
F7_POSTGRES_OUTBOX_PROOF=PASS
F7_REAL_PROOF=PASS
GOVERNANCE=PASS
TRUST=PASS
CONSUMER_BOUNDARY=PASS
HANDOFF=PASS
F7_CLOSED=NO
F8_STARTED=NO
```

The runtime proof therefore happened before this separate governed closure step.

## Clean install, build, typecheck, and package regressions

On the tested revision:

- `pnpm install --frozen-lockfile` — PASS;
- recursive monorepo build — PASS;
- monorepo typecheck — PASS;
- recursive package tests — PASS with zero failures;
- HTTP primitive regressions — PASS;
- JavaScript syntax preflight for all `.mjs` files — PASS;
- repository cleanliness after build/typecheck/tests — PASS.

The exact run includes six passing `@taymex/media-storage` tests, five passing `@taymex/notifications` tests, nineteen passing identity tests, and the earlier foundation package regressions.

## Real private-filesystem media proof

The `@taymex/media-storage` test suite executed against a real temporary filesystem and passed `6/6` with zero failures. The observed proof covers:

- opaque storage keys rather than user-controlled filesystem paths;
- private filesystem behavior and no-overwrite semantics;
- PNG/JPEG-only content boundary;
- extension, request MIME, and detected-content agreement;
- decode/re-encode normalization without copying embedded metadata;
- PNG CRC and image-bound validation;
- rejection of malformed content, unsupported content, traversal keys, and trailing JPEG polyglot bytes;
- stored metadata validation before authorization decisions;
- SHA-256 integrity verification;
- audit-backed authorized upload/download/delete behavior;
- compensation of newly stored content when required upload audit persistence fails;
- restoration of deleted content when required delete audit persistence fails.

The relevant package result was:

```text
packages/media-storage test: tests 6
packages/media-storage test: pass 6
packages/media-storage test: fail 0
```

F7 does not infer safe arbitrary-document handling, public-media serving, CDN behavior, or multi-provider object storage from this narrow proof.

## Real PostgreSQL 18 runtime and migrations

The disposable database used image `postgres:18` and reported:

```text
postgres.server_version=18.6 (Debian 18.6-1.pgdg13+2)
postgres.server_version_num=180006
```

Real migrations were executed twice:

```text
first run:  executed=["0001","0002","0003"]
second run: executed=[]
```

The second run proves migration idempotency on the tested database. F4 and F6 PostgreSQL 18 regression suites also passed on the same F7 SHA with one pass and zero failures each.

## F7 encrypted transactional outbox proof

The real F7 PostgreSQL integration harness passed with:

```text
f7.postgres.server_version_num=180006
f7.outbox.rollback_atomic=PASS
f7.outbox.plaintext_persisted=false
f7.outbox.concurrent_double_claim=false
f7.outbox.provider_idempotency_key=PASS
f7.outbox.retry_dead_letter=PASS
f7.outbox.claim_index=foundation_outbox_claim_idx
pass 1
fail 0
```

This proves the declared used-path durability and safety claims:

- identity challenge creation and durable secret-delivery enqueue roll back atomically on forced transaction failure;
- persisted outbox state does not contain the decrypted delivery secret or recipient address in plaintext;
- concurrent PostgreSQL claims do not hand the same row to two processors;
- claim behavior uses the declared `foundation_outbox_claim_idx` path;
- provider calls receive a stable idempotency key;
- provider failures are retried only within the configured bound and transition to terminal `DEAD` state;
- external provider I/O remains outside the originating identity transaction.

The delivery boundary remains at-least-once across provider acknowledgement loss. F7 does not claim exactly-once external delivery; duplicate suppression is explicitly the provider-idempotency responsibility.

## Real HTTP and process proof on the same SHA

The F5 PostgreSQL-backed HTTP integration regression passed on the exact F7 revision with one pass and zero failures.

The actual API process smoke returned:

```text
GET /api/health       -> HTTP 200, status=UP
GET /api/health/ready -> HTTP 200, status=READY, postgresql=UP
```

The validation harness rejected leakage of the disposable database password, database URL, or outbox encryption key. The process was intentionally terminated after smoke completion; the resulting package-manager SIGTERM line is process cleanup rather than a failed test.

## Generated checks, governance, trust, consumer boundary, and handoff

The same exact F7 revision passed:

- API/settings/permission/event generated-binding checks;
- project/profile and platform validation;
- F0–F4 verifier — `19/19` PASS;
- F5 verifier — `186/186` PASS;
- F6 verifier — `56/56` PASS;
- F7 pre-closure verifier — `103/103` PASS;
- task Governance — PASS;
- Trust Root verification — PASS;
- independent Consumer Boundary verification — PASS;
- Handoff create/verify — PASS with `status: verified`;
- final exact-SHA HEAD checks and `git fsck --full --strict` exit success for both repositories.

The local object database reported unreachable/dangling objects during final `fsck`; they are not reachable from the proven HEAD and are not integrity failures. The canonical closure package is built later from reachable history only and does not carry those abandoned objects forward.

## Scope boundary

F7 proves the declared narrow file and durable-side-effect paths. It does **not** claim:

- Kafka, RabbitMQ, Redis queues, BullMQ, or another broker runtime;
- a generalized worker or scheduler subsystem;
- S3/Azure/GCS or a multi-provider storage platform;
- public URLs or CDN serving;
- arbitrary-document scanning/sanitization;
- production email/SMS/push provider implementations;
- notification campaign/template-management infrastructure;
- exactly-once external delivery;
- production throughput, latency, saturation, or capacity;
- F8 UI/UX/browser/accessibility/visual maturity;
- later delivery, recovery, or integrated-foundation maturity.

## Closure decision supported by this proof

The exact-SHA evidence is sufficient to promote only `files.media-storage` and `notifications.events-side-effects` from `IMPLEMENTED` to `PROVEN` and close F7. Advancing `foundation.currentStage` to `F8` means **F8 is ready to begin**, not that F8 implementation has started or any F8 capability has been proven.
