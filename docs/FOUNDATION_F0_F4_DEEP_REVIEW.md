# TAYMEX Foundation F0–F4 Deep Review

**Review scope:** foundation/bootstrap through F4  
**Review type:** evidence-based closure audit  
**Decision:** F4 may close and the implementation sequence may move to F5; the overall Foundation Readiness Gate remains blocked.

## 1. Review rule

This review intentionally separates three ideas that must not be collapsed:

1. **stage implementation completion** — the work allocated to a stage has been built sufficiently for the next stage to begin;
2. **capability maturity** — `DESIGNED / IMPLEMENTED / INTEGRATED / PROVEN / PRODUCTION_PROVEN`;
3. **foundation readiness** — broad domain construction remains blocked until every mandatory capability reaches its declared exit maturity.

A previous stage can therefore be correctly completed while one of its capabilities remains `INTEGRATED` because its final proof is intentionally delegated to a later cross-layer stage. This is not treated as hidden debt when the delegation is explicit, owned, and still visible in the manifest.

## 2. Historical failure classes used as audit lenses

The preserved project context was used as evidence/context, not as executable policy. The audit specifically looked for recurrence of these failure classes:

- duplicate/local solutions for one responsibility;
- overlapping settings or competing sources of truth;
- guessed model/contract names;
- unbounded/query-in-loop access;
- shallow happy-path-only functionality;
- missing concurrency/idempotency cases;
- weak security/audit coupling;
- repair-by-patch rather than repair at the owning shared layer;
- test-only fallback paths reachable from production entry points;
- documentation claiming maturity that runtime evidence does not support;
- agent/task verification performed against a narrower/older diff than the canonical code.

No context document is allowed to override runtime/build/database truth, machine registries, task contracts, or executable governance.

## 3. F0 / pre-foundation governance and architecture bootstrap

### What is sound

- TAYMEX remains an independent consumer repository rather than a source-copied platform workspace.
- Runtime platform artifacts are locked by file, version, SHA-256, and size.
- the control plane/trust-root paths are distinct from ordinary feature scope;
- task contracts use default-deny path authority;
- local trust-root verification detects control-plane/trust-root/proof-asset changes;
- canonical registries and repository truth exist as machine-readable sources.

### What this review corrected

The local validation fixes after commit `750e5c7` were initially newer than the governance PASS that had been reported for the earlier head. Treating the older PASS as authority for the newer canonical code would violate the trusted-diff principle.

`FOUNDATION-F4-CLOSURE-003` therefore governs the complete closure delta from `750e5c798741ecb9a846af23b2ac8a3737006d49` through the final F4 closure commit.

### Correct maturity conclusion

`governance.trust-root` remains `INTEGRATED`, not `PROVEN`, because required remote repository merge/ruleset authority is intentionally a later operational proof. No local CLI result is used to claim remote merge authority.

**F0/pre-foundation implementation status:** sufficient and internally consistent for F1–F5 progression.  
**Remote merge authority:** still open by design and visible in the manifest.

## 4. F1 — Core application contracts

Reviewed mechanisms:

- canonical errors/validation;
- clock/time abstraction;
- money/currency;
- quantities/units;
- localization primitives used by the foundation line.

Findings:

- core errors/validation and money are already at their declared `PROVEN` exit maturity;
- clock/time and quantities/units are at their declared `INTEGRATED` exit maturity;
- foundation tests pass in the operator environment;
- the application uses the shared foundation package rather than preserving a parallel API-local kernel implementation;
- no F1 production source contains unregistered TODO/FIXME/HACK markers in the reviewed surface.

**F1 conclusion:** complete at its declared stage exit maturity. No unresolved defect found that should block F5.

## 5. F2 — Identity and access

Reviewed mechanisms:

- account/password/session/challenge contracts;
- sign-in/sign-out and session lifecycle;
- actor/assurance boundary;
- role/permission model;
- privileged-action policy boundary;
- durable persistence pulled through F4.

Defects already corrected during the F4 deep audit include:

- exact optimistic version progression instead of last-write-wins behavior;
- account-role set versioning;
- idempotent repeated sign-out;
- atomic challenge + security-event persistence boundary;
- bounded session visibility;
- set-based role reads instead of query-per-role loops;
- prevention of credential recreation at invalid versions;
- explicit transaction-boundary requirement where durable side effects must be atomic.

The PostgreSQL 18 F4 proof now closes the durable account/credential/session/challenge/role CAS and rollback portion.

Still intentionally delegated to F5:

- secure browser cookie/token transport;
- authenticated HTTP actor construction;
- positive/negative authorization on real HTTP routes;
- HTTP role/permission administration;
- composition of security audit/log sinks into the real HTTP identity runtime.

Conditional MFA/step-up implementation remains deferred until an enabled flow actually requires elevation; the assurance-policy boundary already exists.

**F2 conclusion:** stage implementation is complete; capability maturity correctly remains `INTEGRATED` until F5 transport proof. No hidden F2 persistence defect remains from this review.

## 6. F3 — Settings, audit, and observability

### Settings

Confirmed:

- canonical settings registry remains the single definition source;
- generated typed bindings consume registry truth;
- platform resolver owns defaults/precedence/validation rather than F3 duplicating them;
- administration uses permission + AAL2 policy boundary;
- history/rollback/CAS/runtime application status are explicit;
- scope retrieval is batched rather than query-in-loop;
- transaction boundary is mandatory for durable mutation + audit coupling;
- PostgreSQL F4 proof now exercises current/history/application-state persistence and rollback/CAS.

Remaining F5 work is the authenticated privileged HTTP administration path and its negative-route tests.

### Audit

Confirmed:

- audit data is structured and redacted;
- database triggers enforce append-only semantics;
- privileged audit reads require permission + AAL2 at the service boundary;
- PostgreSQL F4 proof executes append-only enforcement and rollback coupling.

Remaining F5 work is API runtime composition and privileged query transport.

### Observability

Confirmed:

- correlation IDs and structured logging exist;
- redaction is shared;
- liveness and readiness are distinct;
- PostgreSQL readiness has now executed on a real PostgreSQL 18 runtime including loss-of-readiness behavior.

Remaining:

- HTTP request correlation/request-error logging in F5;
- production log/metrics delivery and deployment diagnostics in F9.

**F3 conclusion:** stage implementation complete; current `INTEGRATED` maturity is honest because transport/production evidence belongs later. No duplicate settings resolver or accidental memory production fallback remains.

## 7. F4 — Data and transaction foundation

### Database truth

The final structural verifier checks:

- 14 persisted tables across SQL, Drizzle, and module ownership;
- column/type parity;
- 10 named indexes;
- 37 hardening constraints;
- named cross-table foreign keys;
- database audit append-only triggers;
- no destructive `DROP/TRUNCATE` in F4 migrations.

### Migration safety

The implementation rejects:

- malformed migration filenames;
- deleted applied migrations;
- renamed applied migrations;
- checksum drift;
- destructive operations not separately authorized.

A rollback failure leaves connection state unknown; such a connection is destroyed rather than returned to the pool.

### Concurrency and transactions

Confirmed:

- one shared PostgreSQL transaction boundary;
- nested transaction reuse;
- exact `N -> N+1` optimistic transition contract;
- stale valid mutation → database `version-conflict`;
- invalid version jump → precondition failure;
- settings/identity/role state can share an outer transaction with durable audit;
- idempotency claim-generation fencing prevents an expired stale worker from completing a reclaimed claim.

### Query-shape review

The review removed query-per-role and query-per-setting-scope patterns in favor of set-based/batched reads. This directly enforces the foundation rule that I/O should not occur inside loops when one bounded set operation is appropriate.

### Real runtime proof

PostgreSQL 18.6 executed the guarded F4 integration harness with:

```text
1 passed
0 failed
0 skipped
```

A separate clean migration database executed:

```text
first run  -> [0001, 0002]
second run -> []
```

Therefore the three F4 data capabilities meet their declared `PROVEN` exit maturity.

**F4 conclusion:** CLOSED.

## 8. Independent-consumer artifact and toolchain audit

The local proof discovered a real artifact-resolution defect rather than a database defect: packed UI-dependent platform artifacts referenced `@engineering-platform/ui@0.1.0`, which could fall through to the public registry during bootstrap.

The final solution avoids a one-package patch:

- all locked platform runtime artifacts have local bootstrap overrides;
- overrides and `runtime.lock.yaml` must have the same artifact-name set;
- each tarball package name/version/hash/size is verified;
- internal `@engineering-platform/*` dependencies must remain inside the lock closure;
- the UI correction was made in platform source and the tarball was rebuilt;
- no tarball was hand-patched.

Toolchain truth is also normalized:

```text
pnpm             11.24.0
runtime profile  Node 24.x
package engine   >=24 <25
@types/node      24.13.3 exact
build scripts    allowBuilds only: esbuild, nx
```

This removes the previous overlap between `allowBuilds` and `onlyBuiltDependencies` and prevents Node 25/26 from satisfying a project profile that says Node 24.x.

## 9. Source-of-truth consistency result

| Responsibility | Canonical truth | Cross-check |
|---|---|---|
| Settings definition | settings registry | generated bindings + module consumption |
| Permissions | permission registry | generated owner bindings |
| Events | event registry | generated Identity event bindings |
| Persisted schema | applied SQL migration state | Drizzle projection + module ownership parity |
| Platform runtime artifacts | runtime lock | local tarball identity/hash/size + bootstrap overrides |
| Node runtime | project profile | package engine + exact Node type major |
| Completion | executable governance/evidence | descriptive reports cannot promote maturity alone |

No competing active source for these responsibilities was found after the closure corrections.

## 10. Regression and shallow-implementation review

The review specifically checked that F1–F4 completion does not rest only on happy-path unit tests.

Evidence now includes:

- negative invalid-version transition tests;
- stale CAS conflicts;
- rollback behavior;
- audit mutation rejection;
- migration drift/deletion/rename rejection;
- idempotency conflict/replay/reclaim fencing;
- PostgreSQL readiness loss;
- module/schema/index/constraint parity;
- consumer artifact boundary and dependency closure;
- default-deny task scope and trust-root local verification.

No test-only memory implementation is exported through the normal production entry points for Identity/Audit/Settings/Observability.

## 11. What is deliberately **not** considered complete

The deep review does not convert future-stage design into fake completion. The following remain real work:

- F5 API/OpenAPI contracts and HTTP security boundary;
- real route authn/authz negative tests;
- F6 performance/query instrumentation and plan evidence;
- F7 files/events/notifications/outbox/side-effect delivery;
- F8 complete UI/UX, responsive, RTL/LTR, accessibility and visual proof;
- F9 remote merge/ruleset authority, delivery, production diagnostics and backup/restore;
- F10 integrated cross-layer proof through the bounded Products validation slice.

Accordingly, `foundation.featureExpansionPolicy` remains `BLOCK_UNTIL_READY` and Products remains frozen for foundation proof.

## 12. Remaining risks that are not F1–F4 defects

1. **Remote governance authority:** local trust verification is not equivalent to a protected remote merge ruleset. Owned by F9/operational proof.
2. **Platform source repository provenance:** the accompanying platform source workspace is now Git-tracked at `c3d865e...`; earlier source history is not inferred from that new repository. Artifact identity is verified independently by hash and consumer lock.
3. **HTTP composition risk:** Identity/Authorization/Settings/Audit/Observability can still fail when first composed into the real HTTP boundary. F5 must pressure-test them rather than assume package-level correctness implies route correctness.
4. **Overall foundation readiness:** many mandatory F5–F10 capabilities remain below exit maturity. F4 closure must not be interpreted as permission for broad product construction.

None of these is hidden or a reason to reopen F4; each has an explicit later owner/stage.

## 13. Final stage assessment

| Stage | Assessment | Basis |
|---|---|---|
| F0 / bootstrap-governance | COMPLETE FOR SEQUENCE / capability proof still delegated | independent boundary, task/trust mechanisms, no remote-merge overclaim |
| F1 core contracts | COMPLETE | declared exit maturities satisfied |
| F2 identity/access | COMPLETE FOR STAGE | package/application behavior + F4 durable proof; HTTP proof remains F5 |
| F3 settings/audit/observability | COMPLETE FOR STAGE | runtime mechanisms + F4 durable proof; HTTP/production proof remains later |
| F4 data/transactions | **CLOSED / PROVEN** | real PostgreSQL 18.6, clean migrations, CAS/rollback/audit/idempotency/readiness |

## 14. Decision

There is no known unresolved defect discovered by this review that belongs to F1–F4 and should be repaired before starting F5.

The correct transition is:

```text
F4 CLOSED
   ↓
F5 API AND SECURITY BOUNDARY
```

Broad domain expansion remains blocked until F10 and the Foundation Readiness Gate complete.
