# F5 HTTP and Security Runtime Proof

## Evidence state

**PROVEN**

F5 runtime behavior was executed on the canonical consumer revision below using the approved Node/pnpm line and a real disposable PostgreSQL 18 database. The proof is not inferred from unit tests or documentation.

## Tested revisions

```text
TAYMEX:               36602be3b40314f2b7aee8265b5fce13663a3d90
ENGINEERING_PLATFORM: c3d865ee97f33c7d0247e00fdd02e0c771ea6f98
Node:                 v24.14.0
pnpm:                 11.24.0
Python:               3.13.5
PostgreSQL:            18.6
server_version_num:   180006
```

The later F5 closure commit changes only governance/task metadata, maturity/evidence documents, and structural verifiers. It does not modify the runtime implementation proven by this evidence.

## Install, build, and package tests

The operator executed a clean local validation from the tested TAYMEX revision:

- `pnpm install --frozen-lockfile` — PASS;
- `pnpm -r --if-present build` — PASS for packages, Next.js web, and NestJS/Fastify API;
- `pnpm -r --if-present test` — PASS;
- `pnpm --filter @taymex/api test:http-primitives` — PASS, including safe 403/500 error-normalization regressions.

## Generated contract and structural proof

The same revision passed:

- `pnpm api:check` — operational OpenAPI and TypeScript bindings match the canonical OpenAPI authoring source;
- `pnpm f5:verify` — `SUMMARY: PASS (149 passed, 0 failed)`;
- `python3 scripts/verify-f0-f4-foundation.py` — `SUMMARY: PASS (19 checks)` before closure metadata advancement;
- settings binding verification — PASS;
- permission binding verification — PASS;
- project profile verification — PASS;
- platform repository validation — PASS;
- independent consumer boundary verification — PASS.

## Dependency advisory proof

`pnpm audit --prod --audit-level high` returned:

```text
No known vulnerabilities found
```

This is evidence for the F5 dependency advisory gate at the time of the validated revision. It is not a permanent claim about future dependency state.

## Real PostgreSQL 18 HTTP integration

A disposable `postgres:18` runtime reported:

```text
server_version:     18.6 (Debian 18.6-1.pgdg13+2)
server_version_num: 180006
status:             accepting connections
```

With `F5_DATABASE_TESTS=1` and `TEST_DATABASE_URL` pointing to that database:

```text
$ node --test tests/f5-http.integration.test.mjs
✔ F5 proves real HTTP authentication, authorization, settings, audit, errors and security controls
ℹ tests 1
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

The integration proof exercises the real application factory and PostgreSQL-backed runtime. It proves, among other checks:

- unauthenticated/invalid/revoked session denial;
- secure host-only session-cookie transport semantics;
- a principal without the required permission receives `403 AUTHORIZATION_DENIED`;
- a permitted AAL1 principal is denied when AAL2 is required;
- the AAL2 privileged path succeeds;
- role creation/assignment uses the canonical permission path;
- privileged Settings write/read executes against PostgreSQL;
- Audit records are produced/queryable through the privileged HTTP path;
- correlation IDs propagate through response/error behavior;
- safe error envelopes do not expose internal messages/stacks;
- CORS/security headers/body/content-type limits are enforced;
- bounded HTTP rate limiting is exercised through the actual HTTP boundary;
- liveness/readiness execute through the real runtime and PostgreSQL readiness path.

## Actual API process smoke proof

The built API process was started separately with the validated PostgreSQL runtime.

```text
GET /api/health       -> 200, status=UP
GET /api/health/ready -> 200, status=READY, postgresql=UP
```

The captured process log was reviewed and contained no database URL, password, session secret, stack leakage, or other reported credential leakage.

## Defects discovered and repaired during real proof

The real runtime proof was allowed to fail and expose defects rather than being weakened to fit the implementation. The following were fixed before the final passing revision:

1. Fastify CORS typing now copies the immutable origin list only at the framework boundary (`origin: [...allowedOrigins()]`).
2. `AuthorizationDeniedError` is explicitly adapted by the central HTTP error normalizer to the canonical safe `403` response rather than falling through to `500`.
3. generated NestJS route paths translate OpenAPI `{param}` placeholders to Nest `:param` syntax from the canonical contract generator.
4. the PostgreSQL Settings batch query qualifies the joined value columns, eliminating the real PostgreSQL `scope` ambiguity.
5. readiness proof expects the actual contract state `READY` rather than weakening the implementation to an incorrect assertion.

These are implementation fixes at the owning boundary; no governance, security, CAS, or PostgreSQL guarantees were disabled to make the test pass.

## Governance, trust, and handoff evidence

On the tested runtime revision:

- task governance for `FOUNDATION-F5-001` — PASS;
- local trust-root verification — PASS;
- handoff creation and live-repository verification — PASS;
- working tree — clean.

## Exact claims and non-claims

This proof supports `PROVEN` maturity for the F5 application/API runtime capabilities that were exercised against the real consumer runtime. It does **not** claim:

- remote repository merge-rule enforcement (`governance.trust-root` remains delegated to F9);
- multi-instance/edge DDoS protection (the F5 rate limiter is intentionally per-process);
- production log/metrics transport durability or deployment diagnostics (operational delivery remains F9);
- a complete MFA enrollment/recovery product flow; F5 proves the canonical AAL policy/enforcement boundary, while a concrete step-up flow is introduced only when an enabled product flow requires it;
- browser/UI/accessibility behavior (F8);
- query-plan/performance foundation proof (F6);
- files/events/notification side-effect delivery (F7).
