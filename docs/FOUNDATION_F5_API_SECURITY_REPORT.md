# F5 API and Security Boundary — Implementation Review

## Status

**IMPLEMENTED / INTEGRATED — REAL HTTP PROOF PENDING**

F5 is intentionally not closed by this report. The implementation is structurally integrated and repository-governed, but the final exit evidence requires the approved Node 24/pnpm runtime, a disposable PostgreSQL 18 database, the real NestJS/Fastify HTTP integration suite, and the live dependency advisory scan.

## Scope implemented

- canonical F5 API contract ownership through `api.openapi.taymex.v1`;
- one editable OpenAPI 3.1 authoring source and generated stamped operational OpenAPI;
- generated TypeScript operation/request/response bindings;
- NestJS/Fastify application factory and one PostgreSQL-backed composition root;
- canonical session authentication and actor construction;
- centralized permission and AAL enforcement from generated API operation metadata;
- secure host-only HttpOnly session cookie;
- correlation propagation across success and early failure paths;
- safe canonical error envelope with no raw exception leakage;
- explicit CORS, body/parameter/time bounds, prototype poisoning controls, anti-cache and security headers;
- bounded per-process HTTP and sign-in throttling without claiming distributed protection;
- PostgreSQL-backed Identity, Roles, Settings and Audit composition without memory fallbacks;
- structured request/error logging and readiness on the same database composition root;
- machine-readable data classification on every F5 operation;
- high-confidence secret scanning on production/config surfaces;
- guarded real HTTP integration suite for PostgreSQL 18.

## Truth ownership

The editable API truth is `contracts/openapi/taymex-v1/source.openapi.yaml`. `scripts/generate-api-contract-bindings.py` deterministically produces:

1. `contracts/openapi/taymex-v1/openapi.generated.yaml`, stamped with the SHA-256 of the authoring source; and
2. `apps/api/src/generated/api-contracts.generated.ts`.

`contracts/openapi/taymex-v1/api.contract.yaml` binds the contract to the `api-foundation` module. Controllers consume generated operation metadata for paths, methods, success status and security policy rather than redeclaring those values.

The platform rule registry currently describes API-003 using the term "TypeSpec source". F5 deliberately selected the Blueprint's OpenAPI authoring path and did not add a TypeSpec compiler dependency solely to satisfy wording when the executable manifest/schema supports a canonical source plus generated operational OpenAPI. This terminology mismatch is not hidden and must be resolved only by a separately governed platform-policy task if the platform later decides TypeSpec is mandatory rather than optional.

## Security boundaries

Authentication is session-cookie based. The cookie is `__Host-taymex_session` with `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/` and no Domain attribute. Missing, malformed, expired or revoked sessions fail closed.

Privileged operations declare canonical permission and AAL requirements in the API source. `HttpSecurityGuard` performs canonical session authentication, permission checks and assurance checks before controllers run. Controllers do not carry independent authorization logic.

`trustProxy` is false. Therefore F5 does not trust caller-controlled forwarding headers as peer identity. CORS is explicit and configuration-driven; credentialed wildcard CORS is impossible in the application configuration.

All success and failure responses pass through the shared response-security policy. Unknown exceptions are converted to a stable internal code without returning raw exception messages or stacks.

## Deliberately bounded claims

- The in-process rate limiters are bounded protection for one API process. They are **not** claimed as multi-instance or edge DDoS protection.
- F5 proves AAL2 route policy enforcement, not an MFA enrollment/verification product flow. A concrete step-up verifier is introduced only when a product flow requires elevation.
- `ConsoleJsonLogSink` proves structured/redacted process logs; production collection/delivery durability remains F9.
- Recovery/verification secret delivery remains F7 and is not exposed through F5 routes.

## Current evidence

Local constrained-environment evidence:

- `python3 scripts/generate-api-contract-bindings.py --check` — PASS;
- `python3 scripts/verify-f5-api-security.py` — PASS;
- `./scripts/platform validate` — PASS, including one canonical API contract and 14 persisted data models;
- strict TypeScript no-emit check of the modified API boundary using temporary external declarations — PASS;
- HTTP primitive tests — PASS;
- observability regression tests — PASS.

Temporary declarations/symlinks used only because this execution environment lacks the approved Node 24/pnpm installation are not project artifacts and must not be included in delivery.

## Remaining exit evidence

F5 stays at `currentStage: F5` until all of the following are supplied from a clean local environment:

1. Node 24.x and pnpm 11.24.0 clean install/build/test;
2. `api:check` and `f5:verify` PASS;
3. dependency advisory scan PASS at high-or-higher threshold;
4. PostgreSQL 18 real HTTP integration test PASS with zero skips;
5. project/profile/platform validation PASS;
6. consumer boundary PASS;
7. task governance on the committed F5 diff PASS;
8. trust-root local verification on the committed F5 diff PASS.

Only then may the applicable F5 capabilities be promoted to `PROVEN` and `foundation.currentStage` advance to F6.
