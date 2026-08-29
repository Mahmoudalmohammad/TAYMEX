# TAYMEX Foundation F5 — API & Security Boundary Closure Report

**Stage:** F5 — API and Security Boundary
**Final stage decision:** **CLOSED**
**Next foundation stage:** `F6`
**Broad feature expansion:** remains **BLOCKED** until the complete Foundation Readiness Gate is satisfied.

## 1. Closure decision

F5 is closed because the API/security boundary is no longer supported only by structural checks or mocked execution. The canonical implementation was installed and built on Node 24/pnpm 11, executed through a real NestJS/Fastify HTTP runtime backed by PostgreSQL 18.6, passed the negative and positive security matrix, passed the dependency advisory gate, and passed governance/trust/boundary verification on the tested committed runtime revision.

Runtime evidence is recorded in `docs/evidence/F5_HTTP_SECURITY_PROOF.md`.

## 2. Capabilities promoted by F5 proof

The following capabilities now have real-consumer evidence sufficient for `PROVEN` maturity:

- `architecture.runtime-boundaries`;
- `identity.authentication-sessions`;
- `authorization.permissions-policies`;
- `settings.effective-runtime`;
- `audit.core`;
- `observability.logging-tracing-health`;
- `api.contracts`;
- `security.application-baseline`.

`security.data-classification` remains `INTEGRATED`, which already satisfies its declared exit maturity. No later-stage capability is promoted merely because F5 passed.

## 3. Canonical API contract path

F5 establishes one editable contract source:

```text
contracts/openapi/taymex-v1/source.openapi.yaml
```

From it, the generator produces:

- `contracts/openapi/taymex-v1/openapi.generated.yaml`, stamped with the source SHA-256;
- `apps/api/src/generated/api-contracts.generated.ts`.

`api.contract.yaml` binds contract ownership to `api-foundation`. Controllers consume generated path/method/success/security metadata rather than redeclaring a parallel HTTP policy.

The real proof exposed and fixed the OpenAPI-to-Nest path placeholder conversion, so `{param}` is deterministically emitted as `:param` for the Nest router.

## 4. Runtime and persistence composition

The NestJS/Fastify API composes one PostgreSQL-backed foundation runtime. Identity, Roles, Settings, Audit, readiness, and HTTP security share the approved data/transaction services. Production code does not fall back to in-memory persistence.

The Settings privileged route exercised the actual PostgreSQL 18 store and exposed an ambiguous joined-column query that unit-only evidence had not revealed. The fix qualifies the value-side columns at the PostgreSQL store boundary rather than moving or duplicating query behavior in the controller.

## 5. Authentication and authorization

Session transport uses the canonical `__Host-taymex_session` cookie with Secure/HttpOnly/SameSite/Path rules. The shared HTTP security guard authenticates canonical sessions, builds the actor context, enforces generated permissions, and enforces operation assurance requirements before controller execution.

The real HTTP matrix distinguishes three materially different states:

1. no required permission → `403 AUTHORIZATION_DENIED`;
2. permission present but assurance only AAL1 when AAL2 is required → `403 IDENTITY_ASSURANCE_REQUIRED`;
3. permission present and AAL2 → privileged operation succeeds.

A concrete MFA enrollment/step-up product flow is not fabricated in F5. The AAL enforcement boundary is proven; product-specific elevation is introduced when an enabled flow requires it.

## 6. Canonical safe errors

The application uses one HTTP exception boundary. Known application/platform errors are adapted to stable machine-readable codes and categories; unknown failures become `HTTP_INTERNAL_ERROR`. Raw internal exception messages and stacks are not returned to clients.

The real proof discovered that `AuthorizationDeniedError` from the platform authorization package is not a TAYMEX `ApplicationError`. F5 therefore explicitly adapts that external error at the HTTP/application boundary to a safe canonical `403`, rather than changing package inheritance or matching error-name strings.

Regression tests preserve both behaviors:

- `AuthorizationDeniedError` → safe 403;
- unknown `Error` → safe 500.

## 7. Correlation, observability, and readiness

Correlation is resolved before early HTTP failure paths and reused in response/error logging. F5 proves structured request/error behavior, real liveness, and real PostgreSQL readiness through the application process.

The API smoke proof returned:

```text
/api/health       -> 200 UP
/api/health/ready -> 200 READY (postgresql=UP)
```

Production collection/delivery durability for logs/metrics and deployment diagnostics remains an F9 operational responsibility. That later operational concern does not negate the real-consumer proof of the F5 observability runtime itself.

## 8. Security baseline

F5 centralizes and proves:

- explicit credentialed CORS without wildcard origin;
- no trust of caller-controlled forwarding identity (`trustProxy=false`);
- body/request/parameter bounds;
- prototype-pollution parsing policy;
- security and anti-cache response headers;
- safe content-type/payload errors;
- per-process bounded HTTP/sign-in throttling;
- high-confidence hard-coded-secret scanning on production/config surfaces;
- live dependency advisory scanning (`pnpm audit --prod --audit-level high`).

The advisory run reported no known vulnerabilities at the configured threshold. Multi-instance/edge abuse protection remains deployment-owned in F9 and is not falsely claimed here.

## 9. Executed runtime evidence

Validated runtime revision:

```text
TAYMEX:               36602be3b40314f2b7aee8265b5fce13663a3d90
ENGINEERING_PLATFORM: c3d865ee97f33c7d0247e00fdd02e0c771ea6f98
Node:                 24.14.0
pnpm:                 11.24.0
PostgreSQL:            18.6 / 180006
```

Final runtime results include:

- frozen-lockfile install — PASS;
- recursive build — PASS;
- recursive package tests — PASS;
- HTTP primitive regressions — PASS;
- generated API contract check — PASS;
- F5 structural verifier — `149 passed, 0 failed` before closure-state assertions were added;
- F0–F4 regression verifier — PASS before stage advancement;
- platform/profile/settings/permissions/boundary checks — PASS;
- dependency advisory gate — PASS;
- real PostgreSQL-backed HTTP integration — `1 pass, 0 fail, 0 skip`;
- actual API health/readiness smoke — PASS;
- task governance — PASS;
- trust-root local verification — PASS;
- handoff verification — PASS.

## 10. Stage completion versus later operational proof

F5 stage completion does not mean every cross-cutting capability is production-proven. Specifically:

- remote merge authority remains F9;
- production log/metrics delivery and deployment diagnostics remain F9;
- distributed/edge abuse protection remains F9;
- performance/query-plan evidence is F6;
- files/events/notifications/side effects are F7;
- browser/UI/RTL/accessibility/visual proof is F8;
- complete delivery/recovery and integrated harness proof continue through F9/F10.

Products remain frozen for foundation proof.

## 11. Final F5 status

```text
Architecture runtime boundary     PROVEN
Identity/session HTTP boundary    PROVEN
Authorization/AAL boundary        PROVEN
Settings privileged runtime       PROVEN
Audit HTTP composition            PROVEN
Observability HTTP/readiness      PROVEN
API contracts/runtime             PROVEN
Application security baseline     PROVEN
Data classification               INTEGRATED (exit maturity satisfied)
Foundation current stage          F6
Foundation readiness              BLOCKED
Products validation slice         FROZEN_FOR_FOUNDATION_PROOF
```

**F5 is closed without weakening F6–F10 proof requirements.**
