# F4 PostgreSQL 18 Runtime Proof

**Evidence class:** external local runtime execution against the canonical TAYMEX consumer checkout  
**Consumer commit tested:** `77bac649adff216f1ffa700979500fef28c3a340`  
**Platform source commit used to rebuild the UI artifact:** `c3d865ee97f33c7d0247e00fdd02e0c771ea6f98`  
**Runtime:** PostgreSQL `18.6 (Debian 18.6-1.pgdg13+2)` / `server_version_num=180006`  
**Node runtime used by the operator:** `v24.14.0`  
**pnpm:** `11.24.0`

This file records the real-runtime evidence used to close F4. It is evidence, not a replacement for the executable test, migration files, registries, or foundation manifest.

## 1. Workspace build and package tests

The canonical workspace completed:

```text
pnpm install                         PASS
pnpm -r --if-present build          PASS
pnpm -r --if-present test           PASS
```

Backend package test result reported by the execution environment:

```text
@taymex/foundation          7 passed
@taymex/data-postgres      13 passed
@taymex/identity           19 passed
@taymex/audit               6 passed
@taymex/observability       7 passed
@taymex/settings-runtime   13 passed
-----------------------------------
Total                      65 passed, 0 failed
```

The Next.js 16 web build and the NestJS API build also completed successfully in the same workspace run.

## 2. Real PostgreSQL 18 integration harness

The guarded integration harness was executed with:

```bash
export TEST_DATABASE_URL='postgresql://taymex:***@127.0.0.1:55432/taymex_f4_test'
export F4_DATABASE_TESTS=1
pnpm --filter @taymex/data-postgres test:postgres
```

Result:

```text
✔ PostgreSQL 18 proves F4 migration, CAS, rollback, audit, idempotency, and readiness
 tests 1
 pass 1
 fail 0
 skipped 0
```

The test therefore executed rather than taking the environment-guarded skip path.

The harness covers the F4 runtime contract, including:

- PostgreSQL major-version verification;
- migration execution and migration-history validation;
- optimistic CAS for persisted identity/session/role/settings state;
- valid stale-writer conflict versus invalid version-jump precondition behavior;
- one-time challenge race behavior;
- append-only audit enforcement;
- transaction rollback coupling between state and audit evidence;
- idempotency claim/in-progress/conflict/replay behavior;
- readiness while connected and NOT_READY behavior after database unavailability.

## 3. Clean migration CLI proof

A separate disposable database was dropped and recreated before the migration proof.

First run:

```json
{"status":"ok","executed":["0001","0002"]}
```

Immediate second run:

```json
{"status":"ok","executed":[]}
```

Applied migration history recorded by PostgreSQL:

```text
0001 | 0001_foundation.sql             | b20f5fef4432e3df7db7cc0e1020a769611cde320d6fa3d260c52cc989e594b2
0002 | 0002_f4_integrity_hardening.sql | 126dc827ad86cc252453f0b31e05250f62a580974984783a8395ffcc06e290fa
```

This proves the clean-run sequence and the immediate no-op rerun. Tamper/deletion/rename/checksum rejection is additionally covered by the F4 migration runner tests and structural verifier.

## 4. Governance and structural evidence reported from the local environment

The same checkout reported:

```text
scripts/verify-f0-f4-foundation.py             PASS
settings generated-binding check               PASS
permissions generated-binding check            PASS
project profile validation                     PASS
consumer independent-boundary verification     PASS
```

The earlier F4 review diff passed its governed task at the reviewed head. The final closure task intentionally re-runs governance over the complete canonical delta from `750e5c798741ecb9a846af23b2ac8a3737006d49` so that the later artifact/toolchain commits are not hidden behind an older PASS.

## 5. Evidence interpretation

This evidence is sufficient to promote only these F4 capabilities to `PROVEN`:

- `data.postgresql-runtime`;
- `data.migrations-integrity`;
- `data.transactions-concurrency-idempotency`.

It does **not** by itself prove:

- authenticated HTTP actor/session transport;
- authorization at real HTTP routes;
- privileged settings/audit HTTP administration;
- production logging/metrics delivery;
- remote repository merge/ruleset authority;
- F5+ API/security/performance/UI/operations capabilities.

Those remain assigned to their declared later foundation stages.
