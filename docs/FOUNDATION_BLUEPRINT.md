# TAYMEX Application Foundation Blueprint

**Status:** Authoritative implementation blueprint  
**Scope:** Cross-cutting application foundation required before broad domain feature construction  
**Rule:** The existing Products work remains a bounded validation slice. No new domain feature expansion proceeds until the Foundation Readiness Gate reports `READY`.

---

## 1. Purpose

TAYMEX is built in two deliberate layers:

```text
Application Foundation
        ↓
Domain Capabilities
        ↓
End-to-end Product Flows
```

The Application Foundation contains the mechanisms that many later modules depend on. These mechanisms are built once, integrated centrally, and proven before business modules multiply.

This blueprint prevents a common failure mode: implementing individual features while authentication, settings, permissions, audit, data rules, UI behavior, error handling, performance rules, or operational behavior are still changing underneath them.

The foundation is **not** a collection of speculative business features. Search, commerce, payments, solar engineering, CMS, AI, and other domain capabilities remain outside the mandatory foundation unless a genuinely cross-cutting mechanism is required.

---

## 2. Foundation completion rule

A capability is not complete because a document exists or because a package compiles.

Foundation maturity is tracked as:

```text
DESIGNED
  ↓
IMPLEMENTED
  ↓
INTEGRATED
  ↓
PROVEN
  ↓
PRODUCTION_PROVEN
```

For the pre-feature gate, every mandatory capability must reach the exit maturity declared in `blueprints/foundation/foundation.manifest.yaml`.

`PROVEN` means the mechanism has executable evidence in TAYMEX itself: real integration tests, runtime behavior, negative cases, or merge/runtime evidence appropriate to the capability.

### Absolute sequencing rule

Until the gate is ready:

- existing Products code may be used as a validation harness for foundation mechanisms;
- no new business module may be expanded into full persistence/API/UI delivery;
- no optional capability is promoted merely to make the foundation appear complete;
- foundation defects are fixed at the owning cross-cutting layer, not patched locally inside a business feature.

---

# 3. Architecture foundation

## 3.1 Runtime topology

The baseline runtime is:

```text
Next.js web/application layer
        ↓
NestJS + Fastify Core API
        ↓
PostgreSQL
```

The API remains a modular monolith for the initial system. Business logic belongs to domain/application modules, not Next.js route handlers or controllers.

### Required rules

- one deployable Core API until measured evidence justifies extraction;
- module ownership is explicit;
- dependencies cross module boundaries only through approved contracts;
- browser code never accesses the database;
- presentation code does not duplicate domain invariants;
- external providers are accessed through ports/adapters where replacement or contract testing is relevant;
- shared platform behavior is consumed as versioned artifacts, never copied source.

## 3.2 Module anatomy

A normal backend module follows:

```text
domain/
application/
infrastructure/
presentation-or-api/
tests/
module.manifest.yaml
```

Not every trivial module needs every folder, but dependency direction remains:

```text
presentation/infrastructure
          ↓
      application
          ↓
        domain
```

The domain must not depend on framework, database, transport, filesystem, or UI code.

## 3.3 Repository truth

Before changing an existing capability, agents must be able to discover actual:

- symbols and signatures;
- model/data fields;
- settings;
- permissions;
- events;
- module ownership;
- public API contracts;
- database schema/migrations when persistence exists;
- shared UI components and patterns.

Unknown repository facts are blockers, not prompts to invent names.

---

# 4. Identity, authentication, sessions, and accounts

Identity is a shared application capability, not feature-specific logic.

The foundation must establish:

- canonical user/account identity;
- secure sign-in and sign-out;
- password hashing and password policy;
- password reset/recovery flow;
- email verification hooks when email identity is used;
- session issuance, rotation, expiry, revocation, and logout-all behavior;
- session/device visibility appropriate to the selected auth model;
- MFA/step-up extension points for privileged actions;
- brute-force protection and rate limiting;
- authentication audit events;
- secure cookie/token storage rules;
- a single authenticated actor representation consumed by authorization and audit.

### Security rules

- credentials and reset tokens never appear in logs or audit payloads;
- authentication failure responses do not leak account existence beyond the approved policy;
- session/token identifiers are rotated where required;
- privileged account operations require stronger verification where policy demands it;
- login and recovery endpoints have dedicated abuse controls.

The foundation does not require public registration if the initial product does not need it, but the identity model must not be rewritten separately for each future portal.

---

# 5. Authorization and access-control foundation

Authorization is permission/policy based. UI visibility is never treated as authorization.

The foundation must provide:

- canonical permission registry;
- generated/typed permission identifiers;
- role-to-permission assignment mechanism;
- explicit resource/action authorization checks;
- support for future scoped permissions without hardcoding tenancy today;
- positive and negative authorization tests;
- privileged-action classification;
- permission-change audit trail;
- central denial behavior and stable error contract.

### Rules

- no `role === "admin"` business authorization shortcuts;
- no implicit permission hierarchy unless declared by policy;
- API/application layer always enforces authorization even if UI hides actions;
- object ownership/scope checks are explicit when resource ownership exists;
- default behavior is deny when authority is unknown.

---

# 6. Configuration, settings, preferences, policies, flags, and secrets

These categories are distinct and must not be collapsed into one settings table.

## 6.1 Canonical settings

Every runtime setting is defined once in the canonical registry with:

- key;
- owner;
- type;
- default where valid;
- allowed scopes;
- explicit precedence/resolution strategy;
- validation;
- sensitivity;
- write permission;
- runtime change behavior;
- lifecycle state.

Feature code consumes generated typed bindings and the effective resolver. It does not reimplement fallback logic.

## 6.2 Required runtime behavior

The settings foundation must prove:

- effective-value resolution;
- provenance/explain output;
- invalid-value rejection;
- cross-setting validation where needed;
- optimistic concurrency for mutable settings;
- audit history;
- rollback through a new audited version;
- saved-but-not-applied diagnostics where detectable;
- cache/version invalidation when hot/reload behavior is eventually enabled.

## 6.3 Secrets

Secrets are never stored in ordinary settings or committed project profiles. They are injected through the deployment secret mechanism and are redacted from logs, diagnostics, audit, and agent-visible evidence where possible.

---

# 7. Canonical errors and validation

All boundaries use a single error model.

The foundation must define:

- stable machine error code;
- HTTP status mapping at transport boundary;
- safe localized user-facing message strategy;
- correlation/trace identifier;
- optional field-level validation details;
- no stack traces/internal SQL/provider errors exposed to clients.

### Validation layers

```text
Transport validation
    ↓
Application/business validation
    ↓
Domain invariants
    ↓
Database constraints as final integrity protection
```

Validation must not exist only in the frontend.

External provider responses are treated as untrusted input and validated at runtime.

---

# 8. Data and persistence foundation

Before broad domain persistence begins, the project must have a single tested persistence approach.

The foundation must establish:

- PostgreSQL runtime and test database strategy;
- canonical schema/ORM mapping approach;
- migration creation and execution policy;
- immutable applied migrations;
- transaction boundaries;
- optimistic concurrency convention;
- unique/integrity constraint convention;
- timestamps and clock handling;
- identifiers;
- deletion/archive policy;
- repository/data-access boundaries;
- index review for list/search/join paths;
- seed/reference-data policy;
- rollback/roll-forward expectations;
- database health/readiness behavior.

### Mandatory data rules

- never rely only on application checks for uniqueness/integrity that the database can enforce;
- writes that can race use atomic database semantics;
- no query/network access inside loops when a set-based/batched operation is appropriate;
- no unrestricted collection queries;
- domain objects are not automatically serialized as public API DTOs;
- migrations are reviewed as production state changes, not ordinary source edits.

---

# 9. Concurrency, idempotency, and transaction safety

The foundation must provide standard patterns for:

- optimistic concurrency / compare-and-swap;
- idempotency keys for replay-sensitive write endpoints;
- transaction boundaries;
- duplicate request handling;
- retry classification;
- outbox/after-commit event publication when a side effect must be coupled safely to a transaction.

Not every CRUD endpoint requires idempotency, but every high-value or replay-sensitive operation must explicitly classify it as required or not applicable.

---

# 10. API and contract foundation

The Core API uses machine-readable contracts.

The foundation must establish:

- TypeSpec/OpenAPI source and generation path;
- generated consumer types/client where applicable;
- schema/runtime validation at external boundaries;
- standard pagination representation;
- canonical error contract;
- authentication context propagation;
- request correlation identifier;
- compatibility/breaking-change checks;
- policy for internal versus externally public APIs.

### API rules

- no manually duplicated DTO shapes between web and API when a generated contract exists;
- list endpoints are bounded;
- filtering/sorting fields are allow-listed;
- clients cannot request arbitrary relation expansion;
- sensitive fields are absent unless explicitly part of an authorized contract;
- public breaking changes require an explicit governed change path.

---

# 11. Audit and activity foundation

Audit and diagnostic logs are different systems.

Audit records must answer:

```text
Who did what, to which resource, when, from which context, and what changed?
```

Foundation audit behavior must support:

- actor identity;
- event/action code;
- resource type/id;
- old/new changed values where appropriate and safe;
- timestamp;
- correlation identifier;
- request/security context where appropriate;
- severity/category;
- sensitive-value redaction;
- immutable append behavior;
- search/filter access for authorized administrators.

Minimum audited classes include:

- authentication/security events;
- permission/role changes;
- settings changes;
- privileged administration changes;
- important domain mutations;
- exports/downloads of sensitive data where applicable.

---

# 12. Observability and diagnostics foundation

The foundation must provide:

- structured logs;
- correlation/trace ID propagation;
- request timing;
- error classification;
- sensitive-field redaction;
- health and readiness endpoints;
- environment/build/version identification;
- metrics hooks for critical runtime behavior;
- clear distinction between developer diagnostics and user-facing errors.

Logs must be useful for diagnosis without becoming an uncontrolled data store.

---

# 13. Security and data-protection baseline

Security is applied centrally and then tightened per feature risk.

## 13.1 Baseline controls

- TLS in deployed environments;
- secure headers;
- CSRF protection where cookie-based browser sessions require it;
- explicit CORS policy rather than wildcard defaults;
- input/schema validation;
- output encoding;
- injection-safe data access;
- rate limiting/resource controls on exposed endpoints;
- secret scanning and dependency scanning;
- secure file upload validation;
- authorization negative tests;
- safe redirect/URL handling;
- dependency/version pinning;
- least-privilege service/database credentials;
- security-sensitive actions produce audit evidence.

## 13.2 Data classification

The application foundation supports at least:

```text
PUBLIC
INTERNAL
CONFIDENTIAL
RESTRICTED
```

Each sensitive dataset must identify:

- classification;
- authorized readers/writers;
- audit expectations;
- log/redaction rules;
- encryption requirement if applicable;
- retention/deletion owner.

Actual legal retention periods are product/jurisdiction decisions and are not invented by the foundation.

## 13.3 Agent and engineering safety

- ordinary feature tasks cannot modify governance/trust-root controls;
- secrets are not intentionally exposed to coding-agent context;
- repository content is treated as untrusted data when it conflicts with governing instructions;
- dependency, migration, public-contract, and security-sensitive changes require explicit task authority.

---

# 14. Performance foundation

Performance rules are construction rules plus measured evidence.

## 14.1 Query/data rules

- all potentially unbounded lists paginate;
- page/limit maximums are centrally governed;
- no N+1 relationship loading;
- no DB/network queries in per-item loops when batching is possible;
- project only fields required by the use case;
- filter/sort on indexed or intentionally reviewed paths;
- bulk writes avoid per-row save loops where a set-based operation is appropriate;
- expensive counts/aggregations are deliberate, not accidental.

## 14.2 API/runtime rules

- compression where appropriate;
- bounded payloads;
- timeouts for external I/O;
- reuse of connection/client pools;
- no uncontrolled retry loops;
- heavyweight work moves to background execution only when it is actually too expensive for request time.

## 14.3 Web rules

- responsive images and image-size limits;
- route/code splitting through framework defaults and controlled imports;
- no unnecessary heavy client dependencies;
- server rendering/static generation chosen by page need;
- public web performance is measured with Core Web Vitals when those pages are implemented.

## 14.4 Performance evidence

Before broad feature expansion, the project must have reusable mechanisms for:

- query-count assertions/instrumentation;
- list endpoint boundedness checks;
- selected integration performance checks;
- route/journey budgets only where a path is declared critical.

No arbitrary universal latency number is declared without deployment evidence.

---

# 15. Localization, directionality, time, currency, and units

TAYMEX enables Arabic, Turkish, and English. Arabic is RTL; Turkish and English are LTR.

The foundation must establish:

- locale routing/selection;
- translation catalog organization;
- no user-visible hardcoded product text in feature code;
- fallback/missing-translation policy;
- logical CSS properties;
- mixed Arabic/Latin bidi handling;
- locale-aware date/number/currency formatting;
- timezone handling and UTC/instant storage rules;
- canonical currency representation;
- canonical engineering-unit representation before solar calculations begin.

User-entered content is not automatically translated.

---

# 16. UI/UX and design foundation

The design foundation is a **closed governed system**:

```text
Design Tokens
   ↓
Primitives
   ↓
Components
   ↓
Patterns
   ↓
Application Shells
   ↓
Product Pages
```

## 16.1 Mandatory design rules

- token-only governed colors, spacing, typography, radii, shadows, and layout values;
- no feature-local replacement of canonical Button/Input/Card/Dialog/Table/etc.;
- no direct product import of low-level interaction libraries;
- mobile-first composition;
- RTL/LTR correctness by construction through logical properties;
- keyboard support and visible focus;
- touch-friendly controls;
- accessible names/labels/relationships;
- no horizontal page overflow;
- consistent loading, empty, error, permission-denied, success, and destructive-confirmation behavior;
- destructive actions are visually and behaviorally distinct;
- error messages appear next to the problem and in a usable summary when appropriate;
- reusable patterns expose controlled slots/composition rather than encouraging forks.

## 16.2 Theme and typography decisions that must be closed in the foundation

Before feature-page design scales, TAYMEX must have approved:

- brand semantic color mapping for light/dark modes;
- Arabic and Latin/Turkish typography families and weight availability;
- typography scale;
- spacing/density scale;
- radii/elevation policy;
- icon policy;
- content-width/container rules;
- navigation/shell behavior at desktop/tablet/mobile;
- admin shell IA foundation;
- public-site shell foundation;
- customer-portal shell foundation if the portal is in the first release.

## 16.3 Core reusable UI inventory

Foundation must cover the shared behavior of:

- Button/IconButton;
- text/number/textarea/select/checkbox/switch inputs;
- form field/error/help structure;
- Card/Surface;
- Alert/Toast/Inline feedback;
- Dialog/Confirmation;
- Tabs;
- Search field;
- DataTable;
- Pagination;
- Filter panel/drawer;
- page header/action bar;
- loading/skeleton;
- empty/error/permission state;
- navigation/sidebar/mobile drawer;
- file/media input when file foundation is enabled.

A component is not complete until its applicable disabled/loading/error, keyboard, RTL/LTR, responsive, and accessibility states are covered.

---

# 17. Files and media foundation

Before product images, documents, or uploads proliferate, establish one media/storage contract.

Required mechanisms:

- storage port/provider abstraction where provider replacement is expected;
- upload size/type/extension/MIME validation;
- generated storage names rather than trusting client filenames;
- image dimension/processing policy;
- metadata ownership;
- authorization for private downloads;
- public/private file distinction;
- cleanup/orphan policy;
- virus/malware scanning hook where deployment risk requires it;
- signed/temporary download mechanism for private storage where appropriate;
- audit for sensitive upload/download actions.

Storage provider selection is deployment configuration, not business-feature code.

---

# 18. Notifications, events, background work, and external side effects

Features should declare **what happened**, not directly embed provider-specific email/SMS logic.

The foundation must establish:

- canonical event registry;
- notification command/event contract;
- localized template mechanism;
- provider adapter boundary;
- retry/failure classification;
- user preference hook for optional notifications;
- mandatory-notification classification for security/transactional cases;
- event/outbox strategy for side effects that must not be lost after a committed transaction;
- background-job execution contract when asynchronous work becomes necessary.

No broker or separate worker is introduced solely for architectural symmetry. The mechanism is selected when real asynchronous work exists, but the contract must be stable before many features depend on ad-hoc jobs.

---

# 19. Common primitives

The foundation must settle cross-domain primitives that otherwise become inconsistent:

## Clock/time
- explicit clock abstraction in domain/application code where testability matters;
- UTC/instant persistence where appropriate;
- timezone only at business/presentation boundaries.

## Money
- amount + currency as one canonical type/contract;
- no binary floating-point arithmetic for monetary business rules;
- deterministic scale and rounding policy per operation.

## Quantities/units
- amount + unit rather than ambiguous raw numbers for engineering-sensitive values;
- explicit conversions;
- canonical unit identifiers;
- validation of compatible units.

These primitives are especially important before quotations, commerce, or engineering calculations are implemented.

---

# 20. Testing and verification foundation

The project must provide reusable test layers rather than inventing testing per feature.

Required layers:

- unit/domain tests;
- application/use-case tests;
- PostgreSQL integration tests;
- API/contract tests;
- authorization positive/negative tests;
- concurrency/idempotency tests where relevant;
- browser E2E for critical journeys;
- UI component/pattern tests;
- responsive RTL/LTR tests;
- accessibility automation;
- visual regression for governed references;
- security/static/dependency/secret checks;
- query/performance instrumentation for tagged paths.

### Test rules

- tests verify behavior and invariants, not implementation trivia;
- failures are reproducible;
- a bug fix should have failing-before/passing-after evidence where feasible;
- shared foundation changes run affected consumer tests;
- mocks do not replace integration proof where the contract being claimed is database/network/runtime behavior.

---

# 21. Operations and deployment foundation

Before production-bearing feature delivery, establish:

- validated environment configuration;
- development/test/staging/production profiles;
- secret injection;
- health/readiness checks;
- migration-before/with-deploy strategy;
- rollback/roll-forward policy;
- structured release/version metadata;
- CI required gates;
- dependency update policy;
- backup schedule and retention based on final deployment needs;
- restore procedure and restore test;
- database/file backup consistency considerations;
- log/metric retention;
- incident/break-glass procedure that remains auditable.

A backup is not considered operationally complete until restore has been tested.

---

# 22. Public-web/SEO foundation

Because TAYMEX includes a public website, shared public-web mechanics must be settled before many public pages are authored:

- metadata/title/description composition;
- canonical URLs;
- sitemap generation;
- robots policy;
- Open Graph/social metadata;
- hreflang/locale alternates;
- structured-data extension mechanism;
- redirect/not-found conventions;
- image optimization;
- cache/revalidation strategy by content type.

Actual marketing copy and page content remain product content, not foundation.

---

# 23. Foundation implementation sequence

The foundation will be implemented in coherent groups so later groups can depend on earlier ones without repeatedly reopening fundamentals.

## F1 — Core application contracts

- canonical errors;
- validation;
- clock/time;
- money/currency;
- quantity/unit primitives;
- localization foundation.

## F2 — Identity and access

- identity/account model;
- authentication/session lifecycle;
- authorization/roles/permissions;
- security actor context.

## F3 — Settings, audit, and observability

- effective settings runtime;
- settings administration contract/history;
- audit core;
- structured logging/correlation/health.

## F4 — Data and transaction foundation

- PostgreSQL integration;
- schema/migration rules;
- repository conventions;
- transaction handling;
- optimistic concurrency;
- idempotency primitives;
- integration-test database.

## F5 — API and security boundary

- TypeSpec/OpenAPI path;
- generated contract types;
- canonical error transport;
- request identity/correlation;
- input/output security controls;
- rate limiting and security headers;
- dependency/secret scanning.

## F6 — Performance foundation

- bounded list/query conventions;
- query instrumentation/N+1 proof;
- index/query-plan evidence path;
- external-I/O timeout/retry policy;
- web asset/performance rules.

## F7 — Files, events, notifications, and side effects

- media/storage contract;
- upload security;
- event registry/runtime convention;
- notification contract/provider boundary;
- outbox/background-work mechanism when required.

## F8 — Complete UI/UX foundation

- approved theme/brand semantics;
- typography;
- shell/navigation behavior;
- component/pattern inventory;
- forms/tables/feedback/states;
- responsive matrix;
- RTL/LTR;
- accessibility;
- visual baselines.

## F9 — Testing, delivery, and recovery

- complete test harness layers;
- CI/ruleset proof;
- deployment configuration;
- migrations/deploy integration;
- backup/restore proof;
- operational diagnostics.

## F10 — Integrated foundation proof

Use the bounded Products validation slice to prove the cross-cutting mechanisms together:

```text
Authenticated actor
  → authorization
  → settings
  → application/domain
  → PostgreSQL transaction/concurrency
  → API contract/errors
  → audit + observability
  → UI/i18n/a11y/responsive
  → CI/governance evidence
```

The purpose is not to complete the Products feature. It is to prove that foundation mechanisms compose correctly.

After F10 passes, Products requirements are finalized and Product implementation may resume as the first full domain capability.

---

# 24. Foundation exit gate

The foundation is ready for broad feature construction only when all mandatory entries in `foundation.manifest.yaml` satisfy their declared exit maturity.

At minimum, the final review must prove:

1. authentication/session and authorization work end to end;
2. settings resolve centrally with provenance and safe writes;
3. audit and observability capture real mutations and failures;
4. PostgreSQL migrations, constraints, transactions, concurrency, and test strategy are real;
5. API contracts and generated types are the source used by consumers;
6. validation/errors/security controls are centralized;
7. performance rules can detect unbounded/N+1/query amplification on representative paths;
8. AR/TR/EN, RTL/LTR, theme, typography, mobile behavior, accessibility, and shared UI patterns are real in TAYMEX;
9. file/media and external-side-effect mechanisms have one controlled path;
10. tests, CI, trust-root, deploy configuration, and restore strategy are operationally credible;
11. no mandatory foundation capability remains only `DESIGNED`;
12. the integrated validation slice passes without local substitutes for shared mechanisms.

Only then do we begin systematic domain implementation module by module.

---

# 25. Domain implementation after foundation

After readiness, each domain capability follows the same order:

```text
Requirements + invariants + roles + states
          ↓
UX / information architecture for that capability
          ↓
Data + API + events + settings + permissions contract
          ↓
Task contracts / repository truth
          ↓
Implementation
          ↓
Unit + integration + E2E + security/performance evidence
          ↓
Acceptance
```

A module is completed as deeply as practical before moving to the next module. Shared-foundation changes discovered later are treated as explicit foundation changes with affected-consumer verification, not hidden local patches.

---

# 26. Sources of machine truth

This document defines architectural intent and foundation acceptance. It does **not** replace machine registries.

Canonical runtime truth remains in:

- `tooling/registry/settings.registry.yaml` — settings;
- `tooling/registry/permissions.registry.yaml` — permissions;
- `tooling/registry/events.registry.yaml` — events;
- module manifests — ownership and declared dependencies;
- generated API/schema contracts — public contract shapes;
- database migrations/schema — persisted data truth;
- component manifests/design tokens — shared UI truth;
- `blueprints/foundation/foundation.manifest.yaml` — foundation readiness state only.

If descriptive documentation and executable/runtime truth disagree, the disagreement is a defect that must be resolved; documentation does not silently override runtime truth.
