# TAYMEX / ENGINEERING PLATFORM
# Cumulative Expert Review & Critical Decision Log

> **Purpose:**  
> This document is a cumulative, evidence-based review log for external expert opinions about the TAYMEX / ENGINEERING_PLATFORM architecture, roadmap, implementation strategy, governance model, and execution progress.
>
> It is **not** a replacement for the main project plan or ADRs.  
> Its role is to prevent expert feedback from being accepted or rejected by intuition alone, and to ensure that important concerns are tracked until they are either:
>
> - confirmed and converted into action,
> - partially accepted with correction,
> - deferred with a clear reason,
> - rejected because evidence does not support them,
> - or left open pending verification.

---

## 1. Review Principles

Every expert opinion must be evaluated against the following rules:

1. **No expert statement is treated as fact by default.**
2. **No plan change is made solely because one expert strongly recommends it.**
3. We distinguish between:
   - architectural flaw,
   - implementation gap,
   - roadmap timing issue,
   - operational risk,
   - unverified assumption,
   - optional future optimization.
4. A concern already present in the roadmap is not automatically a “missed gap”; it may simply be **planned but not yet implemented**.
5. Percent-complete claims such as “20% implemented / 80% designed” are rejected unless a measurable basis is defined.
6. We prefer capability-level maturity states instead of generic percentages:
   - `DESIGNED`
   - `IMPLEMENTED`
   - `INTEGRATED`
   - `PROVEN_ON_REAL_CONSUMER`
   - `PRODUCTION_PROVEN`
7. We do not mark a concern as closed merely because documentation exists.
8. We do not mark a capability as proven merely because a local demo passes.
9. A real consumer project is required to validate platform claims.
10. Governance mechanisms are only considered enforceable when they have **real authority over merge/deployment**, not merely when CLI checks exist.

---

# 2. Current Overall Assessment

The current direction remains fundamentally sound.

The strongest architectural decisions so far are:

- separating human documentation, machine-readable manifests, and executable enforcement;
- centralized and typed settings governance;
- task contracts with default-deny behavior;
- evidence-based completion rather than agent self-declaration;
- risk-based quality gates;
- reusable golden paths instead of free-form agent implementation;
- central platform ownership instead of per-project duplicated settings and rules;
- explicit resistance to premature enterprise complexity;
- treating UNKNOWN as safer than guessing.

However, the project is entering a critical transition:

> **The primary risk is no longer poor architecture.  
> The primary risk is continuing horizontal platform construction without sufficiently testing it through a real consumer.**

This does **not** mean “stop building the platform.”

The preferred model from this point is:

> **Stop non-essential horizontal platform expansion → start a real TAYMEX vertical slice → build platform capabilities only when the slice proves they are necessary.**

This is a **pull-based platform development model**.

After Expert 02, an additional distinction is now explicit:

> **The platform is currently stronger at preventing implementation drift than at preventing functional omission.**

The architecture already recognizes functional correctness, state/invariant checks, authorization-negative tests, concurrency and idempotency. The concern is therefore not primarily a missing design idea; it is that these controls are not yet proven at the same maturity as scope/UI/settings governance.

The first consumer slice must therefore be designed to pressure-test not only **“did the agent stay inside the rules?”** but also **“did the implementation omit required behavior, edge cases, invariants, authorization, or concurrency safety?”**

After Expert 03, a third distinction is now explicit:

> **A capability may be architecturally decided, registered as a future gate, partially implemented, or proven in a real consumer. Those states must never be collapsed into “exists” or “does not exist.”**

This matters because several Expert 03 “missing” items — pagination, N+1 controls, authorization-negative testing, settings hardcode prevention, functional/concurrency gates, error/observability primitives — already exist in authoritative architecture and gate catalogs. Their remaining problem is implementation/integration/proof, not lack of design.

Expert 03 also exposes a useful sequencing ambiguity that must be resolved:

> TAYMEX is supposed to be the first independent validation consumer, while independent consumers are supposed to consume released platform artifacts.

Therefore the first slice must prove a **real package/artifact boundary** without waiting for the later multi-consumer release program. A pre-release/internal `0.x` artifact path is the preferred bootstrap; copying platform source into TAYMEX is not.


After Expert 04, a fourth distinction becomes important:

> **“Ready for broad product construction” and “ready to begin a bounded validation slice” are different readiness states.**

The platform is **not yet ready for broad TAYMEX feature construction or production confidence**.  
But that does **not** imply that TAYMEX should wait outside the platform until the platform becomes “complete.”

The first bounded TAYMEX slice is now the mechanism by which the platform becomes ready.

A second distinction is also explicit:

> **Correct-by-construction is primarily about making invalid changes fail cheaply and preventing them from merging — not about guaranteeing that an agent never writes a bad local draft.**

The local loop should therefore optimize for very fast feedback, while merge protection remains non-bypassable.

---

# 3. Expert Review Register

| Expert | Overall value | Key contribution | Main concern with their review | Status |
|---|---|---|---|---|
| Expert 01 | High | Correctly emphasized implementation-vs-design gap and urgency of real consumer validation | Some conclusions were overstated or unsupported; several priorities need reordering | REVIEWED |
| Expert 02 | Very High | Exposed functional-completeness risk, governance trust-root risk, historical-defect back-testing, and adoption friction | Several good ideas are promoted too early; some claimed gaps already exist in design and need implementation rather than redesign | REVIEWED |
| Expert 03 | High | Strong inventory of implementation maturity, real-agent testing need, exception-path usability, distribution proof, and abstraction/operational risks | Frequently conflates "designed but not implemented" with "never addressed"; recommended sequencing would delay the real TAYMEX consumer behind another synthetic foundation cycle | REVIEWED |
| Expert 04 | Very High | Strong synthesis of the platform’s actual maturity, local-vs-merge enforcement distinction, Task Contract authority, backend runtime-topology risk, UI enforcement depth, baseline governance, and scope braking | Several numeric maturity/readiness scores are subjective; some “missing” items are already designed; “TAYMEX not ready” is too absolute if interpreted as delaying the bounded validation slice | REVIEWED |
| Expert 05 | High | Reinforces exception discipline, false-positive/false-negative governance testing, toolchain self-consistency, automated project bootstrap, policy ownership, and upgrade/compatibility concerns | Mostly confirmatory rather than novel; its phrase “most prior failure causes are under control” overstates current implementation maturity, and “one automated rule reference only” needs refinement into one policy intent with multiple enforcement adapters | REVIEWED |
| Expert 06 | Very High | Strong evidence-discipline review; sharpens Repository Truth limits, adapter contract tests, agent usability testing, platform supply-chain/DR, deprecation/distribution concerns, and the difference between mapped controls and proven controls | Final sequencing is too conservative: requiring all Wave 2 + Wave 3 before any TAYMEX feature contradicts the accepted roadmap where the real TAYMEX vertical slice is the proof mechanism that precedes/develops deeper Repository Truth | REVIEWED |
| Expert 07 | Very High | First substantial philosophical challenge: not every architectural decision is automatable; sharpens bounded agency, governance evolution, golden-pattern escape behavior, agent execution telemetry, bus-factor/maintenance economics, and L2 shell boundary concerns | Radical “build TAYMEX fully first, extract platform after project 2/3” recommendation discards already-proven historical evidence and would recreate the post-hoc governance cycle; Nx lock-in critique is partly factual but overstated for our actual OSS + custom-policy architecture; several quantitative/time claims are unsupported | REVIEWED |
| Expert 08 | Duplicate / Non-independent | Substantively repeats Expert 07’s philosophical critique, recommendations, examples, and conclusions | Must not be counted as an independent convergence signal; no new roadmap/ADR decisions are justified by repetition alone | REVIEWED_AS_DUPLICATE |
| Expert 09 | Very High | Strong adversarial review of the governance system itself: proof-asset protection, forward self-hosting, context/prompt-injection boundaries, CI failure taxonomy, language-neutral governance contracts, evidence metadata, terminology lifecycle, and economics/timebox | Several sequencing recommendations are too broad (Identity/Wave 3/second mini-consumer before slice); blanket protection of all tests is wrong; some Wave 2 execution counts remain expert-reported rather than independently verified | REVIEWED |

---

# 4. Expert 01 — Main Claims and Evaluation

## 4.1 Architecture diagnosis and evidence-based foundation

### Expert claim

The platform correctly identified the real historical problem as **Contextual Compliance Failure**, not lack of documentation.

### Evaluation

**Accepted — Strongly supported.**

The previous pattern of repeated audits, re-audits, corrective passes, duplicated instructions, and inconsistent implementation supports the conclusion that longer documentation alone does not solve the problem.

### Decision

No architectural change required.

### Importance

**Critical foundation — retain.**

---

## 4.2 Separation of Human Docs / Machine Manifests / Executable Rules

### Expert claim

This separation is the architectural core of the solution.

### Evaluation

**Accepted.**

This is one of the strongest decisions in the platform.

The important operational reminder is:

> Executable rules must increasingly carry the enforcement burden; documentation must not silently become the primary control mechanism again.

### Decision

Retain and enforce.

### Watch item

Track cases where implementation still depends on agents “remembering” prose rather than machine-enforced constraints.

---

## 4.3 “Make the correct path the easiest path”

### Expert claim

Default-deny task contracts, generators, dependency restrictions, and CI-owned completion are strong decisions.

### Evaluation

**Accepted.**

### Additional concern

The model is only complete if the agent cannot modify the rules controlling itself.

This creates a major related requirement:

> **Control-plane files must not be freely mutable by the same agent whose behavior they govern.**

This issue deserves higher priority than Expert 01 gave it.

---

# 5. Critical Gap Added by Internal Review: Control Plane Authority

## 5.1 Problem

Task contracts, governance manifests, allowed paths, risk declarations, policy files, and quality-gate configuration are **control-plane metadata**.

If an agent can change:

- `allowedPaths`,
- `allowPlatformChanges`,
- risk levels,
- required checks,
- governance configuration,

then enforcement may become self-authorized.

## 5.2 Required protection

Before giving autonomous agents broad execution freedom, the repository must define:

- protected governance paths;
- CODEOWNERS or equivalent mandatory reviewers;
- repository rulesets;
- required status checks;
- trusted base revision calculation;
- protected CI configuration;
- restrictions on changing governance rules from ordinary feature tasks.

## 5.3 Decision

**High-priority gap.**

This should be addressed **before or together with the first real consumer slice**, not postponed far into later waves.

## 5.4 Acceptance criterion

Governance is not considered enforceable until:

> A task cannot weaken, bypass, or redefine its own constraints without a separately authorized control-plane change.

---

# 6. Critical Gap Added by Internal Review: Merge Authority

A CLI saying “governance passed” is insufficient.

For governance to become real enforcement:

- required CI checks must be attached to the actual repository;
- failed governance checks must block merge;
- protected branches/rulesets must be active;
- agents must not be able to bypass the required status checks.

### Decision

**Must be validated on the real TAYMEX consumer repository.**

---

# 7. Expert 01 Claim: “20% implementation / 80% design”

### Evaluation

**Directionally valid, quantitatively unsupported.**

There is clearly a significant implementation gap in advanced capabilities, but the 20/80 ratio is not based on a defined measurement.

### Decision

Do not use this ratio in project reporting.

### Replacement model

Track platform capabilities using:

| Capability | Designed | Implemented | Integrated | Real Consumer Proven | Production Proven |
|---|---:|---:|---:|---:|---:|
| Task Contracts | ✓ | ✓ | ✓/partial | Pending | Pending |
| Scope enforcement | ✓ | ✓ | ✓/partial | Pending | Pending |
| Settings Registry | ✓ | ✓ | Partial | Pending | Pending |
| Settings Effective Resolver | ✓ | Pending/partial | Pending | Pending | Pending |
| Repository Truth | ✓ | Basic only | Pending | Pending | Pending |
| Impact Graph | ✓ | Pending | Pending | Pending | Pending |
| Backend governance | ✓ | Partial/planned | Pending | Pending | Pending |
| Visual governance | ✓ | Partial / evidence to verify | Pending | Pending | Pending |
| Upgrade/Codemod machinery | ✓ | Planned | Pending | Pending | Pending |

> This table must be updated only from verified project evidence.

---

# 8. Expert 01 Claim: Stop platform work and immediately build a TAYMEX Vertical Slice

### Evaluation

**Correct direction, but wording requires correction.**

The platform should not continue building large horizontal capability waves before proving the approach on a real consumer.

However, literal “freeze the platform” is also incorrect.

### Adopted strategy

> **Freeze non-essential horizontal expansion.  
> Start the real TAYMEX vertical slice.  
> Build missing platform capabilities when the slice encounters them.**

### This means

If the slice reaches:

- settings → build/complete the real Settings Resolver;
- permissions → complete real authorization enforcement;
- audit → implement real audit behavior;
- UI → exercise real design-system components;
- repository truth → deepen only the truth adapters required by real work;
- concurrency/idempotency → build them when the domain requires them.

### Explicit prohibition

Do **not** bypass missing platform capabilities with temporary mocks merely to finish the vertical slice.

The purpose of the slice is to expose platform gaps.

---

# 9. What the First Vertical Slice Must Prove

The first slice should not be selected because it makes a good demo.

It should maximize cross-layer pressure.

A candidate such as **Products Management** is suitable if it exercises:

- authentication;
- authorization;
- module boundaries;
- domain model;
- persistence;
- API/contract;
- typed settings;
- effective settings resolution;
- AR/TR/EN or relevant localization;
- list/table;
- form;
- details/edit;
- audit trail;
- responsive layout;
- RTL/LTR;
- validation;
- testing;
- CI gates;
- security negative cases;
- observability;
- consumer/platform package boundaries.

### Important condition

The slice must ideally run in a **real, independent TAYMEX consumer repository/project boundary**, not only as an example embedded inside the ENGINEERING_PLATFORM repository.

Otherwise we prove:

> “the platform works inside itself”

instead of proving:

> “a separate product can safely consume, version, and operate the platform.”

---

# 10. Expert 01 Claim: Settings Resolver should be the next major platform feature after the slice

### Evaluation

**The importance is correct; the sequencing is not.**

The effective settings resolver is not merely a post-slice improvement.

It is one of the capabilities the vertical slice should exercise.

### Therefore

The actual sequence should be:

1. Begin vertical slice.
2. Reach a real settings requirement.
3. Implement the real resolver.
4. Exercise precedence/merge semantics.
5. Validate explainability.
6. Validate concurrency and invalidation.
7. Continue slice.

### Required capabilities

The resolver must eventually support the approved strategies such as:

- `OVERRIDE`
- `REPLACE`
- `MERGE`
- `FLOOR`
- `CEILING`
- `STRONGEST`
- `NO_OVERRIDE`
- `FLAG_EVALUATION`

And must provide:

- effective value;
- source/provenance;
- explanation trace;
- conflict behavior;
- invalid configuration detection;
- runtime application semantics;
- Hot / Reload / Restart behavior;
- concurrency guarantees;
- cache/invalidation behavior where relevant.

### Risk level

**Very High.**

---

# 11. Expert 01 Claim: Repository Truth is still shallow

### Evaluation

**Accepted.**

Basic inspection is not enough to support a true “no guessing” platform.

Deep repository truth may require:

- TypeScript compiler analysis;
- symbol extraction;
- import/dependency graph;
- route extraction;
- OpenAPI extraction;
- ORM/schema introspection;
- permission mapping;
- contract extraction;
- module ownership;
- configuration ownership.

### Important distinction

This is not necessarily a missing architectural idea.

It is primarily an **implementation maturity gap already anticipated by the roadmap**.

### Strategy

Do not attempt to solve every repository-truth problem generically before real usage.

Deepen adapters based on actual consumer pressure.

---

# 12. Expert 01 Claim: Impact Graph is required

### Evaluation

**Accepted in principle.**

Without impact analysis, a repair workflow can still miss affected modules.

### But

Do not prematurely build a universal impact engine.

Start from measurable sources:

- package/module dependency graph;
- imports;
- public contracts;
- API consumers;
- database/model dependencies;
- settings consumers;
- permission consumers;
- explicitly declared module relationships.

### Desired future outcome

A change to an important symbol/contract should produce:

- known consumers;
- affected tests;
- high-risk downstream areas;
- required gates;
- confidence/evidence level.

---

# 13. Expert 01 Claim: Golden References have a chicken-and-egg problem

### Evaluation

**Accepted.**

Golden patterns cannot exist before someone builds the first high-quality version.

### Rejected implication

We should **not** build the entire Golden Library upfront.

That would recreate the Foundation Trap.

### Adopted approach

Create golden references incrementally from real TAYMEX needs.

Example:

1. TAYMEX needs table/list → build and validate.
2. TAYMEX needs form → build and validate.
3. TAYMEX needs detail/edit → build and validate.
4. Once repeated successfully → promote to canonical pattern.
5. Add wizard/search/settings patterns only when real use appears.

### Rule

> One successful implementation is a candidate, not automatically a universal golden pattern.

---

# 14. Expert 01 Claim: Static lint rules can be bypassed

### Evaluation

**Accepted.**

Possible escape paths include:

- plain CSS;
- CSS-in-JS;
- runtime `style.setProperty`;
- SVG attributes;
- wrapper components;
- dynamic styles;
- third-party components;
- iframe/external content.

### Correction to Expert 01

Visual Regression is **not** a complete last line of defense.

A screenshot cannot guarantee coverage of:

- unseen states;
- alternate conditions;
- interaction-only defects;
- inaccessible semantics;
- offscreen states;
- wrongly approved baselines.

### Adopted defense-in-depth model

1. package/import boundaries;
2. design-token APIs;
3. static analysis/lint;
4. component registry/manifests;
5. generators/golden paths;
6. accessibility tests;
7. visual regression;
8. E2E/runtime tests;
9. review of high-risk states.

---

# 15. Expert 01 Claim: CI cost and visual-test flakiness may become dangerous

### Evaluation

**Valid operational risk.**

### Correction

The platform design does not require all checks to run on every PR.

The intended model is risk/affected based:

- fast loop;
- PR standard;
- high-risk PR;
- nightly/release.

### Still worth tracking

Visual tests can lose credibility if they become flaky.

### Metrics to introduce when real usage begins

- median gate duration;
- p95 gate duration;
- flaky failure rate;
- retry-success rate;
- false-positive rate;
- baseline update frequency;
- percentage of ignored/quarantined tests;
- escaped UI defects.

### Rule

Do not build a complex quarantine system before flakiness exists.

But once a test becomes repeatedly flaky:

> fix it, isolate it with explicit ownership, or remove/rebuild it — never silently normalize random failure.

---

# 16. Expert 01 Claim: Upgrade / Codemod machinery must be tested early

### Evaluation

**Important long-term concern, but not immediate priority #3.**

Upgrade failure across consumers would recreate project-specific platform forks.

### Correct timing

Recommended milestone:

> After TAYMEX consumes the first real versioned platform release, and before onboarding a second serious consumer.

At that stage perform a deliberate upgrade drill:

1. publish a small breaking internal version;
2. supply migration/codemod;
3. upgrade TAYMEX;
4. measure manual intervention;
5. verify compatibility rules;
6. document rollback.

### Status

**Deferred, not ignored.**

---

# 17. Expert 01 Claim: AI must be prohibited from solar calculations

### Evaluation

**Not currently supported by verified project requirements.**

Current project framing supports:

- solar sizing / load analysis as TAYMEX product-domain functionality;
- simple cases may receive preliminary calculations;
- complex cases may require technical review;
- future AI capability has been mentioned as architecturally possible.

No verified constitutional rule has yet been established that:

> “AI is forbidden from participating in solar calculations.”

### Decision

Do not create an architecture gate based solely on this expert statement.

### Open architectural question

It may still be valuable to define later:

- deterministic calculation engine as source of truth;
- AI may explain, guide, collect inputs, or summarize;
- AI may not independently invent engineering calculation results.

But this must be formally approved as a TAYMEX domain rule before enforcement.

---

# 18. Expert 01 Claim: Platform operational complexity may exceed team capacity

### Evaluation

**Accepted — important risk.**

A platform can itself become a maintenance burden.

Potential ownership load includes:

- CLI;
- Nx tooling;
- ESLint/static rules;
- settings engine;
- design system;
- generators;
- CI matrices;
- policies;
- migrations;
- registries;
- visual baselines;
- security tooling;
- observability.

### Required response

Do not reduce scope blindly.

Instead measure whether the platform reduces or increases total effort.

### Platform productivity metrics

Track during the first real slice:

- number of manual reminders to agents;
- defects prevented pre-merge;
- defects escaping governance;
- rule false positives;
- rule false negatives;
- time to prepare a task contract;
- implementation lead time;
- repair/rework count;
- number of platform interventions per feature;
- time spent maintaining platform tooling;
- repeated agent mistakes;
- percentage of generated vs hand-built structure.

### Decision rule

If a capability consistently costs more than the class of errors it prevents, reconsider its scope or abstraction.

---

# 19. Evidence Discipline: Wave / Test Claims

Expert 01 references successful visual validation and an 18/18 scenario result after finding horizontal overflow.

This may be correct, but such a statement must only be accepted into the project truth once the corresponding evidence is available, such as:

- Wave verification report;
- CI result;
- screenshots/baselines;
- test output;
- commit/reference.

### Rule

> Expert recollection or summary is not equivalent to implementation evidence.

### Status

**Verify before promoting to project fact.**

---

# 20. Additional Critical Questions Worth Stopping For

The following points deserve explicit review even when no expert raises them.

---

## 20.1 Who owns platform policy changes?

Questions:

- Who may change task-contract schema?
- Who may expand allowed paths?
- Who may lower risk classifications?
- Who may disable a gate?
- Who approves a baseline?
- Who may modify CODEOWNERS/rulesets?
- Can an automated agent modify CI itself?

This must have a formal ownership policy.

---

## 20.2 What is the trusted source of the base revision?

A diff-based governance system is only trustworthy if the compared base cannot be chosen or manipulated by the task itself.

Required:

- CI-derived trusted base;
- protected merge-base logic;
- no agent-controlled base reference for enforcement.

---

## 20.3 What is considered “DONE”?

DONE should not mean:

- agent says done;
- tests run locally;
- file exists;
- UI looks acceptable manually.

A high-confidence DONE may require:

- scope valid;
- governance passed;
- required tests passed;
- required security checks passed;
- changed contracts accounted for;
- real evidence attached;
- consumer behavior validated;
- merge authority satisfied.

---

## 20.4 Can the platform explain why a decision was made?

This applies beyond settings.

Important areas should eventually support explainability:

- why this setting is effective;
- why this permission is granted/denied;
- why this quality gate was required;
- why this module was marked affected;
- why this task was classified high risk;
- why this component is canonical;
- why a dependency is allowed/forbidden.

Opaque enforcement creates debugging resistance.

---

## 20.5 What happens when platform truth sources disagree?

Examples:

- manifest says one thing;
- source code says another;
- OpenAPI differs from implementation;
- DB schema differs from ORM;
- generated registry is stale;
- documentation differs from runtime.

A precedence/conflict policy is required.

Recommended principle:

> Machine-derived current runtime/build truth outranks descriptive documentation, but disagreement itself should be surfaced as a defect.

---

## 20.6 How will stale generated artifacts be detected?

Generated files and registries can become dangerous if manually edited or not regenerated.

Potential controls:

- generation hashes;
- CI regeneration check;
- generated-file headers;
- no-manual-edit rules;
- source-of-truth validation.

---

## 20.7 How much should be centralized vs project-owned?

Centralization prevents divergence, but excessive centralization creates coupling.

Every capability should be classified as:

- Platform-owned and mandatory;
- Platform-provided but project-configurable;
- Optional platform capability;
- Product-domain owned;
- Local project-only.

This classification should remain explicit.

---

## 20.8 What is the escape-hatch policy?

A mature platform needs controlled exceptions.

Otherwise developers will bypass rules unofficially.

An exception mechanism should eventually define:

- reason;
- owner;
- scope;
- expiration;
- compensating controls;
- approval;
- auditability.

No permanent silent bypass.

---

## 20.9 How will emergency fixes work?

Production incidents may not tolerate full normal workflow.

Need a future emergency path that:

- remains auditable;
- limits scope;
- requires follow-up;
- does not permanently disable governance.

---

## 20.10 What prevents the platform itself from becoming monolithic?

Potential risk:

`@platform/*` becomes a single dependency universe where every consumer must upgrade everything together.

Protect against this with:

- narrow package boundaries;
- semver discipline;
- explicit dependencies;
- independent versionability where justified;
- avoidance of circular platform packages;
- capability ownership.

---

## 20.11 What is the rollback strategy for platform changes?

A migration strategy without rollback is incomplete.

For high-impact shared platform changes, define:

- backward compatibility window;
- reversible migrations where possible;
- config rollback;
- package rollback;
- database rollback limitations;
- feature-flag strategy where appropriate.

---

## 20.12 How will generated Golden Paths avoid fossilizing bad decisions?

Generators are powerful because they replicate decisions quickly.

That also means a bad generator replicates mistakes quickly.

Required:

- versioned generators;
- tests for generated output;
- periodic golden-pattern review;
- migration path from old generated structure;
- no assumption that “generated” means “correct forever.”

---

# 21. Vertical Slice Evidence Checklist

The first real TAYMEX slice should produce an evidence package covering:

### Consumer boundary
- independent consumer setup;
- platform package/version consumption;
- configuration loading;
- no hidden local coupling.

### Governance
- valid task contract;
- invalid task rejected;
- unauthorized scope expansion rejected;
- governance-required CI check blocks merge.

### Settings
- layered values;
- at least one non-trivial merge strategy;
- explain output;
- invalid setting rejection;
- runtime effect verification.

### Security
- allowed user works;
- forbidden user fails;
- cross-tenant/cross-scope access fails where applicable;
- input validation;
- audit event generated.

### UI
- canonical components used;
- no prohibited styling bypass;
- AR/TR/EN or relevant localization;
- RTL/LTR;
- responsive states;
- accessibility checks;
- visual regression where useful.

### Repository truth
- task can discover required existing symbol/contract without guessing;
- missing truth is reported as UNKNOWN rather than invented.

### Testing
- unit;
- integration;
- E2E where required;
- negative tests;
- affected checks.

### Operations
- logs;
- error visibility;
- trace/correlation where applicable;
- configuration diagnostic path.

---

# 22. Questions the Vertical Slice Must Answer

The slice is considered successful only if it gives evidence for questions such as:

1. Does the platform make the correct implementation path faster?
2. Does it reduce repeated agent mistakes?
3. Which rules are too strict?
4. Which rules are too weak?
5. Which rules are missing?
6. Which platform APIs are awkward?
7. Where does the agent still guess?
8. Where does the human still need repetitive reminders?
9. Does settings explainability actually help debugging?
10. Is CI fast enough for normal work?
11. Are visual checks stable?
12. Can a normal feature be completed without platform-owner intervention?
13. Can a consumer remain independent from platform source internals?
14. Does the platform reveal impact before changes escape?
15. Which planned capabilities are unnecessary in practice?

---

# 23. Expert 02 — Main Claims and Evaluation

## 23.1 Functional completeness is the largest remaining correctness gap

### Expert claim

The current governance is much stronger at preventing drift, duplication, local overrides and UI inconsistency than at detecting missing business behavior such as:

- omitted waitlist behavior;
- race conditions;
- missing idempotency;
- BOLA/ownership mistakes;
- incomplete state transitions;
- missing failure/edge-case handling.

### Evaluation

**Accepted — with an important correction.**

This is not a missing architectural concept.

The current governance architecture already defines:

- `FUNC-001` acceptance completeness;
- `FUNC-002` state/invariant testing;
- `FUNC-003` concurrency/idempotency testing;
- authorization-negative testing;
- explicit invariants, state transitions, error/offline states, duplicate requests, retries and compensation in task contracts.

Therefore the real gap is:

> **Functional correctness is designed, but not yet implemented/proven at the same maturity as scope and UI governance.**

This is still a high-risk gap because a system can be perfectly compliant with file paths, naming and tokens while implementing the wrong behavior.

### Decision

**High priority for the first real vertical slice.**

The slice must deliberately contain and test:

- authorization failure;
- duplicate request/idempotency;
- one real concurrency hazard where relevant;
- state/invariant violation;
- negative validation;
- required-but-easy-to-forget behavior;
- failure/retry behavior where relevant.

### Rule

Do not interpret “correct-by-construction” as “static rules can prove full business correctness.”

Functional completeness requires a combination of:

- specification;
- risk-triggered prompts;
- generated truth;
- tests;
- domain invariants;
- negative/adversarial cases;
- runtime evidence.

---

## 23.2 Historical defects should become executable engineering memory

### Expert claim

Convert Harbuk/SARH defect history into a machine-readable **Defect Taxonomy**, then transform repeatable defect classes into:

- Semgrep/policy/static rules;
- required spec questions;
- negative test templates;
- regression tests.

### Evaluation

**Accepted — this is one of Expert 02's strongest new contributions.**

The platform already learned conceptually from past projects, but historical findings are still largely used as narrative evidence.

A structured historical-defect corpus would allow us to answer a much stronger question:

> “What percentage of failures that actually happened before would the current platform prevent, detect, force into specification, or still miss?”

### Important correction

Do **not** begin by exhaustively converting every historical finding.

The expert's approximate claim of “nearly one thousand findings” is not accepted as a verified count until the source corpus is enumerated.

### Adopted incremental model

Start with a **stratified seed corpus**, not a massive migration project.

Suggested initial fields:

```yaml
defectId:
sourceProject:
sourceArea:
severity:
category:
symptom:
rootCause:
triggerContext:
historicalEscapeReason:
relevantChangeSignals:
preventableAutomatically:
detectableAutomatically:
requiredSpecChallenge:
negativeTestTemplate:
candidateRule:
humanReviewNeeded:
platformCoverageStatus:
evidenceReference:
```

### Candidate categories

- authorization / ownership;
- authentication/session;
- concurrency;
- idempotency/replay;
- workflow/state;
- data integrity;
- contract/type mismatch;
- settings/configuration;
- naming/duplication;
- UI/design drift;
- responsive/RTL/accessibility;
- performance/query behavior;
- integrations;
- migration/data;
- secrets/sensitive data;
- repair/regression;
- documentation/process drift.

### Decision

**Adopt as a bounded evidence project.**

Do not let taxonomy construction delay the first consumer slice.

---

# 24. Historical Defect Back-Test

## 24.1 Why this matters

Expert 02 proposes back-testing the current governance against real past failures.

This is stronger than measuring “number of rules” or “number of passing tests.”

### Adopted metric model

For each sampled historical defect, classify current platform coverage as:

1. `PREVENTED_BY_CONSTRUCTION`
2. `BLOCKED_PRE_MERGE`
3. `DETECTED_PRE_MERGE`
4. `FORCED_INTO_SPEC_OR_TEST`
5. `HUMAN_REVIEW_ONLY`
6. `NOT_COVERED`
7. `NOT_APPLICABLE_TO_CURRENT_STACK/DOMAIN`

### Do not use only a raw coverage percentage

A purely random sample can overrepresent low-risk UI/documentation findings and underrepresent rare critical failures.

Use a **stratified sample** across:

- severity;
- defect family;
- Harbuk/SARH source;
- UI/backend/security/data;
- frequent vs high-impact defects.

### Report both

- **raw coverage**, and
- **severity-weighted coverage**.

### Additional measurement

For blocking rules measure:

- precision / false-positive rate;
- legitimate exception rate;
- false-negative discoveries;
- escaped defects.

### Decision

**Start early and run in parallel with the vertical slice.**

It should inform what Wave 3/4 capabilities deserve investment.

It should **not** become a prerequisite that delays product validation.

---

# 25. Adversarial Specification Review

## 25.1 Expert proposal

Create an **Adversarial Spec Agent** that works before implementation and generates edge cases, failure modes and concurrency scenarios from the task description plus historical defect taxonomy.

## 25.2 Evaluation

**The concept is valuable; the implementation form should remain lightweight initially.**

Creating another autonomous agent as a mandatory platform subsystem immediately risks:

- AI-on-AI bureaucracy;
- duplicated review loops;
- hallucinated edge cases;
- increased task-preparation latency;
- false confidence because “another agent reviewed it.”

### Adopted first form

Introduce an **Adversarial Spec Pass** before implementation for R2/R3/R4 tasks.

Inputs:

- task objective;
- repository truth;
- risk tier;
- changed capability tags;
- historical defect taxonomy;
- known invariants;
- relevant settings/permissions/contracts.

Outputs:

- missing acceptance cases;
- authorization negatives;
- concurrency/idempotency questions;
- state/invariant challenges;
- failure/retry scenarios;
- data integrity risks;
- explicit unresolved questions.

### Automation level

Initially it may be:

- deterministic template expansion;
- rule-based triggers;
- optionally assisted by a separate reviewer agent.

If an AI reviewer is used:

> It remains advisory until a finding becomes an acceptance criterion, test, blocker, or approved exception.

### Rule

The reviewer must not be allowed to approve its own unresolved questions merely to unblock implementation.

### Decision

**Adopt the review phase; defer building a large dedicated agent subsystem until usage proves value.**

---

# 26. Expert 02 — “Who governs the governor?”

## 26.1 Expert claim

The verifier should not rely solely on code from the same untrusted feature branch that it is verifying.

### Evaluation

**Strongly accepted.**

This significantly strengthens the Control Plane concern already identified after Expert 01.

A branch-local verifier cannot be the sole trust root if that branch can modify:

- verifier logic;
- risk classification;
- required checks;
- workflow files;
- policy configuration.

### Important correction

CODEOWNERS is not merely “social” when combined with enforced branch/ruleset controls.

A required code-owner review, protected branch and non-bypassable status check are technical controls.

However, the expert is correct that stronger separation is desirable.

## 26.2 Trusted verifier model

For consumer repositories, prefer:

- governance CLI/package from a pinned released platform version;
- or a trusted reusable workflow;
- exact immutable version/SHA where appropriate;
- product branch cannot replace the merge-authority verifier.

For changes to the platform verifier itself:

> The proposed verifier version must be tested by a previously trusted verifier/release plus a governance regression corpus and owner approval.

This creates a bootstrap trust model instead of allowing the new verifier to certify itself.

## 26.3 Protected control-plane surfaces

Include at minimum:

- governance policy;
- task-contract schemas/policy;
- verifier implementation;
- reusable CI workflows;
- `.github/**` or equivalent CI/control configuration;
- CODEOWNERS/ruleset-related files;
- security policy;
- platform generators that affect governance;
- release/migration tooling.

## 26.4 CI supply-chain hardening

Where the CI platform supports it, prefer:

- immutable action/workflow references;
- least-privilege job tokens;
- no self-approval of protected changes;
- isolated secrets;
- explicit permissions per job;
- restricted write permissions from untrusted branches.

### Decision

**Priority 0 / trust-root concern.**

---

# 27. Governance Regression Corpus

Expert 02 proposes a permanent corpus of known malicious/non-compliant patches.

### Evaluation

**Accepted.**

This complements ordinary unit tests because it tests governance behavior from the attacker/bypasser perspective.

### Corpus examples

- unauthorized path expansion;
- fake base revision;
- new dependency without permission;
- duplicate setting;
- local settings precedence;
- raw design token bypass;
- local canonical component duplicate;
- governance-file modification from a feature task;
- CI workflow weakening;
- risk downgrade attempt;
- expired exception;
- forbidden generated-file edits;
- terminology alias;
- unauthorized schema/API change.

### Rule

Any change to governance/verifier logic runs this corpus.

A previously rejected patch becoming accepted unexpectedly should fail CI unless the policy change is intentional and independently approved.

### Decision

**Adopt.**

---

# 28. Expert 02 — Upgrade, migration and compatibility concerns

## 28.1 General concern

Shared platform upgrades remain an important long-term risk.

### Evaluation

**Accepted, but sequencing remains later than Expert 02 recommends.**

The platform should prove real versioned consumption before investing heavily in synthetic upgrade infrastructure.

### Existing decision retained

Perform the first meaningful upgrade drill:

> after TAYMEX consumes a real platform release and before onboarding a second major consumer.

## 28.2 New high-value migration concern: data ownership

Expert 02 correctly raises a deeper issue:

If a platform capability owns persistent database structures inside a product database, versioning is not only a package problem; it becomes a **data ownership and migration contract** problem.

### Required decisions before shared platform packages own persistent schema

Define:

- schema/table ownership;
- whether platform-owned tables use a namespace/schema convention;
- allowed cross-boundary foreign keys;
- migration ownership;
- compatibility guarantees;
- expand/contract expectations for breaking schema changes;
- rollback limitations;
- deprecation windows.

### Decision

**Do not postpone this until after persistent shared capabilities are already deployed.**

It should be resolved when the first platform-owned persistent capability is introduced.

## 28.3 `platform.lock` / compatibility metadata

Useful, but implementation timing should match real versioned consumption.

### Decision

- design compatibility metadata early;
- implement/enforce when platform packages begin actual versioned consumer use.

## 28.4 Reference-minimal / Reference-showcase

### Expert recommendation

Build both early and upgrade them with every release.

### Evaluation

**Useful later, not a prerequisite before the first TAYMEX slice.**

Before the platform has a proven consumer, building two additional reference consumers risks multiplying synthetic work.

### Preferred timing

After first stable consumer contract begins to emerge.

---

# 29. Expert 02 — Rule of Three and premature UI generalization

### Expert claim

Building `AppShell`, CRUD and dashboard patterns before multiple real consumers violates the platform's Rule of Three.

### Evaluation

**Partially correct; the claim is too absolute.**

The platform admission rule does not require three consumers for every capability.

A capability may enter the platform when it is:

1. a universal engineering primitive with established industry value; or
2. repeatedly evidenced; or
3. proven by second/third implementations.

Therefore `Rule of Three` is not the only admission path.

### However

The expert identifies a real risk:

> A reusable capability may be valid, while its **specific API/design abstraction** is still premature.

### Adopted stability rule

Early reusable patterns should explicitly carry lifecycle/stability metadata such as:

```text
experimental
candidate
stable
deprecated
```

A pattern should not become `stable` merely because it works in the platform demo.

### Validation approach

Before stabilizing a UI pattern API, exercise it in meaningfully different real contexts.

### Decision

**Adopt lifecycle classification and delay API stabilization until evidence exists.**

---

# 30. Expert 02 — Technology choice and “Agent Familiarity”

### Expert claim

Technology familiarity for AI coding agents should be an explicit technology-selection criterion.

### Evaluation

**Accepted as a secondary criterion, not a dominant criterion.**

This is a useful addition because the platform is explicitly optimized for agent-assisted engineering.

However, agent familiarity is:

- model-dependent;
- rapidly changing;
- difficult to estimate from ecosystem popularity alone;
- potentially less important than compiler/type-level enforceability.

### Adopted ADR criterion

Future technology ADRs may include:

- ecosystem maturity;
- security;
- maintainability;
- performance;
- hiring/skills;
- interoperability;
- enforceability/correct-by-construction;
- migration/upgrade cost;
- **agent ergonomics/familiarity**;
- measured correction/error rate during real use.

### Panda/Tailwind implication

Do not reverse the current choice based on popularity alone.

Use the first vertical slice to measure:

- agent syntax/configuration mistakes;
- manual corrections;
- rule bypass attempts;
- implementation speed;
- value gained from token/type enforcement.

### Decision

**Measure before reconsidering.**

---

# 31. Nx vs OPA/Conftest

### Expert claim

OPA/Conftest should be the governance backbone and Nx merely a signal provider so future non-JS languages remain governable.

### Evaluation

**Directionally useful but unnecessary as a wholesale rearchitecture.**

The accepted architecture already allocates:

- Nx → JS/TS dependency graph and native workspace boundaries;
- ESLint → JS/TS syntax/import/UI;
- Semgrep → cross-language code patterns;
- OPA/Conftest → structured manifests, diff/IaC/CI policy routing.

This is the correct “strongest layer for each rule” model.

### Decision

Retain technology-specific enforcement where it is strongest.

Ensure that **organization-level policy and task/risk routing are not dependent on JS/TS-only signals**.

No need to force every rule through OPA.

---

# 32. “Zero unverified assumptions” is not a proof of no assumptions

### Expert claim

An assumption ledger only captures assumptions the agent realizes it is making.

### Evaluation

**Accepted.**

This is a valuable precision correction.

`PRE-002` and zero-unresolved-assumption rules are useful, but they cannot detect unknown unknowns by themselves.

### Stronger controls remain

- generated API/client types;
- canonical settings accessors;
- permission registries;
- repository truth;
- schema/runtime validation;
- compiler failures;
- contract tests.

### Decision

Keep the assumption ledger, but never represent it as a guarantee that no hidden assumption exists.

### Principle

> Prefer making an invalid assumption impossible to compile/verify over asking the agent to declare it.

---

# 33. Agent-Specific Threat Model

Expert 02 raises a new class of threat that application threat models do not fully cover.

### Important risks

- prompt/instruction injection from repository content;
- malicious or misleading issue/PR text;
- secrets exposed to agent context/logs;
- credentials available to tasks that do not need them;
- agent executing untrusted repository commands;
- network/data exfiltration;
- self-modification of governance;
- self-approval or approval collusion;
- generated code that appears plausible but weakens crypto/auth/security;
- malicious dependency/tool suggestions.

### Decision

**Adopt a focused Agent Execution Threat Model before broad autonomous repository access.**

### Minimum questions

- What sources are considered instructions vs untrusted data?
- What secrets can the agent see?
- What commands may it execute?
- What network access is allowed?
- What files may it modify?
- Which control-plane paths are immutable to ordinary tasks?
- Who can approve sensitive changes?
- What agent logs/artifacts may contain sensitive content?
- What is the behavior when repository content conflicts with system/project policy?

---

# 34. BLOCK behavior must be explicit

### Expert claim

When a task is blocked, the agent needs a defined non-bypass behavior.

### Evaluation

**Accepted — low cost, high value.**

### Adopted behavior

When required truth/approval is unavailable, the agent should:

1. record a machine-readable `BLOCKER`;
2. state the missing authority/fact;
3. not invent a workaround;
4. avoid expanding scope;
5. optionally move to a separately authorized independent task;
6. resume only after the blocker is resolved or an approved exception exists.

### Decision

Add this to task execution protocol.

---

# 35. Terminology and documentation drift

## 35.1 New terminology

Expert 02 proposes flagging new domain terms not present in the registry.

### Evaluation

**Useful, but begin advisory.**

A new type/table/enum may legitimately introduce a new concept.

Probabilistic semantic judgments must not block by default.

### Decision

- exact forbidden aliases → blocking;
- new domain concept → review/warn initially;
- repeated high-precision classes may later become blocking.

## 35.2 Documentation proliferation

The architecture already states that `audit2`, `final2`, `resolved`, etc. are not the routine evidence model.

### Remaining gap

That policy is not useful if it remains prose-only.

### Decision

Implement a cheap documentation-path/name policy when real projects begin producing docs.

Do not build a large documentation-governance subsystem.

---

# 36. Settings gaps identified by Expert 02

## 36.1 Resolution locus / evaluation time

### Expert concern

A setting may resolve at:

- build time;
- deploy/startup time;
- server request time;
- background job execution;
- client/browser time.

This affects caching, static generation and consistency.

### Evaluation

**Valid additional design dimension.**

The current `hot/reload/restart/deploy` model describes change/application behavior but does not fully specify **where/when contextual resolution occurs**.

### Decision

Add explicit resolution/evaluation semantics where settings vary by request/user/context.

Potential metadata may include concepts such as:

```text
resolutionPhase:
  BUILD
  STARTUP
  SERVER_REQUEST
  JOB_EXECUTION
  CLIENT
```

Exact model should be validated during the real settings implementation.

## 36.2 Cache invalidation

Expert 02 presents this as missing.

### Evaluation

**Already recognized in ADR-004.**

Distributed caches are required to be invalidated/versioned centrally, and cache invalidation is part of the required settings tests.

### Decision

No new architecture decision; implementation remains required.

## 36.3 Cross-setting constraints

Expert 02 presents this as missing.

### Evaluation

**Already explicitly designed.**

Cross-setting validation after effective resolution is already part of ADR-004.

### Decision

No design change; ensure implementation and tests.

## 36.4 Write authorization per setting

The registry already includes permission metadata conceptually.

### Remaining requirement

The runtime administration path must prove that permission metadata is actually enforced.

### Decision

Test it in the first settings-enabled slice.

## 36.5 Tenancy

Expert 02 frames the choice as:

- tenancy in the core now, or
- tenancy forbidden entirely.

### Evaluation

**This is a false dichotomy.**

The platform already treats organizations/tenancy as an optional reusable capability and settings scopes as allowed **where permitted**.

### Better model

The resolver may support a set of possible scope classes, while each product profile enables only the scopes it actually supports.

For TAYMEX:

> Tenant scope should be disabled unless/until TAYMEX explicitly adopts a tenancy capability.

This prevents “half-tenancy” without making future tenancy impossible.

### Decision

**Adopt explicit enabled-scope profiles.**

---

# 37. Legal, privacy and market compliance claims

### Expert claim

AR/TR/EN and possible Turkish market activity imply KVKK/GDPR and possibly e-invoicing/tax requirements.

### Evaluation

**Do not infer legal jurisdiction from language alone.**

The actual legal requirements depend on:

- operating entity;
- customer/data-subject location;
- deployment and processing;
- transaction model;
- whether real commerce occurs;
- applicable sector rules.

### Decision

Add a **Compliance Jurisdiction Decision** before production/commercial launch.

Do not hardwire Turkish/GDPR capabilities into the platform merely because Turkish is a supported language.

### Platform implication

Reusable privacy primitives may later include:

- data classification;
- retention/deletion;
- export/access workflows;
- audit;
- consent/legal-basis metadata where needed.

But domain/legal applicability must be explicit.

---

# 38. Money, sequence and time primitives

## 38.1 Money

Expert 02 recommends integer minor units universally.

### Evaluation

**The underlying risk is real; the universal representation is too prescriptive.**

Never use binary floating-point for monetary business semantics.

A canonical `Money` abstraction should include:

- amount;
- currency;
- explicit precision/scale rules;
- deterministic rounding policy.

Integer minor units may be excellent for many currencies/use cases, but should not be declared the only possible representation without considering:

- currencies with non-2 decimals;
- tax/intermediate precision;
- non-fiat units;
- accounting requirements.

## 38.2 Business sequence numbers

Invoice/order sequence generation under concurrency is a real risk where regulated/business numbering exists.

### Decision

Treat as a commerce/domain invariant when required, not a universal platform feature immediately.

## 38.3 Time

A platform `Clock`/time abstraction is already conceptually appropriate.

### Recommended enforcement

- UTC/instant internally where appropriate;
- explicit timezone at boundaries;
- avoid direct uncontrolled wall-clock calls in domain logic;
- allow framework/boundary code to access actual clock through approved abstraction.

---

# 39. TAYMEX Solar Domain Validation

Expert 02 raises a stronger and better-grounded solar-domain assurance question than the earlier proposed “No AI in solar” rule:

> **Who validates that the sizing formulas themselves are correct?**

### Evaluation

**Strongly accepted as a TAYMEX domain concern.**

Testing implementation against itself is insufficient.

### Required future domain assurance

For solar sizing/load-analysis logic, define:

- approved formulas/engineering assumptions;
- versioned reference sources;
- human technical owner/approver;
- golden reference cases/datasets;
- expected outputs/tolerances;
- boundary cases;
- formula/version provenance;
- regression tests against approved reference cases.

### Decision

Add to TAYMEX domain validation plan.

This does not automatically make solar logic part of the reusable platform.

---

# 40. Visual test combinatorics

### Expert concern

Viewport × locale × theme × state combinations can explode.

### Evaluation

**Accepted.**

The existing risk-based/affected approach already avoids “all combinations on every PR,” but explicit test-selection strategy will help.

### Preferred model

- component/pattern states → broad Storybook coverage;
- structural checks (overflow/a11y/touch/labels) → broad deterministic coverage;
- page-level screenshots → selected golden journeys;
- high-risk shared UI → expanded matrix;
- nightly/release → broader combinations;
- consider pairwise/risk-based combination selection.

### Hard screenshot cap

Do not invent an arbitrary global numeric cap before measuring real suite size and maintenance cost.

Use a reviewable test budget and growth metric instead.

---

# 41. Performance gating refinement

### Expert proposal

Keep noisy response-time p95 measurements out of ordinary PR CI; put deterministic checks in PR and operational latency SLOs in stable environments.

### Evaluation

**Mostly accepted and consistent with existing risk-based quality routing.**

### PR-friendly deterministic checks

Examples:

- query count;
- N+1 detection;
- pagination/limits;
- payload/bundle size;
- unbounded loop/network I/O;
- selected deterministic microbenchmarks if stable.

### Runtime/staging checks

- p95/p99 latency;
- load;
- saturation;
- error rate;
- realistic journey performance.

### Nuance

Do not prohibit performance timing in CI absolutely.

A dedicated stable runner for a critical R3/R4 path can produce useful comparisons.

The real rule is:

> Do not make noisy, environmentally unstable latency metrics a routine blocking PR gate.

---

# 42. Task Contract Authoring May Become a Bottleneck

### Expert claim

If humans must manually author large YAML contracts for every task, governance may become slower than bypassing it.

### Evaluation

**Strongly accepted — one of the most important operational additions from Expert 02.**

### Desired contract-generation model

Generate a draft from:

- backlog/issue;
- target module;
- module manifest;
- Repository Truth;
- risk signals;
- known settings/permissions/contracts;
- historical defect taxonomy.

Automatically derive safe defaults such as:

- default target paths from module ownership;
- protected paths;
- likely affected capabilities;
- default-denied change classes.

Human/owner review should focus on actual decisions:

- objective;
- acceptance criteria;
- unusual scope;
- risk;
- exceptional permissions;
- migrations/contracts/security-sensitive changes;
- unresolved blockers.

### Important rule

Automatic derivation may **narrow/default** scope.

It must not silently broaden sensitive scope on behalf of the implementing agent.

### Metrics

Track from first real use:

- median task-preparation time;
- p95 preparation time;
- manual edits per generated contract;
- contract-related blocker rate;
- scope changes requested after implementation begins;
- exception rate;
- bypass attempts.

### Decision

**Adopt contract ergonomics as a first-slice success criterion.**

Do not accept an arbitrary “few minutes” threshold until baseline data exists, but the golden path must demonstrably be faster than manual bypass.

---

# 43. Platform economics and exit criteria

### Expert concern

Platform work has no business value if it expands indefinitely before enabling product delivery.

### Evaluation

**Accepted in principle.**

A hard arbitrary calendar deadline cannot be chosen without team/capacity information, but the platform needs explicit **Foundation Exit Criteria**.

### Adopted exit behavior

- no new non-essential Wave 2 scope;
- start the TAYMEX vertical slice now;
- platform work is pulled by consumer defects/needs;
- new generic ideas enter backlog unless they fix a demonstrated blocker;
- measure platform maintenance effort;
- measure prevented/escaped defects;
- measure task and gate latency.

### Exit question

Before approving more horizontal platform work, ask:

> “What observed consumer failure, risk, or repeated cost justifies this capability now?”

If no evidence exists, default to defer.

---

# 44. Cross-Expert Convergence After Experts 01 and 02

The following areas now have strong repeated support:

## 44.1 Real consumer validation must start now

Both experts independently identify the risk of continuing platform construction without a real consumer.

**Decision remains: START vertical slice.**

## 44.2 Backend/functional correctness is the next major proof area

Both experts emphasize:

- authorization;
- concurrency;
- idempotency;
- state/invariants;
- data correctness.

Expert 02 sharpens the distinction:

> drift prevention is stronger than omission prevention.

## 44.3 Control Plane / Merge Authority is critical

Expert 01 raised the concern; Expert 02 supplied a stronger trust-root architecture.

This is now considered **Priority 0**.

## 44.4 Settings Resolver is high risk

Both experts reinforce it.

Expert 02 adds:

- resolution phase/locus;
- explicit enabled scopes;
- runtime write authorization proof.

## 44.5 Upgrade machinery matters but timing is disputed

Both experts view upgrade failure as serious.

Internal decision remains:

- design for it now;
- first real upgrade proof after actual versioned TAYMEX consumption;
- before second major consumer.

## 44.6 Platform adoption friction must be measured

Expert 01 raised operational complexity.

Expert 02 makes it concrete through:

- task-contract authoring time;
- golden-path speed;
- false positives;
- exceptions;
- escaped defects.

This is now a first-class platform success dimension.

---

# 45. Important New Gaps Added After Expert 02

These deserve explicit tracking:

1. **Historical Defect Back-Test**
2. **Machine-readable Defect Taxonomy**
3. **Adversarial Spec Pass**
4. **Trusted verifier / governance trust root**
5. **Governance Regression Corpus**
6. **Agent Execution Threat Model**
7. **Explicit BLOCK behavior**
8. **Task Contract generation ergonomics**
9. **Settings resolution phase/locus**
10. **Explicit project-enabled setting scopes**
11. **Platform-owned persistent schema/migration ownership**
12. **Pattern stability lifecycle (`experimental/candidate/stable`)**
13. **Compliance jurisdiction decision before launch**
14. **Solar formula/reference-case authority**
15. **Visual combination growth policy**
16. **Deterministic PR performance vs operational latency separation**

---

# 46. Expert 02 Claims That Are Already Covered by Existing Design

These are important, but should not be mislabeled as newly discovered architecture gaps:

1. Functional edge cases/concurrency/idempotency are already part of ADR-006 and quality-gate design.
2. Cross-setting constraints are already explicitly part of settings governance.
3. Distributed settings cache invalidation is already explicitly required.
4. Permission metadata for settings already exists conceptually.
5. Risk-based PR/nightly gate routing already exists.
6. Documentation proliferation (`audit2`, `final2`, etc.) is already explicitly rejected as the normal evidence model.
7. OPA/Conftest already has a defined role for structured/cross-language policy.
8. Platform upgrade automation/codemods and reference consumers already exist in the later roadmap.
9. Clock/time abstractions already belong to the platform kernel conceptually.
10. Money/unit primitives are already identified as shared primitives where useful.

The correct action for these is mostly:

> **implement and prove them — not redesign them from scratch.**

---

# 47. Claims From Expert 02 Not Accepted as Stated

1. “Almost none of the designed gates address functional correctness.”  
   - **Correction:** current *implemented early waves* may not, but the authoritative gate design explicitly includes FUNC-001/002/003 and authorization-negative testing.

2. “There are nearly one thousand historical findings.”  
   - **Status:** plausible but unverified count; inventory before using as project fact.

3. “CODEOWNERS is only a social control.”  
   - **Correction:** with enforced branch/ruleset protection it becomes a technical merge control.

4. “Verifier must physically live in a separate repository.”  
   - **Correction:** a separate immutable trust source is required; this may be a pinned released artifact/reusable workflow and does not strictly require a separate physical repo.

5. “Reference-minimal/showcase must be built before/with the first slice.”  
   - **Decision:** too early; TAYMEX is the required first real consumer.

6. “Rule of Three is already being violated by every current UI pattern.”  
   - **Correction:** platform admission has multiple paths; however early APIs should remain experimental until proven.

7. “OPA should replace Nx as the governance backbone.”  
   - **Decision:** retain strongest-tool-per-rule architecture.

8. “TAYMEX must either be multi-tenant in the kernel now or tenancy must be forbidden forever.”  
   - **Correction:** enable scope types per product profile; TAYMEX can disable tenant scope while platform capability remains optional.

9. “AR/TR/EN means KVKK/GDPR apply.”  
   - **Correction:** legal applicability must be established from actual jurisdiction/processing/business model.

10. “All money must universally be stored as integer minor units.”  
    - **Correction:** require canonical Money + currency + precision/rounding; representation depends on domain/accounting requirements.

11. “A hard numeric screenshot cap must be defined now.”  
    - **Decision:** measure first; use risk-based coverage/test budget.

12. “p95 must never be in CI.”  
    - **Correction:** noisy ordinary PR timing should not block; controlled performance CI can still be valid.

13. “A dedicated Adversarial Spec Agent must be built now.”  
    - **Decision:** adopt the adversarial spec phase first; agent implementation is optional until proven useful.

---

# 48. Current Priority Order After Experts 01 and 02

## Priority 0A — Establish governance trust root

Before broad autonomous execution:

- trusted/pinned merge-authority verifier;
- protected governance/control-plane paths;
- required status checks;
- protected CI configuration;
- trusted base revision;
- CODEOWNERS/rulesets with real enforcement;
- least-privilege CI credentials;
- governance regression corpus.

## Priority 0B — Agent execution safety

Create a focused threat model and define:

- instruction vs untrusted content;
- secret exposure;
- command/network permissions;
- self-modification boundaries;
- self-approval restrictions;
- explicit BLOCK behavior.

This can be compact; it does not require a large security program before the slice.

## Priority 1 — Start the real TAYMEX vertical slice

Prefer a high-pressure slice such as Product Management if it exercises the required layers.

Do not wait for all later waves.

## Priority 2 — Run a bounded historical-defect back-test in parallel

Use a stratified sample.

Produce:

- raw coverage;
- severity-weighted coverage;
- uncovered categories;
- candidate rules/test templates.

Do not let this analysis block Product implementation.

## Priority 3 — Seed the Defect Taxonomy from the back-test

Only convert high-value repeated classes first.

Every historical lesson should eventually become one of:

- executable prevention;
- executable detection;
- spec challenge;
- negative test template;
- explicit human-review obligation.

## Priority 4 — Build real functional/backend proof through the slice

Especially:

- authorization negatives;
- state/invariants;
- concurrency;
- idempotency;
- data integrity;
- validation;
- audit;
- failure/retry behavior.

## Priority 5 — Complete Settings runtime behavior when the slice reaches settings

Including:

- effective resolver;
- provenance/explain;
- runtime behavior;
- resolution phase;
- cache invalidation;
- concurrency;
- write authorization;
- cross-setting constraints;
- enabled scopes.

## Priority 6 — Measure governance ergonomics from day one

Track:

- task contract preparation;
- gate latency;
- false positives;
- exceptions;
- manual interventions;
- agent correction loops;
- golden-path vs manual-path cost;
- escaped defects.

## Priority 7 — Deepen Repository Truth / Impact Graph based on failures

Do not build universal analysis machinery ahead of evidence.

## Priority 8 — Define platform-owned persistence migration contracts before they become real

When the first shared capability owns persistent schema, settle:

- ownership;
- expand/contract;
- compatibility;
- cross-boundary references;
- rollback/deprecation.

## Priority 9 — Upgrade proof after first real versioned consumption

Before second major consumer:

- deliberate platform upgrade;
- migration/codemod;
- compatibility verification;
- rollback;
- then introduce reference consumers/compatibility matrix as justified.

## Priority 10 — Continue deferring optional ecosystem expansion

Examples:

- Backstage;
- generalized plugin system;
- Temporal;
- OpenFGA unless real authorization complexity demands it;
- universal page builder;
- large dedicated AI-review infrastructure.

---

# 49. Updated Items Explicitly NOT Accepted Yet

The following should not be promoted into project policy without more evidence:

1. “The platform is exactly 20% implemented.”
2. “All platform work must stop before TAYMEX begins.”
3. “Upgrade/codemod drill must precede first consumer proof.”
4. “AI is constitutionally forbidden from solar calculations.”
5. “18/18 visual scenarios are verified project truth” without corresponding evidence.
6. “Visual regression is the final guaranteed defense against UI rule bypass.”
7. “All golden references must be completed before product development.”
8. “Nearly one thousand historical defects exist” until inventory verifies the count.
9. “A dedicated Adversarial Spec Agent must be implemented before the slice.”
10. “CODEOWNERS is only social and therefore insufficient by definition.”
11. “Every verifier must physically live in a separate repository.”
12. “All current UI patterns violate Rule of Three.”
13. “OPA should become the single enforcement engine.”
14. “TAYMEX must either adopt tenancy now or make future tenancy impossible.”
15. “KVKK/GDPR applicability can be inferred from supported languages.”
16. “Integer minor units is the universal money representation for every future domain.”
17. “A global screenshot count cap must be chosen before measurements.”
18. “p95 can never be used in CI.”

---

# 50. Updated Items Accepted as Important Risks

1. Implementation maturity is behind architectural maturity.
2. A real consumer slice is now essential.
3. Functional omission is less protected than structural drift in current implementation maturity.
4. Settings runtime resolution is a high-risk unfinished capability.
5. Repository Truth must become deeper over time.
6. Impact analysis will matter increasingly as modules grow.
7. Golden References have real upfront cost.
8. Static UI enforcement will always have escape paths.
9. Visual-test flakiness and combinatorial growth can destroy trust if unmanaged.
10. Shared-platform upgrades must eventually be proven.
11. Platform operational complexity must be measured against team capacity.
12. Backend governance remains a major unfinished risk area.
13. Platform control-plane ownership and merge authority require explicit protection.
14. Branch-local verifier self-certification is a trust-root risk.
15. Historical defect knowledge is underutilized as executable engineering memory.
16. False-positive governance can cause bypass and abandonment.
17. Task-contract authoring can become a new bottleneck.
18. Agent-specific prompt/secret/tooling threats require an explicit threat model.
19. Settings resolution phase can create saved-but-not-applied/cache inconsistencies.
20. Partial/implicit tenancy is dangerous; enabled scopes must be explicit.
21. Shared persistent platform data introduces migration/ownership risk.
22. Early reusable pattern APIs can stabilize too soon.
23. Legal/compliance assumptions must be tied to actual operating jurisdiction.
24. Solar calculation correctness requires external/reference authority, not self-consistency tests only.
25. Platform economics need exit criteria and measured value, not endless foundation work.

---

# 51. Cumulative Decision Matrix

This table is updated after each expert.

| Topic | Expert support | Internal assessment | Evidence status | Current decision | Revisit when |
|---|---|---|---|---|---|
| Real vertical slice now | Experts 01 & 02: Strong | Strong agreement | Strong | START | Immediately |
| Freeze all platform work | Expert 01 | Too absolute | Weak | REJECT literal version | N/A |
| Pull-based platform work | Derived + reinforced | Strongly preferred | Strong architectural fit | ADOPT | During slice |
| Functional completeness pressure | Expert 02: Strong | Major implementation maturity gap | Strong design evidence, implementation proof pending | HIGH PRIORITY | First slice |
| Historical defect back-test | Expert 02: Strong | High-information, bounded cost | Strong rationale | START IN PARALLEL | Before Wave 3/4 reprioritization |
| Full historical taxonomy upfront | Expert 02 implication | Foundation risk | Weak | REJECT UPFRONT | Expand incrementally |
| Defect taxonomy seed | Expert 02 | High value if bounded | Strong rationale | ADOPT | From back-test |
| Adversarial spec phase | Expert 02 | Valuable | Medium | ADOPT LIGHTWEIGHT | R2+ tasks |
| Dedicated adversarial agent now | Expert 02 | Premature | Weak/Medium | DEFER | If spec pass proves value |
| Trusted verifier source | Expert 02 + prior internal concern | Critical trust root | Strong | PRIORITY 0 | Before broad autonomy |
| Governance regression corpus | Expert 02 | High-value control-plane test | Strong | ADOPT | Before verifier evolution |
| Agent threat model | Expert 02 | Genuine new risk | Strong | ADOPT COMPACTLY | Before broad autonomy |
| Explicit BLOCK behavior | Expert 02 | Low cost/high value | Strong | ADOPT | Agent protocol update |
| Settings Resolver priority | Experts 01 & 02 | Must occur inside slice | Strong | ADOPT | First real settings need |
| Settings resolution phase | Expert 02 | Real missing dimension | Medium/Strong | ADD TO IMPLEMENTATION DESIGN | Resolver work |
| Cross-setting validation | Expert 02 says missing | Already designed | Strong | IMPLEMENT, NO REDESIGN | Resolver work |
| Distributed cache invalidation | Expert 02 says missing | Already designed | Strong | IMPLEMENT, NO REDESIGN | Resolver work |
| Tenant scope dichotomy | Expert 02 | False dichotomy | Strong | ENABLE SCOPES BY PROFILE | Before resolver finalization |
| Deep Repository Truth | Experts 01 & 02 | Agree incrementally | Medium | ADOPT INCREMENTALLY | Slice evidence |
| Impact Graph | Experts 01 & 02 | Agree incrementally | Medium | PLAN | Real dependency pressure |
| Golden library upfront | Expert 01 concern + Expert 02 Rule-of-Three concern | Reject full upfront build | Medium | INCREMENTAL ONLY | Per real pattern |
| Pattern stability labels | Expert 02 | Strong improvement | Strong | ADOPT | Before declaring stable APIs |
| Visual flakiness/combinatorics | Experts 01 & 02 | Valid | Medium | MEASURE + RISK-BASED COVERAGE | Visual CI growth |
| Hard screenshot cap now | Expert 02 | Arbitrary without data | Weak | DEFER | After suite baseline |
| Deterministic PR performance checks | Expert 02 | Strong refinement | Strong | ADOPT | Performance gate implementation |
| Ban all p95 CI | Expert 02 | Too absolute | Weak | REJECT ABSOLUTE VERSION | Use stable dedicated environments |
| Codemod/upgrade drill now | Experts 01 & 02 favor early proof | Still premature before real version use | Medium | DEFER | Before second major consumer |
| Data migration ownership contract | Expert 02 | Important before shared persistence | Strong | ADOPT WHEN FIRST NEEDED | First platform-owned persistent schema |
| Reference-minimal/showcase now | Expert 02 | Synthetic work too early | Medium | DEFER | After first proven consumer |
| `platform.lock` now | Expert 02 | Useful when versioned distribution starts | Medium | DESIGN NOW, ENFORCE LATER | First released consumption |
| Agent familiarity ADR criterion | Expert 02 | Useful secondary metric | Medium | ADOPT AS CRITERION | Future ADRs/vertical slice data |
| Replace Nx governance with OPA | Expert 02 | Too broad | Strong existing allocation | REJECT | Cross-language needs |
| Assumption ledger as proof | Expert 02 challenges | Correct challenge | Strong | KEEP AS LAYER, NOT GUARANTEE | Repository Truth maturity |
| Contract auto-drafting | Expert 02 | Important adoption control | Strong | ADOPT | First slice |
| Legal compliance inferred from languages | Expert 02 | Unsupported inference | Weak | REJECT | Decide jurisdiction explicitly |
| Canonical Money abstraction | Expert 02 + platform map | Valid | Medium | PLAN WHEN DOMAIN NEEDS | Commerce/finance |
| Universal integer minor units | Expert 02 | Too prescriptive | Weak | DO NOT UNIVERSALIZE | Domain/accounting decision |
| Solar golden reference cases | Expert 02 | Strong domain assurance | Strong | ADOPT FOR TAYMEX DOMAIN | Before relying on calculator output |
| No-AI solar gate | Expert 01 | Unsupported requirement | Weak | DO NOT ADOPT | If formally approved |
| Control-plane protection | Experts 01 & 02 | Critical | Strong | PRIORITY 0 | Now |
| Merge authority | Experts 01 & 02 | Critical | Strong | PRIORITY 0 | Real consumer repo |
| Platform productivity metrics | Experts 01 & 02 | Strongly agree | Strong | ADOPT | First slice |

---

# 52. Template for Expert 03 and Later

For each new expert, add:

## Expert XX — Summary

### A. Claims judged correct
- ...

### B. Claims partially correct
- ...
- Required correction:
  - ...

### C. Claims not supported
- ...

### D. New gaps they discovered
- ...

### E. Already-known gaps they correctly reinforced
- ...

### F. Recommendations that change the roadmap
- ...

### G. Recommendations that do not change the roadmap
- ...

### H. Evidence required before acceptance
- ...

### I. Conflicts with previous experts
- ...

### J. Final impact on priorities
- ...

Then update:

- **Cross-Expert Convergence**
- **Cumulative Decision Matrix**
- **Accepted Risks**
- **Rejected/Unproven Claims**
- **Current Priority Order**
- **Open Questions**

---

# 53. Updated Open Questions Log

These questions remain open and should not be silently resolved:

1. What exact feature/module will be the first TAYMEX vertical slice?
2. Will the first consumer be a physically/logically independent repository from ENGINEERING_PLATFORM?
3. What is the concrete trusted-verifier distribution model?
4. Which control-plane files require mandatory owner approval?
5. What is the final trusted base-revision mechanism in CI?
6. Which settings strategies are required by the first real slice?
7. What settings resolution phases are actually needed?
8. Which setting scopes are enabled for TAYMEX v1?
9. What minimum Repository Truth depth is required before/during the first slice?
10. What constitutes required merge evidence for ordinary vs high-risk tasks?
11. What exact metrics will define whether the platform is improving delivery?
12. What baseline task-contract preparation time is observed?
13. When does a component/pattern become `stable`?
14. What exception/escape-hatch process will eventually be permitted?
15. What is the formal TAYMEX rule regarding AI and engineering calculations?
16. What authority approves solar sizing formulas/reference cases?
17. What rollback requirements apply to shared-platform upgrades?
18. What threshold indicates platform governance is becoming operationally too expensive?
19. What parts of platform policy may agents modify, if any?
20. What evidence currently exists for Wave 2 visual results and should be promoted into project truth?
21. How many historical defects actually exist in usable Harbuk/SARH evidence?
22. What stratified historical sample should be used for the first back-test?
23. What percentage of historical defects are currently prevented/detected/spec-forced/human-only/uncovered?
24. What false-positive rate do blocking rules produce in real TAYMEX work?
25. What agent-specific instruction/secret/network threat boundaries will be enforced?
26. When shared platform capabilities first own persistent data, what are the exact schema ownership and expand/contract rules?
27. What legal jurisdictions and commercial obligations actually apply to TAYMEX?
28. How will visual matrix growth be budgeted without creating blind spots?
29. Which performance measurements are stable enough to block PRs?
30. At what point does an Adversarial Spec Pass justify becoming a dedicated agent/tool?

---

# 54. Current Working Conclusion After Experts 01 and 02

There is still **no evidence that the core platform architecture should be reversed**.

Expert 02 does, however, materially sharpen the risk model.

After Expert 01, the main transition was:

> stop non-essential horizontal platform expansion and prove the platform through a real consumer.

After Expert 02, we add two equally important requirements:

> **Do not confuse drift prevention with functional completeness.**

and:

> **Measure the platform against the defects that actually hurt us before, not only against tests we wrote for the platform itself.**

The most valuable near-term operating model is therefore:

```text
Protect trust root / control plane
        ↓
Start real TAYMEX vertical slice
        ↘
         Run bounded historical-defect back-test in parallel
        ↓
Use failures to seed executable defect memory
        ↓
Pressure-test functional correctness
(auth / invariants / concurrency / idempotency / failures)
        ↓
Measure task/gate/adoption friction
        ↓
Deepen platform only from evidence
```

The two principal failure modes we must now avoid are:

### Failure mode A — Foundation expansion

Building:

- full taxonomy;
- multiple reference apps;
- large reviewer-agent systems;
- complete impact engine;
- all migration automation;

before the first real consumer proves their necessity.

### Failure mode B — False confidence

Assuming that because:

- scope is correct;
- UI is canonical;
- settings are registered;
- CI is green;

the feature is therefore functionally complete and secure.

The platform must ultimately prevent both:

> **Drift** — doing unauthorized/wrong things.

and:

> **Omission** — failing to implement required things.

Finally, Expert 02 introduces an adoption criterion that should now be treated as constitutional for the platform:

> **The governed path must not only be safer; it must be faster and easier enough that bypassing it is irrational.**

Therefore platform success should be judged by two paired measurements:

1. **Historical/real defect coverage and escaped-defect rate.**
2. **Human/agent friction required to complete a normal task.**

High prevention with intolerable friction will fail operationally.

Low friction with weak prevention will recreate Harbuk/SARH.

The target is measurable improvement in both.

---

## Document Status

- Expert reviews included: **2**
- Current state: **Cumulative / Active**
- Main-plan changes: **not automatically applied from this document**
- Next review action: evaluate Expert 03, then update cross-expert convergence and decision matrix
- Any roadmap/ADR change must be explicitly approved after cumulative review.
# 55. Expert 03 — Overall Evaluation

## 55.1 Overall value

Expert 03 is useful because the review is operational rather than purely architectural.

The strongest contributions are:

- forcing a distinction between “laboratory proof” and real-agent/real-consumer proof;
- identifying the exception workflow as something that must be tested, not merely designed;
- questioning the practical cost of UI abstraction layers;
- highlighting package-distribution proof;
- providing a broad inventory of missing implementation areas;
- reinforcing that the current system does not yet deserve “production-ready platform” status.

However, the review repeatedly uses phrases such as:

- “we never discussed this,”
- “there is no gate,”
- “this is completely missing,”

for concerns that are already explicitly present in:

- the Platform Capability Map;
- ADR-006;
- Quality Gate Matrix;
- Agent Execution System;
- ADR-004;
- Repair & Regression Protocol.

Therefore Expert 03 is strongest as an **implementation-readiness review**, but less reliable as a statement of what the architecture has or has not considered.

---

# 56. Designed vs Implemented vs Proven — Required Precision

Expert 03 reinforces the need for a strict maturity vocabulary.

Every important capability should be tracked as:

```text
DESIGNED
    ↓
REGISTERED
    ↓
IMPLEMENTED
    ↓
INTEGRATED_IN_PLATFORM
    ↓
ENFORCED_IN_REAL_CONSUMER
    ↓
PROVEN_WITH_REAL_AGENT
    ↓
PRODUCTION_PROVEN
```

Not every capability requires every intermediate label, but reporting must distinguish them.

### Example

For N+1 prevention:

- architectural need: **DESIGNED**
- gate `PERF-002`: **REGISTERED**
- static/query instrumentation implementation: may be **PENDING/PARTIAL**
- real TAYMEX enforcement: **NOT YET PROVEN**

Therefore saying “N+1 has not been considered” is false.

Saying:

> “N+1 is not yet proven as an executable consumer gate”

is precise.

### Decision

Adopt this maturity vocabulary in future implementation status reporting.

---

# 57. Expert 03 Claim: Wave 0+1 built governance, not the full runtime platform

### Evaluation

**Accepted, but this is intentional rather than a discovered flaw.**

Wave 0–1 was explicitly designed as:

> a small executable governance loop before the full application platform exists.

L1/L2 runtime packages were never claimed to be complete at that stage.

### Important implication

Do not call the current state “platform complete.”

But also do not interpret staged delivery as architectural failure.

### Decision

Retain current architecture and continue evidence-based maturation.

---

# 58. Expert 03 Claim: Complete Wave 2 entirely before doing anything else

### Evaluation

**Rejected as stated.**

This is the most important sequencing disagreement with Expert 03.

The authoritative roadmap defines the **proof of Wave 2 itself** as:

> Build one admin CRUD vertical slice using approved UI, settings, auth, audit and i18n mechanisms.

Therefore:

> **The vertical slice is part of closing/proving Wave 2. It cannot logically be postponed until after Wave 2 is “fully complete.”**

### Corrected sequence

Do not require 100% completion of every Wave 2 idea.

Instead define a **Wave 2 Critical Path**:

1. enough real design-system/runtime wiring for the slice;
2. real component discovery/source of truth;
3. real static UI restrictions in consumer code;
4. representative responsive/RTL checks;
5. accessibility baseline for used components/flows;
6. real package/artifact consumption boundary;
7. real task-verify integration;
8. real TAYMEX CRUD slice.

Unused optional Wave 2 patterns remain backlog.

### Important distinction

For example:

- if the slice uses Panda, actual Panda integration must work;
- if the slice uses shared Button/Table/Form, their real Storybook/component truth must exist;
- if a Search/Wizard pattern is not used, it should not block the slice;
- exhaustive theme/locale matrices should not block the slice if the affected/risk model does not require them.

### Decision

**Close the Wave 2 path through the TAYMEX slice, not before it.**

---

# 59. Expert 03 Claim: Build a separate small experimental consumer, then later begin real TAYMEX

### Evaluation

**Rejected as the default sequence.**

The accepted repository architecture already says:

- ENGINEERING_PLATFORM is the reusable platform repository;
- TAYMEX is the first independent validation consumer;
- production TAYMEX must not live inside the platform monorepo.

Creating another synthetic project before TAYMEX would:

- duplicate scaffolding;
- test weaker domain pressure;
- postpone business learning;
- create another foundation artifact to maintain;
- risk proving only what the test project was designed to prove.

### Adopted model

The first **TAYMEX vertical slice itself is the experimental validation exercise.**

It is permitted to fail, expose platform defects, and trigger platform changes.

### Narrow exception

A tiny disposable harness may still be useful to test a dangerous bootstrap mechanism such as:

- package publishing/install;
- trusted verifier execution;
- migration runner;
- CI reusable workflow.

But such a harness is infrastructure verification, not a substitute consumer and not a milestone before product work.

---

# 60. Newly Exposed Sequencing Gap: Consumer Package Bootstrap

Expert 03's “build one L1 package first” recommendation exposes a real ambiguity between accepted documents:

1. TAYMEX should be an independent consumer of released platform artifacts.
2. Cross-project package publishing is described as a later maturity wave after TAYMEX proves the model.

These two statements need a bootstrap bridge.

## Adopted resolution

For the first TAYMEX slice, use **pre-release/internal versioned artifacts**.

Example maturity:

```text
@org/platform-kernel@0.x
@org/settings@0.x
@org/ui@0.x
```

Possible distribution mechanisms include an internal registry or immutable packed artifacts, but the invariant is more important than the exact transport:

> **TAYMEX consumes a versioned artifact boundary; it does not import or copy platform source.**

### Slice acceptance evidence

At least one runtime/shared platform package and the relevant UI package should be consumed by TAYMEX through the real artifact boundary.

This proves:

- package boundaries;
- dependency declaration;
- version visibility;
- upgradeability assumptions;
- no hidden monorepo coupling.

### Decision

**Add Consumer Package Bootstrap to the first slice.**

This is stronger than creating a separate experimental app before TAYMEX.

---

# 61. Expert 03 Claim: N+1, Pagination and Authorization were not addressed

### Evaluation

**Incorrect as an architectural claim; valid as an implementation-readiness concern.**

The authoritative gate catalog already includes:

- `PERF-001` — unbounded data/pagination limits;
- `PERF-002` — N+1 / loop I/O;
- `SEC-002` — authorization/BOLA;
- `FUNC-003` — concurrency/idempotency.

The Agent Execution System also explicitly requires:

- pagination/limits;
- no DB/network call in loops where detectable;
- authorization/ownership tests;
- negative tests;
- idempotency/replay controls where relevant.

### Actual gap

These controls are not yet equally mature as Wave 0–1 scope enforcement.

### Decision

Do not redesign these gates.

Implement/prove the minimum relevant mechanisms through the slice.

### Slice-specific expectation

For a Products CRUD/list slice:

- pagination/limit behavior should be real from the start;
- authorization should include negative resource/action tests;
- query instrumentation should be used if the chosen data access path can meaningfully demonstrate query amplification;
- concurrency/idempotency is required only where the slice includes a side-effect/write path where duplicate/racing execution matters.

### Important nuance

Do not build a fake universal “N+1 detector” merely to tick the gate.

Use:

- static detection where reliable;
- query instrumentation/count assertions;
- integration evidence.

---

# 62. Expert 03 Claim: Hardcoded settings are not addressed

### Evaluation

**Incorrect as a design claim; implementation remains pending/partial.**

ADR-004 explicitly defines hardcode prevention and `SET-002` exists in the Quality Gate Matrix.

### Decision

No new architecture.

The first settings-enabled consumer path must prove that a governed setting cannot be silently replaced by a duplicate literal in normal feature code where reliable detection exists.

---

# 63. Expert 03 Claim: Settings Registry should be generated from code

### Evaluation

**Rejected as the default source-of-truth direction.**

This recommendation risks reversing the architecture.

If product code becomes the source from which the registry is inferred, then:

- duplicated settings may become “truth” after being introduced;
- local implementation can define governance accidentally;
- code-first drift can override the central classification model.

### Preferred direction

The canonical registry remains authoritative.

Tooling should improve **authoring**, not reverse ownership.

Useful tools:

```text
platform settings add
platform settings validate
platform settings explain
platform settings consumers
platform settings doctor
```

A generator may:

- create a canonical registry entry;
- generate typed accessors/types;
- update module manifests;
- generate UI metadata;
- generate tests/stubs.

### Code-to-registry role

Code scanning may detect:

- undeclared consumers;
- hardcoded duplicates;
- orphaned settings;
- stale manifest claims.

It should not silently create canonical settings from arbitrary implementation.

### Decision

**Registry-first, generated consumers/accessors, code-backed conformance.**

---

# 64. Expert 03 Settings Observations

## 64.1 Effective Resolver

**Accepted as a real unfinished implementation.**

Already high priority from Experts 01 and 02.

## 64.2 Saved-but-not-applied diagnostics

**Accepted as an important planned-but-unimplemented capability.**

Already designed in ADR-004.

## 64.3 Semantic duplicate detection

Expert 03 notes that exact key collision is easier than discovering semantically overlapping keys such as:

```text
commerce.defaultCurrency
orders.currency.default
```

### Evaluation

**Valid hard problem.**

But probabilistic semantic matching should not become a blocking rule by default.

### Preferred approach

- exact canonical/alias rules → blocking;
- terminology ownership and module manifests → deterministic prevention;
- semantic similarity → advisory candidate warning;
- repeated known collisions → explicit aliases/forbidden mappings.

## 64.4 Hot setting consumer behavior

**Valid implementation concern.**

The setting's declared runtime/change behavior must have a real consumer contract and tests where relevant.

---

# 65. Expert 03 Wave 2 Evidence Claims

Expert 03 states specific results such as:

- 8 Wave 2 governance tests;
- 18 visual/responsive/RTL scenarios;
- horizontal overflow discovered at 768px;
- 46 total passing tests.

### Evaluation

**Do not yet promote these counts to authoritative project truth.**

The available authoritative verification evidence currently located in the project materials explicitly proves Wave 0–1 and 12 tests.

A dedicated Wave 2 verification report/test artifact has not yet been located in this review.

### Decision

Keep the claims as:

`REPORTED_BY_EXPERT / EVIDENCE_PENDING`

until one of the following is available:

- Wave 2 verification report;
- raw test output;
- CI evidence;
- repository commit/artifacts.

### Rule retained

Expert summaries do not replace implementation evidence.

---

# 66. Expert 03 Claim: Panda must be proven in the real build

### Evaluation

**Accepted.**

If Panda is the accepted styling engine but current validation uses generated CSS without the actual Panda runtime/build integration, the first real consumer cannot be considered proof of the selected stack until the chosen integration runs.

### Decision

Panda real-build integration is part of the **used-path Wave 2 critical path**.

### But

Do not treat this as a reason to finish every possible Panda/design-system feature before the slice.

The slice is the proving environment.

---

# 67. Expert 03 Claim: DTCG is too new and therefore risky

### Evaluation

**Risk acknowledged, no architecture reversal.**

The frontend stack decision already recognizes evolving tool support.

The central mitigation is precisely why DTCG is vendor-neutral source data and the project owns/controls validation/transformation rather than depending on one third-party transform tool for correctness.

### Decision

Retain DTCG as canonical source unless real implementation evidence shows unacceptable tooling friction.

Measure:

- transform complexity;
- unsupported token features actually needed;
- agent/developer ergonomics;
- generated artifact stability.

---

# 68. Bidi and Arabic Digit Preferences

Expert 03 identifies:

- mixed-direction/bidi text;
- Arabic/Latin digit presentation;
- mixed content direction.

### Evaluation

### Bidi/mixed-direction text
**Valid localization quality concern.**

It should be tested in representative components containing:

- Arabic + product code;
- Arabic + email/URL;
- Arabic + number/currency;
- English/Turkish labels with Arabic content where applicable.

### Arabic digit preference
**Not a universal platform invariant.**

Arabic-Indic vs Latin digit display is a locale/product decision.

### Decision

- bidi handling → include in i18n/RTL reference tests where relevant;
- digit preference → explicit product/profile localization policy, not a hardcoded global platform rule.

---

# 69. Expert 03 Claim: Exception Workflow Has Not Been Proven

### Evaluation

**Accepted — important new operational proof item.**

The exception model is designed:

- narrow rule;
- scope;
- reason;
- approver;
- expiry;
- compensating control;
- non-waivable security invariants.

But the usability and enforcement path should be tested.

### First-slice test

Exercise at least one **safe synthetic exception scenario**:

1. ordinary blocking rule fails;
2. valid narrow waiver is created by authorized owner;
3. waiver permits only the declared scope;
4. expiry is enforced;
5. unrelated violation still fails;
6. a non-waivable security invariant cannot be bypassed.

### Why this matters

An exception path that is too hard causes unofficial bypasses.

An exception path that is too easy destroys governance.

### Decision

Add **Exception UX/Enforcement Drill** to the first consumer validation phase.

---

# 70. Versioned Package Security Update Concern

Expert 03 notes that consumers pinned to an older platform patch do not automatically receive a later security fix.

### Evaluation

**Valid operational reality, not an argument against versioned packages.**

All independent package ecosystems face this.

### Required future release controls

Before multiple production consumers exist, define:

- supported-version window;
- security advisory mechanism;
- minimum safe platform version;
- automated dependency update PRs;
- release notes/migration notes;
- urgent security upgrade path;
- visibility of consumer versions;
- policy for unsupported vulnerable versions.

### Decision

Add to Release/Consumer Compatibility policy before production multi-consumer use.

Not a prerequisite to starting the first TAYMEX slice.

---

# 71. Expert 03 Claim: UI Architecture May Have Too Many Layers

### Evaluation

**Valid question, not enough evidence for immediate collapse.**

The apparent chain:

```text
DTCG
→ compiler/preset
→ React Aria
→ primitives
→ components
→ patterns
→ page schemas
→ pages
```

contains layers with different responsibilities:

- design value source;
- transformation;
- interaction/accessibility;
- organization adapter;
- reusable semantic component;
- business-neutral UX composition;
- generator/schema;
- product composition.

Counting boxes alone does not measure developer/agent burden.

### Better metric: Abstraction Tax

Measure during the slice:

- how many APIs must a feature author understand?
- how many files must be touched for a normal page?
- how many layers are visible to product code?
- how many “wrong layer” corrections occur?
- how often an agent bypasses a layer because discovery is unclear?
- how many changes require touching multiple layers unnecessarily?

### Important target

Product feature code should ideally interact mostly with:

- components;
- patterns;
- product/domain contracts.

It should **not** routinely reason about DTCG compiler internals or React Aria primitives.

### Decision

Do not merge layers preemptively.

Simplify only where measured abstraction tax shows no distinct value.

---

# 72. Expert 03 Claim: Settings System May Be Overengineered

### Evaluation

**Risk worth monitoring, but current complexity is justified by known failure modes.**

The platform does not require every setting to use every feature.

A simple setting may have:

- key;
- owner;
- type;
- allowed scope;
- basic override;
- permission;
- change mode.

Security-sensitive or multi-scope settings use stronger semantics only when needed.

### Improvement: Progressive Disclosure

Authoring UX/tooling should:

- provide sensible safe defaults;
- ask advanced resolution questions only when needed;
- expose advanced settings semantics by classification;
- avoid forcing humans to manually fill every theoretical field.

### Decision

Keep semantic model.

Reduce **authoring complexity**, not safety semantics, unless real slice metrics show the model itself is unnecessary.

---

# 73. Expert 03 “Unaddressed Gaps” — Triage

Many of the 16 listed items are not actually absent.

They should be classified rather than all converted into immediate platform projects.

| Concern | Actual status | Decision |
|---|---|---|
| Platform DB migrations | recognized by DB gates/release model; detailed shared-persistence ownership still open | decide when first shared persistent capability appears |
| Multi-tenancy | optional L3 capability; setting scopes “where permitted” | disabled in TAYMEX until explicitly enabled |
| Consumer testing strategy | contract/unit/integration/E2E model exists; reusable test harness is L1 | prove minimal test harness in slice |
| Unified error handling | canonical error model is L1 | implement when first API/runtime package needs it |
| Logging standards | observability primitives are L1 | implement minimum structured/correlation/redaction contract when backend path exists |
| API versioning | API compatibility is designed; explicit public versioning policy may still need decision | decide when first external/public contract needs versioning |
| Documentation generation | generated evidence + Storybook + manifests already chosen; full developer-doc surface not complete | derive from truth; avoid manual doc sprawl |
| Onboarding/DX | inspect/generators/manifests/Storybook planned/partial | measure first-slice friction before building a portal |
| Environment configuration | typed config foundation is L1; environment/profile mechanics need concrete implementation | implement with first runtime consumer |
| General caching abstraction | not universal by default | add only when recurring need proves it |
| Queue/background jobs | event/outbox contracts in L1; jobs hooks in L2; provider runtime not universal | adapter/profile when product needs it |
| Rate limiting | explicitly part of security enforcement model | implement where public/resource-sensitive endpoint requires it |
| Search | optional L3 capability | defer until TAYMEX needs it |
| Real-time WebSockets/SSE | not a current universal capability | defer until a real requirement exists |
| Privacy/GDPR | jurisdiction cannot be inferred generically | run compliance-jurisdiction decision before launch |
| Backup/DR | infrastructure concern/profile | decide with deployment/SLO needs |

### Decision

Do not create “16 missing platform projects.”

Use:

```text
ALREADY DESIGNED
IMPLEMENT WHEN FIRST USED
OPTIONAL / REQUIREMENT-TRIGGERED
LEGAL/DOMAIN DECISION
NOT UNIVERSAL
```

---

# 74. Additional Useful Idea: `platform doctor`

Expert 03 suggests a diagnostic command.

### Evaluation

**Potentially valuable, but should be an aggregator, not a new competing truth engine.**

A future `platform doctor` could run existing conformance diagnostics such as:

- stale/generated artifact checks;
- module manifest mismatches;
- orphaned settings;
- declared-but-unconsumed settings;
- component registry issues;
- package/version drift;
- invalid exceptions;
- missing required project profile files;
- environment/config inconsistencies.

### Decision

Keep as a candidate **DX aggregator**.

Do not implement until first-slice evidence shows repeated manual diagnostic friction.

---

# 75. Developer/Agent Onboarding

Expert 03 correctly asks how a new developer/agent discovers:

- available components;
- settings;
- modules;
- patterns;
- commands.

### Evaluation

**Partially addressed by architecture, not yet proven as an experience.**

The intended solution is machine-derived discovery:

- `platform inspect`;
- Storybook/component manifests;
- module manifests;
- settings registry;
- task context;
- generated project graph.

### First-slice metric

Record:

- number of times the agent cannot discover an existing primitive;
- number of duplicate attempts;
- number of manual “use X instead” reminders;
- context-generation time and usefulness.

### Decision

Do not write a new large onboarding manual.

Improve executable discovery from measured failures.

---

# 76. Real-Agent End-to-End Governance Run

Expert 03 strongly reinforces a gap already implied by Experts 01/02:

> Passing governance unit tests is not the same as a real coding agent completing a real task under governance.

### Evaluation

**Strongly accepted.**

### Required first-slice evidence

At least one complete run should demonstrate:

```text
task/intent
→ task contract draft/review
→ prepare
→ agent implementation
→ real diff
→ verifier/gates
→ at least one genuine or seeded failure
→ constrained repair
→ re-verification
→ merge-ready evidence
```

### Important nuance

We do not need the agent to intentionally write bad code in the main implementation.

A separate temporary red-team branch/task may test deliberate bypass scenarios.

### Metrics

Capture:

- context size/usefulness;
- implementation corrections;
- rule failures;
- false positives;
- bypass temptation;
- task preparation time;
- total governance overhead;
- escaped issues found by human review.

### Decision

Make **Agent-in-the-Loop Run** a first-slice acceptance criterion.

---

# 77. Consumer Testing Foundation

Expert 03 asks whether consumers copy tests or receive reusable utilities.

### Evaluation

**Valid implementation question.**

The Capability Map already places test fixtures and contract-test harnesses in L1.

### Preferred model

Consumers should not copy platform contract tests manually.

The platform should provide reusable test helpers/contracts for shared mechanisms.

Examples:

- authorization behavior fixtures;
- settings resolver contract suite at platform layer;
- API/error contract helpers;
- audit assertion helpers;
- test clock;
- idempotency/concurrency harness where appropriate.

Product tests add domain-specific behavior.

### Decision

Implement only the minimum harness required by the first slice, then promote repeated helpers.

---

# 78. Error, Logging and Observability Foundation

Expert 03 lists error handling and logging as completely absent.

### Evaluation

**Incorrect as architecture; valid as implementation maturity.**

The L1 Capability Map already includes:

- canonical error model;
- audit;
- observability primitives.

### First backend slice should decide/implement minimally

- stable machine error code shape;
- boundary-safe user message/localization strategy;
- trace/correlation identifier;
- structured logs;
- sensitive-field redaction;
- audit vs diagnostic-log distinction.

### API standards

A standard such as Problem Details may be considered when the concrete API stack is implemented, but should not be selected merely because the expert named it.

### Decision

Pull these into implementation when the first real API/backend boundary exists.

---

# 79. API Versioning

Expert 03 identifies API versioning as missing.

### Evaluation

**Partly valid.**

Compatibility checking is already designed through OpenAPI diff/generated types.

But “compatibility” and “public API versioning strategy” are not identical.

### Open decision when a public/external API is introduced

Choose explicitly:

- compatibility-only evolution within a version;
- URI/header/media versioning if genuinely needed;
- deprecation window;
- consumer migration expectations.

### Rule

Do not add version numbers to internal APIs preemptively.

### Decision

Requirement-triggered.

---

# 80. General Cache / Queue / Real-Time Abstractions

### Evaluation

Expert 03 is correct that these are not fully designed as universal runtime packages.

But this may be desirable.

### Principle

Do not make infrastructure mechanisms universal merely because “most apps may eventually need them.”

Use ports/adapters/profiles when repeated demand appears.

### Current treatment

- settings cache consistency → settings foundation concern;
- event/outbox contracts → L1;
- job UI hooks → L2;
- queue provider/runtime → implementation/profile-specific;
- real-time → optional future capability;
- general application cache → add only with concrete recurring semantics.

### Decision

No immediate expansion.

---

# 81. Backups and Disaster Recovery

Expert 03 lists backup/DR as unaddressed.

### Evaluation

**Important production concern but not application-platform foundation work right now.**

Backup/DR depends on:

- database/provider;
- RPO/RTO;
- deployment architecture;
- data criticality;
- storage;
- legal retention.

### Decision

Create deployment/reliability requirements when TAYMEX infrastructure profile is selected.

Do not block the first application vertical slice unless the slice itself deploys production state.

---

# 82. Cross-Expert Convergence After Experts 01, 02 and 03

Three expert reviews now converge strongly on the following:

## 82.1 Real consumer proof is urgent

- Expert 01: stop horizontal platform expansion and use TAYMEX.
- Expert 02: measure historical coverage and build through a real consumer.
- Expert 03: current tests are laboratory/meta-tests and real-agent use is still missing.

### Cumulative decision

**START the real TAYMEX vertical slice now.**

Expert 03's proposal for a separate experimental project is not adopted; TAYMEX itself is the validation consumer.

## 82.2 Platform maturity must not be overstated

All three reviews reinforce that large parts are:

- designed;
- partially implemented;
- not yet real-consumer proven.

### Cumulative decision

Use maturity states, not binary or percentage claims.

## 82.3 Backend/functional/security proof is weaker than scope/UI structural proof

Across Experts 01–03 the recurring high-value areas are:

- authorization;
- concurrency/idempotency;
- query/data behavior;
- settings runtime;
- state/invariants;
- repository truth.

### Cumulative decision

Make these first-slice pressure points where relevant.

## 82.4 Settings Resolver is repeatedly identified as critical

All three reviews independently return to:

- real resolver;
- consumption;
- explainability;
- runtime propagation.

### Cumulative decision

It remains a high-risk slice-pulled capability.

## 82.5 Platform ergonomics can determine adoption

Experts 01/02 emphasized operational burden; Expert 03 questions UI layers and tooling volume.

### Cumulative decision

Measure abstraction tax, task-contract cost, gate time, false positives and manual reminders.

## 82.6 Upgrade/distribution risk remains important

All experts raise some form of version/upgrade risk.

### New refinement after Expert 03

The **artifact boundary itself** should be proven during the first TAYMEX slice using pre-release platform packages.

Full multi-consumer upgrade machinery still waits until actual versioned consumption exists.

---

# 83. Main Disagreement With Expert 03

The central disagreement is sequencing.

Expert 03 recommends roughly:

```text
finish all Wave 2
→ separate experimental consumer
→ implement N+1/pagination/authorization
→ build first L1 package
→ only then start real TAYMEX
```

The cumulative evidence favors:

```text
protect trust root
→ make the used Wave 2 path executable
→ start real TAYMEX vertical slice
   ↘ prove real package boundary
   ↘ run agent-in-the-loop
   ↘ pull pagination/auth/settings/audit/etc. as used
   ↘ run historical defect back-test in parallel
→ repair platform from observed failures
→ deepen Wave 3/4 based on evidence
```

### Why

Because the roadmap itself defines the vertical slice as Wave 2 proof.

Delaying TAYMEX until after all possible Wave 2 and backend controls are finished recreates the Foundation Trap.

---

# 84. New Acceptance Criteria for the First TAYMEX Vertical Slice

After three expert reviews, the slice should prove at minimum:

## 84.1 Trust and governance

- protected task/control-plane path;
- trusted verifier/status check;
- trusted base revision;
- real task contract;
- real risk escalation;
- no self-approved governance weakening.

## 84.2 Real artifact boundary

- TAYMEX remains independent;
- consumes at least one runtime/shared platform pre-release artifact;
- consumes real platform UI artifact;
- no platform source copying/import-by-path.

## 84.3 Real agent loop

- real Codex/agent receives generated context;
- implements within task;
- governance checks real diff;
- at least one failure/repair cycle is observed;
- final merge evidence is generated.

## 84.4 UI used path

- actual chosen styling runtime works;
- canonical component import path;
- relevant Storybook/component manifest truth;
- responsive check;
- RTL/LTR representative check;
- a11y baseline for used controls;
- no raw/local primitive bypass.

## 84.5 Backend/functionality

Where relevant to chosen Products slice:

- pagination/limit contract;
- authorization positive + negative;
- validation boundaries;
- domain invariants;
- duplicate/retry semantics on write;
- concurrency test where realistic;
- query-count/N+1 evidence where relevant;
- audit event;
- canonical error behavior.

## 84.6 Settings

If the slice uses a configurable product setting:

- canonical registry entry;
- typed access;
- effective resolver;
- provenance/explain;
- permissions;
- no duplicate hardcode;
- change behavior;
- consumer diagnostic path.

## 84.7 Exception system

- one safe narrow exception drill;
- expiry;
- scope containment;
- security invariant remains non-waivable.

## 84.8 Observability/DX

- structured diagnostic/error evidence;
- agent can discover existing module/component/setting;
- task-preparation time measured;
- manual reminders counted;
- false positives recorded.

---

# 85. Priority Order After Experts 01–03

## P0 — Trust root and merge authority

- immutable/trusted verifier path;
- repository rules/CODEOWNERS;
- trusted base;
- protected CI/control plane;
- governance regression corpus;
- least privilege.

## P1 — Make the Wave 2 used path real enough to start the slice

Not “complete every Wave 2 feature.”

Specifically:

- real styling/runtime integration used by slice;
- canonical component package/catalog;
- consumer UI gates;
- representative responsive/RTL/a11y.

## P2 — Start real independent TAYMEX Products vertical slice

TAYMEX is the validation consumer.

No synthetic consumer prerequisite.

## P3 — Prove pre-release package/artifact consumption

At least one real platform runtime/shared package and UI package across independent repository boundary.

## P4 — Run real agent-in-the-loop task cycle

Measure failure, repair and governance friction.

## P5 — Run bounded historical defect back-test in parallel

Use stratified/severity-weighted coverage.

## P6 — Pull critical backend/runtime controls through actual slice needs

- authorization;
- pagination;
- validation;
- query instrumentation;
- idempotency/concurrency where relevant;
- audit/error/observability.

## P7 — Complete real Settings Resolver when first used

Including explainability, scopes, permissions, propagation and diagnostics.

## P8 — Exercise exception workflow

Verify safe escape hatch rather than leaving it theoretical.

## P9 — Measure abstraction/adoption tax

- task contract preparation;
- gate time;
- false positives;
- UI abstraction friction;
- agent discovery failures;
- manual reminders;
- exception count;
- rework.

## P10 — Deepen Repository Truth and later gates from evidence

Then proceed into Wave 3/4 only where observed failures justify priority.

---

# 86. Expert 03 Claims Accepted as Valuable

1. Current platform status should not be described as production-ready.
2. Real-agent/real-consumer proof is still required.
3. The package distribution boundary must be proven in practice.
4. Settings Resolver and consumption diagnostics remain unfinished.
5. Exception workflow needs operational validation.
6. Panda/actual styling integration must be proven if it remains the selected runtime.
7. UI abstraction burden should be measured.
8. Consumer test utilities/contracts need a practical model.
9. Error/logging/observability need real implementation in the first backend path.
10. Versioned packages require future security-update/compatibility operations.
11. Bidi/mixed-direction content deserves explicit testing.
12. `platform doctor` may become a useful conformance/DX aggregator.
13. Onboarding/discovery is an experience that must be proven, not just designed.
14. Optional infrastructure capabilities should receive explicit “now/later/no” classification rather than silently drifting into the platform.

---

# 87. Expert 03 Claims Partially Accepted

1. **“Wave 0+1 built governance, not the platform.”**  
   Correct as implementation status; not a design failure.

2. **“Finish Wave 2 before Wave 3.”**  
   Correct that we should not skip the proof path; incorrect if it means complete every Wave 2 feature before the vertical slice.

3. **“Add N+1/Pagination/Authorization urgently.”**  
   Important implementation areas; already designed and should be pulled by the slice, not redesigned as new concepts.

4. **“Build a real L1 package early.”**  
   Correct need to prove package boundary; do it as part of the TAYMEX slice via pre-release artifacts.

5. **“Settings Registry cannot stay manual.”**  
   Authoring must become ergonomic; canonical registry should not be inferred from arbitrary code.

6. **“UI has too many layers.”**  
   Possible abstraction tax; count of conceptual layers alone is not evidence.

7. **“Settings system may be too complex.”**  
   Monitor authoring/runtime burden; use progressive disclosure before weakening semantics.

8. **“Versioned packages create security lag.”**  
   True operational risk; solve through release/update policy, not copy/shared-source coupling.

---

# 88. Expert 03 Claims Rejected or Unsupported as Stated

1. “Wave 2 must be completely closed before the vertical slice.”  
   The roadmap defines the slice as Wave 2 proof.

2. “A separate experimental project must precede TAYMEX.”  
   TAYMEX is the accepted first independent validation consumer.

3. “N+1, pagination and authorization were never addressed.”  
   They are explicitly in the Quality Gate Matrix/Agent Execution System.

4. “Hardcoded settings are not part of governance.”  
   ADR-004 and `SET-002` explicitly cover them.

5. “Cross-project testing/functional concerns are absent from the architecture.”  
   Multiple authoritative documents define them; implementation is the gap.

6. “Multi-tenancy was never discussed.”  
   It is an optional L3 capability and setting scopes are explicitly conditional.

7. “Error handling/logging have no place in the platform design.”  
   Canonical error and observability primitives are L1.

8. “Caching, queueing, search and real-time must all be designed now because most projects need them.”  
   This conflicts with conservative capability admission and optional profiles.

9. “Every one of the listed 16 gaps needs implementation before TAYMEX.”  
   They require classification, not simultaneous foundation expansion.

10. Specific Wave 2 test counts are not accepted as authoritative until evidence is located.

---

# 89. Updated Cumulative Decision Matrix — Expert 03 Additions

| Topic | Expert support | Internal assessment | Evidence status | Current decision | Revisit |
|---|---|---|---|---|---|
| Complete all Wave 2 before slice | Expert 03 | Conflicts with roadmap proof model | Strong roadmap evidence | REJECT ABSOLUTE VERSION | N/A |
| Used-path Wave 2 before/during slice | Expert 03 + roadmap | Correct | Strong | ADOPT | Immediately |
| Separate experimental project before TAYMEX | Expert 03 | Adds synthetic delay | Strong architecture evidence | REJECT DEFAULT | Only tiny infra harness if needed |
| TAYMEX as first validation consumer | Experts 01/02 + ADRs | Strong | Strong | CONFIRMED | Now |
| Real agent-in-loop cycle | Expert 03 + prior convergence | Critical proof gap | Strong rationale | ADOPT | First slice |
| Pre-release package artifact boundary | Expert 03 indirectly exposes | Resolves roadmap/bootstrap ambiguity | Strong | ADOPT | First slice |
| N+1 gate need | Expert 03 | Already designed, not fully proven | Strong | IMPLEMENT WHEN RELEVANT | Slice/backend |
| Pagination gate need | Expert 03 | Already designed/L1 contract | Strong | USE FROM FIRST LIST ENDPOINT | Slice |
| Authorization gate need | Experts 02/03 | Already designed, high-risk | Strong | PROVE POSITIVE+NEGATIVE | Slice |
| Settings hardcode prevention | Expert 03 | Already designed | Strong | IMPLEMENT/PROVE | First governed setting |
| Registry generated from code | Expert 03 | Reverses canonical ownership | Strong architectural concern | REJECT | Use generator/tooling instead |
| Settings authoring tooling | Expert 03 | Strong DX need | Medium/Strong | ADOPT INCREMENTALLY | First settings work |
| Semantic duplicate settings detection | Expert 03 | Useful but probabilistic | Medium | WARN/ADVISORY FIRST | After examples |
| Exception workflow proof | Expert 03 | Important new operational gap | Strong | ADOPT DRILL | First consumer validation |
| Panda real build proof | Expert 03 | Required if stack retained | Strong | ADOPT | Used Wave 2 path |
| DTCG reversal | Expert 03 risk | No evidence to reverse | Medium | RETAIN, MEASURE | Slice |
| Bidi mixed text | Expert 03 | Valid RTL concern | Strong | ADD REPRESENTATIVE TESTS | UI slice |
| Arabic digit preference as global rule | Expert 03 | Product/locale choice | Medium | DO NOT GLOBALIZE | TAYMEX localization policy |
| UI layer simplification now | Expert 03 | Insufficient evidence | Medium | MEASURE ABSTRACTION TAX | Slice |
| Settings semantic simplification now | Expert 03 | Insufficient evidence | Strong historical rationale for current model | USE PROGRESSIVE DISCLOSURE | Slice |
| `platform doctor` | Expert 03 | Useful aggregator candidate | Medium | DEFER UNTIL DX EVIDENCE | Post-slice |
| Error/observability implementation | Expert 03 | Already L1 designed | Strong | PULL WITH FIRST BACKEND | Slice |
| API versioning | Expert 03 | Requirement-dependent | Medium | DECIDE WITH PUBLIC API | Later/as needed |
| General cache package | Expert 03 | Not universal | Weak immediate need | DEFER | Repeated need |
| Queue runtime | Expert 03 | Adapter/profile concern | Medium | DEFER UNTIL NEEDED | Product requirement |
| Search | Expert 03 | Already optional L3 | Strong | DEFER | TAYMEX need |
| Real-time | Expert 03 | No current requirement | Weak | DEFER | Real requirement |
| Backup/DR | Expert 03 | Production infra concern | Strong | DECIDE WITH DEPLOYMENT PROFILE | Before production |
| Security patch update policy | Expert 03 | Valid multi-consumer release concern | Strong | PLAN BEFORE PRODUCTION SCALE | Before multiple prod consumers |

---

# 90. Updated Open Questions After Expert 03

In addition to prior open questions:

31. What exact platform packages must exist in pre-release form for the first TAYMEX slice?
32. Which internal artifact transport will prove independent consumption without source copying?
33. What minimum Wave 2 used-path checklist must be green before the first feature task begins?
34. Which Wave 2 items may remain deferred because the Products slice does not use them?
35. What evidence exists for the reported Wave 2 8/18/46 test counts?
36. What safe exception scenario will be used for the first exception drill?
37. Which security invariants will be explicitly proven non-waivable?
38. What is the acceptable product-code-visible UI layer count/abstraction tax in real use?
39. How will setting authoring be generated without making product code the source of truth?
40. Which mixed-direction/bidi examples are mandatory for AR UI proof?
41. What minimum canonical error/logging/trace contract is needed for the first backend endpoint?
42. Which performance/query instrumentation is supported by the actual selected ORM/data stack?
43. Which test harness utilities should be platform-provided in the first slice versus product-local?
44. What dependency/security update mechanism will eventually force urgent platform patch adoption?
45. Does the first TAYMEX slice require a public API versioning decision, or is compatibility enforcement sufficient?
46. Which deployment profile will eventually own backup/DR requirements and RPO/RTO?

---

# 91. Current Working Conclusion After Experts 01–03

The third review does **not** justify delaying TAYMEX until a larger foundation is finished.

It does justify making the first TAYMEX slice more rigorous.

The cumulative direction is now:

```text
1. Protect the governance trust root.
2. Make only the Wave 2 path used by the slice genuinely executable.
3. Start TAYMEX as the first independent consumer.
4. Consume real pre-release platform artifacts across the repository boundary.
5. Run a real agent through prepare → implement → fail/repair → verify.
6. Pull real settings/auth/audit/error/query controls as the slice needs them.
7. Exercise the exception path.
8. Back-test historical defects in parallel.
9. Measure friction and abstraction tax.
10. Let evidence, not roadmap enthusiasm, decide Wave 3/4 depth.
```

The key correction to Expert 03 is:

> **We should not build a test project to learn whether TAYMEX can start.  
> We should start a deliberately bounded part of TAYMEX in a way that is safe to break.**

This provides the strongest available combination of:

- real product pressure;
- limited blast radius;
- real agent behavior;
- real package boundaries;
- real governance;
- measurable platform friction.

Expert 03 also reinforces an important reporting discipline:

> “Designed” must never be reported as “implemented,” but “not yet implemented” must also never be misreported as “never considered.”

Both errors lead to bad decisions.

---

## Document Status

- Expert reviews included: **3**
- Current state: **Cumulative / Active**
- Main-plan changes: **not automatically applied from this document**
- Cross-expert convergence: **updated through Expert 03**
- Priority order: **updated through Expert 03**
- Next action after all expert reviews: consolidate accepted decisions into explicit roadmap/ADR amendments
- Any roadmap/ADR change must still be explicitly approved.

# 92. Expert 04 — Overall Evaluation

## 92.1 Overall value

Expert 04 is one of the strongest reviews so far because it largely avoids proposing a new platform layer and instead asks:

> “Does the current system have enough teeth to survive a real commercial task and an impatient coding agent?”

Its main value is in sharpening operational boundaries:

- platform maturity vs product readiness;
- local agent behavior vs merge-time enforcement;
- platform map vs immediate build scope;
- design-system architecture vs actual enforcement strength;
- reusable packages vs schema/data migration risk;
- Task Contract value vs Task Contract authoring authority;
- platform safety vs platform maintenance cost.

The review strongly converges with Experts 01–03 on one point:

> **No broad new platform wave should start before one bounded, real TAYMEX vertical slice closes the loop end-to-end.**

However, several claims still need correction or evidence discipline.

---

# 93. “TAYMEX is not ready” — Important Readiness Correction

### Expert claim

TAYMEX readiness is very low and the platform is “not ready yet.”

### Evaluation

**Partially accepted; the statement is too absolute.**

There are at least four different readiness questions:

| Readiness type | Current judgement |
|---|---|
| Ready for broad feature construction across many TAYMEX modules | **No** |
| Ready to claim production-grade platform guarantees | **No** |
| Ready to start a deliberately bounded validation slice | **Yes, after Priority-0 trust-root + used-path prerequisites** |
| Ready to use the slice as the mechanism that finishes/proves Wave 2 | **Yes — this is the roadmap intent** |

The Governance Implementation Roadmap explicitly defines the Wave 2 proof as:

> one admin CRUD vertical slice using approved UI, settings, auth, audit and i18n mechanisms.

Therefore the correct conclusion is:

> **TAYMEX is not ready for broad product development; TAYMEX is now required as the bounded validation environment.**

### Decision

Reject percentage/readiness scoring such as `3.5/10` as project truth.

Use explicit readiness categories and evidence.

---

# 94. “TAYMEX is the platform stabilizer”

### Expert proposal

Treat TAYMEX not merely as the first consumer, but as the platform stabilizer; capabilities not needed by current TAYMEX work should remain outside scope.

### Evaluation

**Strongly accepted with one correction.**

This is an excellent operating principle for preventing platform inflation.

### Correction

It should not become:

> “No capability can enter the platform until TAYMEX needs it and a second product proves it.”

The Platform Capability Map already allows platform admission when a capability is:

1. a universal engineering primitive with established industry value;
2. repeatedly evidenced; or
3. proven through later implementations.

Therefore:

- L0/L1 universal primitives may legitimately exist before a second product;
- optional L3 capabilities and speculative product abstractions should not be built merely because they appear on the map;
- TAYMEX current pressure should dominate near-term implementation sequencing.

### Adopted principle

> **For v0.x implementation priority, TAYMEX is the primary stabilizing consumer. Optional/general capabilities that do not reduce an observed TAYMEX risk or repeated engineering cost default to DEFER.**

---

# 95. Correct-by-Construction: Local Draft vs Merge Guarantee

### Expert observation

Correct-by-construction does not literally stop an agent from writing violating code in its editor/worktree.

### Evaluation

**Accepted — useful semantic correction.**

The meaningful guarantee is not:

> “Bad code can never be typed.”

It is:

> “Bad or unauthorized code is detected quickly and cannot become accepted repository state without an explicit governed exception.”

### Enforcement continuum

We should distinguish:

```text
Generation-time prevention
      ↓
Editor/local static feedback
      ↓
Fast local verification
      ↓
PR verification
      ↓
Required merge protection
      ↓
Release/deploy verification
```

### Local loop

The local loop should include the cheapest high-confidence controls:

- generated task/context;
- formatter/lint/typecheck;
- import/token rules;
- scope previews;
- affected unit/component tests;
- settings/terminology checks.

### Merge authority

The authoritative boundary remains:

- trusted verifier;
- required status;
- protected branch/ruleset;
- control-plane ownership.

### Important correction to Expert 04

A Git hook is **helpful feedback**, but it is not a trust boundary because hooks can normally be bypassed or removed locally.

CI/ruleset enforcement remains authoritative.

### Decision

Add **Local Feedback Latency** as a platform metric, not local unbypassability as an impossible goal.

---

# 96. Task Contract Authority and Generation

Expert 04 reinforces the biggest adoption/control issue also raised by Expert 02:

> Who writes the Task Contract and who may widen it?

### Evaluation

**Strongly accepted.**

The architecture already says the generator should ask relevant questions based on task type/risk, but this path is not yet fully proven.

### Required authority model

A coding agent must not be able to grant itself sensitive change authority.

Preferred flow:

```text
Backlog / intent
     ↓
Repository Truth + module ownership
     ↓
Task generator proposes conservative contract
     ↓
Low-risk deterministic fields auto-derived
     ↓
Human/owner approves meaningful expansion
     ↓
Implementation agent consumes approved contract
```

### Derivable fields

Where reliable, derive:

- target module;
- owned paths;
- protected paths;
- default forbidden change classes;
- known settings/components/contracts;
- default risk floor;
- default relevant obligations.

### Human/owner decisions

Require explicit approval for:

- new dependencies;
- migrations;
- public API change;
- platform/shared package change;
- architecture change;
- sensitive data/security changes;
- broad path expansion.

### Expansion policy

The system should log:

- original scope;
- requested expansion;
- requester;
- approver;
- reason;
- resulting risk escalation.

### Decision

Task Contract generation/approval remains a **first-slice success criterion**, not a future DX enhancement.

---

# 97. Reviewer / Implementer Separation

### Expert concern

The same model may act as Architect, Implementer and Reviewer in one session, leaving role separation as prose.

### Evaluation

**Valid concern, but physical model separation is not always required.**

The goal is **separation of authority and evidence**, not necessarily different AI vendors/models.

### Stronger model

For high-risk work:

- implementation produces a fixed diff/evidence package;
- review evaluates that artifact independently;
- reviewer cannot silently modify the implementation while “reviewing”;
- reviewer cannot approve its own governance exception;
- final merge authority remains external to the coding model.

A separate agent/session/context may improve independence.

For low-risk work, mandatory multi-agent choreography may create unnecessary cost.

### Decision

Adopt:

> **No self-approval of sensitive changes. Review authority is separated from write authority where risk justifies it.**

Do not mandate two different foundation models for every task.

---

# 98. UI Enforcement Depth: AST vs Pattern Matching

### Expert claim

Wave 2 UI enforcement may currently be vulnerable to simple textual/regex bypasses and should move to AST/import-graph/token-usage enforcement.

### Evaluation

**Directionally correct; current implementation mechanism must be verified before accepting the “regex” characterization.**

The accepted architecture already assigns:

- TS/JS UI/import restrictions → ESLint custom rules;
- component reuse → Storybook registry + static checks;
- architecture → Nx graph;
- design values → token rules.

These are intended to be structural/AST-aware, not prose-only regex checks.

### Actual open question

What does the **current executable Wave 2 implementation** use?

Until implementation evidence is inspected, do not claim either:

- “UI enforcement is robust AST-based,” or
- “UI enforcement is only regex.”

### Required red-team cases

The UI governance suite should eventually include attempts such as:

- aliased native primitives;
- `React.createElement('button')`;
- indirect/import re-export of forbidden primitives;
- raw styles through variables;
- dynamically assembled classes;
- raw CSS file escape;
- inline SVG/raw visual tokens;
- local component clone with different name but canonical responsibility.

### Principle

Use deterministic AST/import/module-boundary checks where semantics are reliably detectable.

Do not claim semantic duplicate-component detection beyond what evidence supports.

### Decision

Add **UI Governance Bypass Corpus** to the broader Governance Regression Corpus.

---

# 99. Backend Runtime Topology — Genuine Open Decision

### Expert concern

Running Next.js plus NestJS/Fastify plus the rest of the platform may create unnecessary early operational and cognitive complexity.

### Evaluation

**This is a genuine decision point worth stopping for.**

The technology research identified NestJS + Fastify as a **strong candidate**, but the currently located accepted frontend ADR only fixes the web baseline. A dedicated accepted backend-runtime topology ADR has not been found in this review.

Therefore the question should not be silently treated as settled.

### Decision required before the first backend-bearing slice

Compare at least:

### Option A — Next.js full-stack/modular server path
Pros:
- fewer runtimes/deployables;
- lower early operational burden;
- simpler first consumer.

Risks:
- tighter frontend/backend coupling;
- some domain/service boundaries may become less explicit;
- future extraction may cost more.

### Option B — Next.js web + NestJS/Fastify API
Pros:
- explicit service/API boundary;
- OpenAPI-first separation;
- potentially cleaner reusable backend foundation;
- easier independent service evolution.

Risks:
- two runtime applications/deployment concerns immediately;
- more auth/session/CORS/observability integration;
- more local/CI complexity.

### Decision rule

Do not choose separate Nest API merely because “future services may need it.”

Do not choose Next-only merely to minimize file count.

Select based on the first TAYMEX slice’s real requirements:

- deployment model;
- independent API consumers;
- background processing;
- auth/session architecture;
- scaling boundaries;
- team/agent ergonomics;
- domain complexity;
- expected extraction pressure.

### Important invariant

Whichever topology is selected:

- contracts/types remain explicit;
- domain boundaries remain modular;
- runtime boundary validation exists;
- repository truth can inspect the chosen stack.

### Decision

**Add Backend Runtime Topology Decision to pre-slice critical decisions if the chosen slice includes a backend API.**

This is a new high-value point from Expert 04.

---

# 100. Settings v1: Full Semantic Model vs Incremental Implementation

### Expert recommendation

Do not implement all setting categories/resolution policies/lifecycle tooling immediately.

### Evaluation

**Accepted as an implementation strategy, not as an ADR rollback.**

ADR-004’s semantic model is justified by known failure modes.

But implementation can be demand-driven.

### Correct v0.x approach

Keep the full canonical model in architecture, but implement only the strategies required by real first-slice settings plus the safety floor.

Example first-slice minimum may include:

- canonical typed registry;
- project/runtime scope(s) actually used;
- `OVERRIDE` where needed;
- `NO_OVERRIDE` / invariant behavior;
- permission metadata;
- effective resolver;
- provenance;
- hardcode prevention;
- consumer declaration;
- audit/concurrency where runtime writes occur.

Do not implement `MERGE`, `FLOOR`, `CEILING`, `STRONGEST`, flag evaluation, emergency override, etc. merely to complete a matrix if the slice does not exercise them.

### But

When a security policy requires floor/ceiling semantics, implement it correctly rather than simulating it with ordinary override.

### Decision

**Retain full ADR semantics; implement resolution classes incrementally from real settings.**

This is progressive implementation, not semantic simplification.

---

# 101. Visual Regression Baseline Governance

Expert 04 adds operational detail that is easy to overlook.

### Valid concerns

- who approves baseline changes;
- where baselines live;
- CI OS/font/rendering normalization;
- font version drift;
- browser version drift;
- accidental “approve all” behavior;
- snapshot explosion.

### Evaluation

**Accepted — new operational policy needed before visual tests become merge-critical at scale.**

### Baseline governance should define

- canonical CI browser/runtime image;
- pinned/controlled fonts available in CI;
- baseline storage/versioning;
- ownership/approval for shared UI baseline changes;
- how product-page baselines differ from component baselines;
- intentional update workflow;
- affected-only PR screenshots;
- broader scheduled/release suites;
- flake/retry policy;
- baseline changes included visibly in review evidence.

### Principle

A screenshot baseline is not truth by itself.

It is an approved reference artifact tied to:

- component/page version;
- browser/environment;
- locale/theme context.

### Decision

Add **Visual Baseline Governance** to the used Wave 2 path before screenshot failures become required merge gates in TAYMEX.

---

# 102. Arabic Typography and Mixed-Script Quality

Expert 04 notes Arabic font/shaping risk.

### Evaluation

**Accepted as a real UI quality concern, partly already represented by the L2 typography/font registry.**

A screenshot can technically “pass” while text remains poor in:

- shaping;
- weight selection;
- line height;
- numeral presentation;
- Arabic/Latin mixed labels;
- URL/email/code strings;
- truncation.

### First-slice representative tests

Include realistic content such as:

- Arabic product name + Latin model code;
- Arabic text + currency/value;
- Turkish/English + Arabic entered content where applicable;
- long Arabic table/form labels;
- numbers with units.

### Decision

Do not create a universal Arabic typography framework.

Prove the chosen font/token stack with representative TAYMEX content.

---

# 103. Supply-Chain Security

### Expert observation

Dependency security should arrive early, particularly because framework security patches can be urgent.

### Evaluation

**Correct implementation priority; not a new design gap.**

The Quality Gate Matrix already includes:

- `SEC-004` secret/dependency scanning;
- `REL-001` release/SBOM/provenance checks.

The distribution ADR also specifies controlled update PRs and immediate surfacing of security fixes.

### Actual gap

Execution/proof is still pending in real consumer CI.

### First-consumer minimum

Before external/production exposure:

- lockfile committed;
- no uncontrolled `latest`;
- dependency vulnerability scanning;
- secret scanning;
- controlled update automation/visibility;
- urgent security-patch path.

SBOM/signing/provenance depth may remain release-stage unless required sooner.

---

# 104. Data Handling Baseline — New Cross-Cutting Gap

Expert 04 notes that technical security discussion has more depth than lifecycle/privacy handling.

### Evaluation

**Partially accepted as a genuine cross-cutting gap.**

The architecture already includes:

- sensitive-data handling/redaction;
- audit;
- security delta for PII.

But a minimal data-lifecycle baseline deserves explicit treatment independent of any specific GDPR/KVKK claim.

### Platform-level minimum concepts

Where personal/sensitive data exists:

- data classification tag/metadata;
- log masking/redaction;
- access/audit expectations;
- retention owner;
- deletion/anonymization behavior where required by product/legal policy;
- secret/PII exclusion from agent context where possible.

### Important boundary

Do not create a universal legal-compliance engine.

The exact retention, erasure and legal-basis obligations remain jurisdiction/product decisions.

### Decision

Add **Data Handling Baseline** to security/privacy design before real sensitive user data is introduced.

---

# 105. Money and Units — Especially Relevant to TAYMEX

### Expert observation

A solar product can fail catastrophically through unit mistakes (`W` vs `kW`) even if all UI linting passes.

### Evaluation

**Strongly accepted.**

The Capability Map already lists broadly useful money/unit primitives in L1.

For TAYMEX, unit correctness is also a domain concern.

### Required separation

Platform may provide:

- quantity/unit type primitives;
- serialization/validation helpers;
- formatting helpers.

TAYMEX domain owns:

- solar-specific quantities;
- allowed conversions;
- engineering formulas;
- domain invariants.

### Example risk classes

- W / kW;
- Wh / kWh;
- V / A;
- Ah;
- inverter rating;
- battery usable vs nominal capacity;
- panel power vs daily energy production.

### Decision

The first solar-calculation slice must use typed quantities/validated units rather than free-form strings/numbers.

This is separate from the initial admin Products slice unless solar calculation is included there.

---

# 106. Public Web / SEO vs Admin App

### Expert observation

TAYMEX is not only an authenticated admin shell; the product may include public commerce/content/SEO needs.

### Evaluation

**Correct product-scope reminder, but not a reason to expand the first platform slice.**

The Capability Map already classifies CMS/public content/SEO as optional L3 concerns.

### Decision

Keep two truths separate:

1. **First platform-validation slice** may be admin Products CRUD because it stresses reusable foundation.
2. **TAYMEX product roadmap** still needs public storefront/content/SEO architecture when that work begins.

Do not let the admin AppShell become the assumed architecture for every future public page.

Do not build a generic CMS now.

---

# 107. Identity and Notification Minimum

Expert 04 argues that email/password flows will be needed early.

### Evaluation

**Partly accepted.**

Identity/account and notification contracts are already L2/L1 concerns.

However, the first validation slice should not automatically expand to:

- registration;
- email verification;
- password reset;
- SMS;
- MFA;

unless its acceptance path needs them.

### Preferred approach

For the first slice, choose the smallest real identity path that proves:

- authenticated user;
- authorization;
- session/identity boundary;
- audit actor.

When user self-service flows become part of TAYMEX, add:

- password lifecycle;
- verification;
- notification provider;
- localized templates.

### Decision

Do not use Keycloak merely to prove identity.

Do not overbuild self-service identity before product need.

---

# 108. i18n Foundation vs Product Language Profile

### Expert observation

The platform should not hardcode AR/TR/EN as a global invariant.

### Evaluation

**Accepted and already aligned with architecture intent.**

The platform owns generic i18n/localization mechanisms.

TAYMEX profile chooses:

- Arabic;
- Turkish;
- English.

Other products may choose different locale sets.

### Decision

Represent enabled locales at product/profile level.

Governance may require RTL tests only when an enabled RTL locale is affected.

---

# 109. Documentation Bloat Risk on the Platform Itself

Expert 04 points out that platform documentation is starting to grow.

### Evaluation

**Strongly accepted.**

This is an important self-application test.

The platform must not reproduce Harbuk’s audit-document explosion.

### Documentation authority hierarchy

Retain:

- ADR → why/decision;
- Manifest/registry/schema → machine truth;
- code/tests → implementation truth;
- generated evidence → verification;
- concise generated/reference docs → discovery.

Avoid:

- repeated audit novels;
- `final-v2-resolved` style copies;
- duplicate checklists representing the same rule.

### Decision

Apply documentation-location/naming governance to ENGINEERING_PLATFORM itself before the corpus grows substantially.

---

# 110. Metrics Are Designed but Not Yet Measured

Expert 04 correctly notes that success metrics have been proposed but not yet collected.

### Evaluation

**Accepted — implementation timing is now.**

The Roadmap already defines first governance metrics.

### Metrics to start with the first real slice

#### Safety/value
- scope violations;
- assumptions blocked before code;
- duplicate settings/components prevented;
- security issues caught before merge;
- human-review escaped defects;
- historical-defect coverage.

#### Friction
- task preparation time;
- fast-gate duration;
- PR-gate duration;
- false-positive rate;
- exception count;
- manual rule reminders;
- agent correction loops;
- generator vs manual construction time.

#### Maintainability
- platform changes required per product feature;
- shared-package upgrade time;
- baseline update frequency;
- governance-rule maintenance time.

### Decision

A slice without measured friction/value is incomplete as a platform experiment.

---

# 111. Numeric Maturity Scores and “30–40% Has Teeth”

Expert 04 provides numerical ratings such as:

- governance implementation 5/10;
- TAYMEX readiness 3.5/10;
- “30–40% of solutions have teeth.”

### Evaluation

**Do not adopt these numbers as evidence.**

They are useful rhetorical summaries but lack:

- denominator;
- weighting model;
- capability inventory methodology;
- risk weighting;
- proof definition.

### Replacement

Continue using maturity states:

```text
DESIGNED
REGISTERED
IMPLEMENTED
INTEGRATED
ENFORCED_IN_REAL_CONSUMER
PROVEN_WITH_REAL_AGENT
PRODUCTION_PROVEN
```

Where useful, compute evidence-based coverage only after the historical back-test and slice measurements.

---

# 112. Strong Cross-Expert Convergence After Experts 01–04

Four independent reviews now converge on the same strategic boundary.

## 112.1 No broad new wave before real slice proof

All four experts warn against continuing horizontal foundation expansion without a real consumer.

### Decision

**Confirmed.**

No L3/general capability expansion before the first real validation loop closes unless a critical universal security/runtime requirement blocks the slice.

## 112.2 TAYMEX must now be the real validation consumer

- Expert 01: move immediately to real vertical slice.
- Expert 02: real consumer + historical coverage.
- Expert 03: real agent/consumer proof.
- Expert 04: one value loop before further expansion.

### Decision

**Confirmed.**

No separate synthetic product is required.

## 112.3 Structural governance is ahead of functional/runtime proof

Repeated concern:

- settings resolver;
- auth/authz;
- query/data behavior;
- functional completeness;
- repository truth;
- concurrency/idempotency;
- package/data migration.

### Decision

These are the major proof surfaces of the next stage.

## 112.4 Control-plane/merge enforcement is non-negotiable

The experts increasingly reinforce:

- trusted verifier;
- protected task contracts;
- required status;
- owner approval;
- no self-authorized scope.

### Decision

Still **Priority 0**.

## 112.5 Governance must remain cheaper than bypass

Repeated through:

- task contract authoring;
- fast-loop latency;
- generator ergonomics;
- abstraction tax;
- visual flakiness;
- false positives.

### Decision

Platform ergonomics is now a formal correctness/adoption dimension.

---

# 113. New or Strengthened Decisions From Expert 04

The following points materially improve the cumulative plan:

1. **Readiness categories** instead of “TAYMEX ready/not-ready.”
2. **TAYMEX as stabilizing consumer** for near-term platform scope.
3. **Local feedback vs merge enforcement** distinction.
4. **Task Contract expansion authority model**.
5. **Risk-based reviewer authority separation**, not necessarily different models.
6. **UI governance bypass corpus**.
7. **Backend Runtime Topology Decision** before backend-bearing slice work.
8. **Incremental implementation of Settings resolution classes** while retaining the full ADR model.
9. **Visual Baseline Governance**.
10. **Representative Arabic typography/mixed-script proof**.
11. **Data Handling Baseline** before sensitive data.
12. **Typed units as a TAYMEX correctness mechanism**.
13. **Product/public-web needs must not be confused with admin platform validation scope**.
14. **Apply anti-document-bloat rules to ENGINEERING_PLATFORM itself**.
15. **Begin collecting actual governance metrics during the first slice**.

---

# 114. Expert 04 Claims Requiring Correction or Rejection

1. **“TAYMEX is not ready.”**  
   - Correct for broad/production development.  
   - Incorrect if used to postpone the bounded validation slice.

2. **“Any capability not required by TAYMEX must stay out until second evidence.”**  
   - Too absolute. Universal L0/L1 primitives may be admitted by established engineering value; speculative L3 implementation remains deferred.

3. **“Correct-by-construction should stop violations in the editor.”**  
   - Not required as an absolute guarantee. Fast local detection + non-bypassable merge is the realistic target.

4. **“UI rules are currently regex/text-based.”**  
   - Not accepted without implementation evidence. Architecture intends ESLint/static structural enforcement. Red-team the actual implementation.

5. **“All seven settings categories/resolution policies should be cut from v1 architecture.”**  
   - No. Retain semantic model; implement only required policies incrementally.

6. **“NestJS + Fastify is an accepted mandatory architecture.”**  
   - Current located evidence shows it as a strong candidate, not a dedicated accepted backend-topology ADR. Decide explicitly before use.

7. **“Git hook can close enforcement.”**  
   - Hook improves feedback but cannot replace protected CI/ruleset authority.

8. **Numerical maturity/readiness scores.**  
   - Useful opinion only; not project evidence.

9. **“30–40% of solutions have teeth.”**  
   - Unsupported quantitative claim.

10. **“Data/privacy was entirely absent.”**  
    - Sensitive-data handling/redaction and PII security deltas already exist; lifecycle/retention deserves additional explicit baseline.

---

# 115. Updated Priority Order After Experts 01–04

## P0 — Trust Root / Merge Authority

- trusted verifier;
- trusted base;
- protected governance paths;
- required status checks;
- CODEOWNERS/rulesets;
- governance regression corpus;
- least-privilege CI.

## P1 — Critical Pre-Slice Decisions

Only decisions that block implementation:

- backend runtime topology if the slice has backend API;
- first pre-release platform package boundary;
- task-contract generation/approval authority;
- enabled TAYMEX locale/settings scope profile.

No broad new ADR program.

## P2 — Make the Used Wave 2 Path Executable

- actual selected Panda/runtime integration;
- canonical component package/catalog;
- consumer UI static rules;
- representative responsive/RTL/a11y;
- visual baseline governance for tests that will block.

## P3 — Start Real Independent TAYMEX Vertical Slice

Bounded Products/admin slice remains the leading candidate.

It is allowed to expose platform defects.

## P4 — Real Agent-in-the-Loop + Task Contract Ergonomics

Run:

```text
intent
→ generated contract
→ approved scope
→ prepare
→ Codex implement
→ verify fail/pass
→ constrained repair
→ final evidence
```

Measure preparation and feedback latency.

## P5 — Prove Artifact Boundary

TAYMEX consumes real versioned/pre-release platform artifacts, not platform source.

## P6 — Pull Critical Runtime/Functional Controls

As the slice uses them:

- auth/authz positive + negative;
- canonical errors;
- audit;
- pagination;
- validation;
- query instrumentation;
- idempotency/concurrency where relevant;
- structured logs/trace;
- data handling baseline.

## P7 — Complete the Settings Path Actually Used

- registry;
- generated typed access;
- resolver;
- provenance;
- scope/permission;
- hardcode prevention;
- consumer diagnostics;
- change propagation where runtime-writable.

Only implement additional resolution policies when real settings require them.

## P8 — Historical Defect Back-Test + Bypass Corpus in Parallel

- stratified defect sample;
- severity-weighted coverage;
- UI governance bypass cases;
- governance control-plane adversarial patches.

## P9 — Exercise Exception / Reviewer Authority

- safe exception drill;
- no self-approval;
- non-waivable invariant proof;
- owner expansion trail.

## P10 — Measure Before Expanding

Collect:

- defect coverage;
- false positives;
- gate times;
- contract authoring;
- agent corrections;
- abstraction tax;
- visual baseline churn;
- platform maintenance work.

Only then deepen Repository Truth/Wave 3/4 according to observed failures.

---

# 116. Updated Open Questions After Expert 04

47. Is NestJS/Fastify actually an accepted backend runtime decision or still a candidate?
48. What concrete TAYMEX requirement justifies a separate backend process if selected?
49. What is the smallest backend topology that still preserves required contracts and future evolution?
50. Which platform package(s) will be the first pre-release runtime artifacts consumed by TAYMEX?
51. What is the exact Task Contract expansion approval policy by risk tier/change class?
52. Which Task Contract fields can be safely derived automatically?
53. How will reviewer authority be separated from implementation authority for R3/R4 work?
54. What mechanisms do the current executable UI rules actually use: AST, import graph, textual scan, or a combination?
55. Which deliberate UI bypass patches must the regression corpus contain?
56. Which settings resolution classes are genuinely required by the first slice?
57. What is the canonical visual baseline environment (browser/OS/fonts)?
58. Who approves shared UI visual baseline changes?
59. What representative mixed Arabic/Latin content will be part of UI proof?
60. What minimum data-classification/retention/redaction rules are required before identity/customer data enters TAYMEX?
61. Which unit types must be compile/runtime-safe in the future solar calculator?
62. Which public storefront/SEO concerns belong to TAYMEX product roadmap versus reusable platform capability?
63. Which identity flows are truly required for the first validation slice?
64. What is the acceptable fast-loop latency on real developer/agent hardware?
65. What documentation naming/location rule will prevent ENGINEERING_PLATFORM itself from developing Harbuk-style audit-document proliferation?

---

# 117. Current Working Conclusion After Experts 01–04

The fourth expert does not reverse any central platform decision.

It strengthens the central transition:

> **Stop proving architecture by adding architecture. Start proving it through a bounded TAYMEX task.**

The cumulative position after four reviews is now more precise than any single expert’s recommendation:

### The platform is not “ready” in one binary sense.

It is:

- **not ready** for broad TAYMEX construction;
- **not ready** for production-grade confidence;
- **ready enough** to begin the deliberately bounded validation slice once Priority-0 trust-root and the used Wave 2 path are in place;
- **required** to use that slice to finish becoming ready.

The next stage should therefore avoid two opposite errors.

## Error A — Foundation perfectionism

Waiting until:

- all settings strategies;
- all UI patterns;
- all security gates;
- all performance tools;
- full Repository Truth;
- all L1/L2 packages;

are complete before TAYMEX starts.

This would defeat the evidence-first roadmap.

## Error B — Premature product scaling

Starting many TAYMEX features while:

- merge protection is not real;
- settings runtime is not proven;
- canonical UI can still be bypassed;
- package boundary is not real;
- agent workflow is not measured.

This would recreate Harbuk/SARH under a new stack.

## Adopted middle path

```text
Protect governance authority
        ↓
Resolve only true slice-blocking architecture decisions
        ↓
Make the used UI/runtime path executable
        ↓
Start bounded real TAYMEX slice
        ↓
Run Codex through real governed loop
        ↓
Let the slice pull missing platform mechanisms
        ↓
Measure safety + friction
        ↓
Expand only from evidence
```

The most valuable new phrase from Expert 04 is not “TAYMEX is not ready.”

It is the implied distinction:

> **The platform map is an option map, not a construction checklist.**

That should remain explicit throughout implementation.

---

## Document Status

- Expert reviews included: **4**
- Current state: **Cumulative / Active**
- Cross-expert convergence: **strong**
- Strategic direction: **stable**
- New major open decision: **backend runtime topology before backend-bearing slice**
- Main-plan changes: **not automatically applied from this document**
- Next step after remaining expert reviews: convert accepted cumulative decisions into explicit Roadmap/ADR/implementation-plan amendments.

# 118. Expert 05 — Overall Evaluation

## 118.1 Overall value

Expert 05 is primarily a **convergence and operational-governance review**.

It introduces fewer genuinely new architectural gaps than Experts 02–04, but it reinforces several risks that now have strong cumulative support:

- exception abuse;
- governance-tool complexity;
- false positives / false negatives;
- inconsistency between generation-time, local, CI and repair rules;
- project bootstrap/configuration drift;
- upgrade/compatibility risk;
- ownership and maintenance of the governance rules themselves.

Its most useful new framing is:

> **The governance system itself must be internally consistent and testable as a product.**

However, the review occasionally overstates current maturity by implying that “most previous failure causes are now under control.”

The correct cumulative wording is:

> **Most major historical failure classes are now represented in the architecture or governance model, but only a subset are executable and proven end-to-end.**

That distinction remains mandatory.

---

# 119. Exception Scope and Exception Debt

Expert 05 strongly reinforces exception risk.

### Evaluation

**Accepted and already high priority from Experts 02–04.**

The architecture already requires:

- explicit reason;
- narrow scope;
- approver;
- expiry;
- compensating control;
- non-waivable security invariants.

Expert 05 adds a useful operational dimension:

> Repeated exceptions can become a shadow architecture even when each exception is individually valid.

### New metric: Exception Debt

Track:

- number of open exceptions;
- age of exceptions;
- exceptions by rule;
- exceptions by module/project;
- renewal count;
- repeated identical exception reasons;
- exceptions with expired remediation;
- percentage of work requiring exceptions.

### Escalation rule

If the same rule receives repeated legitimate exceptions, do not normalize bypass automatically.

Review whether:

1. the rule is too broad;
2. the platform abstraction is wrong;
3. the product genuinely needs a supported extension point;
4. the exception should become a governed profile/configuration;
5. the rule should remain strict and the product behavior should change.

### Decision

Add **Exception Debt** to platform-health metrics.

This complements the previously adopted first-slice Exception Drill.

---

# 120. Governance Self-Consistency — New Explicit Requirement

Expert 05 warns that the platform now uses several enforcement technologies and phases:

- generators;
- CLI;
- Nx/project graph;
- ESLint/static rules;
- Semgrep;
- OPA/Conftest;
- Storybook/component truth;
- Playwright;
- CI/risk routing.

The risk is not merely that one tool is wrong.

The deeper risk is:

> **Two valid-looking tools may encode the same policy differently and produce contradictory outcomes.**

### Examples

- generator creates a file that scope policy rejects;
- module manifest permits a dependency that Nx boundary denies;
- task contract permits a change while risk router escalates it to a profile whose required gate cannot run;
- registry marks a setting valid while generated accessors or consumers disagree;
- UI generator emits a pattern that UI lint later rejects;
- local fast checks pass while required PR checks use a materially different rule definition.

### Evaluation

**Accepted — this is a useful explicit addition.**

The prior Governance Regression Corpus tests whether rules weaken.

This new concern tests whether **different enforcement representations agree**.

---

# 121. Single Policy Intent, Multiple Enforcement Adapters

Expert 05 suggests a “single automated rule reference.”

### Evaluation

**Accepted in principle, but not as “one policy engine for everything.”**

The platform has already chosen the strongest layer per rule:

- Nx for workspace/dependency boundaries;
- ESLint for TS/JS imports/syntax;
- Semgrep for cross-language code patterns;
- OPA/Conftest for structured manifests/policy routing;
- Playwright/axe for runtime/visual/accessibility evidence.

Trying to force every rule into a single engine would weaken enforcement.

### Better architecture

Use:

> **one canonical policy intent / rule registry, with tool-specific enforcement adapters where needed.**

A rule entry should identify at minimum:

```yaml
ruleId:
title:
riskClass:
policyIntent:
owner:
enforcementLayer:
implementedStatus:
blockingProfiles:
exceptionAllowed:
evidenceType:
testCorpus:
```

Where multiple tools represent the same invariant, they should reference the same stable `ruleId`.

### Example

```text
UI-RAW-COLOR-001
    policy intent: feature code must not introduce raw visual color values
    ESLint adapter: TS/JS style objects
    CSS adapter: CSS/static stylesheet scan
    visual evidence: optional regression signal
```

This prevents three undocumented versions of the same policy from drifting.

### Decision

Add **Canonical Rule Registry / Rule IDs** as the preferred anti-drift mechanism if current implementation does not already provide equivalent metadata.

Do not create a new universal policy engine.

---

# 122. Governance Conformance Suite

To operationalize self-consistency, introduce a bounded **Governance Conformance Suite**.

This is distinct from:

- unit tests for one rule;
- Governance Regression Corpus of known bypass patches.

### It should test cross-tool invariants such as:

1. A generator's valid output passes all mandatory governance checks.
2. Every blocking rule registered as `implemented` has an executable adapter.
3. No `planned` rule is required as if implemented.
4. Fast and PR profiles agree on shared deterministic rules.
5. A Module Manifest accepted by schema validation is compatible with Nx/project-boundary configuration.
6. Generated settings accessors correspond to canonical registry entries.
7. Generated component/pattern code complies with UI restrictions.
8. Risk escalation always selects a profile whose required gates exist.
9. Exception handling is interpreted consistently by verifier and merge evidence.
10. Rule metadata, ownership and documentation references are not stale.

### Decision

**Adopt incrementally.**

Start with invariants exposed by the first slice rather than building an exhaustive meta-platform test system upfront.

---

# 123. False Positives / False Negatives — Strong Convergence

Expert 05 again highlights:

- false positives that block legitimate work;
- false negatives that allow violations.

### Evaluation

**Accepted; already a first-class metric after Experts 01–04.**

The fifth review strengthens one additional point:

> Rule quality needs a maintained **accept/reject corpus**, not only individual examples.

### Per blocking rule where practical

Maintain:

- positive examples that must pass;
- negative examples that must fail;
- historical bypass cases;
- edge cases;
- exception behavior where allowed.

### Useful quality metrics

For rules with enough real data:

- false-positive rate;
- escaped violation count;
- exception rate;
- bypass/regression count;
- human reversals of gate decisions.

### Important caution

“False negative rate” is difficult to estimate directly because unseen violations are unknown.

Use proxies:

- defects found by human review after gates passed;
- historical back-test uncovered classes;
- red-team/bypass corpus;
- production escaped defects.

### Decision

No new platform wave required.

Integrate this into rule maintenance and first-slice measurement.

---

# 124. Project Bootstrap / Profile — Important New Operational Addition

Expert 05 asks how a new project receives a coherent platform configuration.

This is a real future adoption risk.

A new product may need to select/configure:

- platform packages/capabilities;
- locales;
- settings scopes;
- design tokens/theme;
- risk baseline;
- governance profiles;
- deployment profile;
- enabled optional capabilities;
- CI required checks;
- data/security posture.

If each project assembles these manually, platform drift begins at project creation.

### Evaluation

**Accepted.**

The platform should have a machine-readable **Project Profile / Bootstrap Manifest** rather than a long manual checklist.

### Example conceptual shape

```yaml
project:
  id: taymex
  platformVersion: 0.x

locales:
  enabled: [ar, tr, en]
  default: ar

settings:
  enabledScopes: [project, user]
  tenantScope: false

governance:
  baselineRisk: R2
  profiles:
    - fast
    - pr-standard

capabilities:
  identity: enabled
  settings: enabled
  ui: enabled
  audit: enabled
  search: disabled
  tenancy: disabled

deployment:
  profile: small
```

Exact schema should be derived from existing manifests/ADRs rather than invented as a parallel truth model.

### Bootstrap command

A future command may look like:

```text
platform create project
```

or equivalent generator workflow.

It should:

- generate conservative defaults;
- install only selected packages;
- generate CI/governance wiring;
- create initial manifests;
- validate compatibility;
- produce no speculative capabilities.

### Decision

For TAYMEX, implement only the **minimal project-profile/bootstrap metadata required for the real first consumer**.

Do not build a generic project wizard before the first slice.

---

# 125. Project Profile Must Not Duplicate Existing Truth

A bootstrap/profile mechanism creates a new risk:

> The platform may end up with project configuration repeated in several files.

Therefore the project profile must not independently duplicate:

- package manager truth;
- settings registry;
- module manifests;
- deployment secrets;
- CI truth.

### Preferred role

The profile should express **high-level enabled decisions**.

Generated or validated lower-level artifacts remain authoritative in their domains.

### Example

The profile may say:

```text
tenancy = disabled
```

but it should not duplicate every tenancy setting definition.

It may say:

```text
locales = ar,tr,en
```

while translation catalogs remain their own truth source.

### Decision

Treat Project Profile as **configuration intent / capability selection**, not a universal mega-config.

---

# 126. Post-Bootstrap Drift

Expert 05 correctly notes that governance does not stop at project creation.

A product may later:

- adopt a new platform capability;
- upgrade a package;
- migrate from a previously uncontrolled state;
- change its risk/security profile;
- enable tenancy/search/payments later.

### Evaluation

**Accepted.**

This reinforces the need for lifecycle operations:

```text
create
inspect
validate
upgrade
adopt capability
remove/replace capability
migrate legacy project
```

### But

Do not implement all commands now.

The first real lifecycle proof is:

> ENGINEERING_PLATFORM 0.x artifact → TAYMEX consumes it → one controlled platform update is applied successfully.

Broader legacy-adoption tooling comes only when a real legacy project is selected.

---

# 127. Rule Ownership and Governance Maintenance

Expert 05 notes that rules themselves need:

- owners;
- tests;
- living documentation;
- maintenance.

### Evaluation

**Strongly accepted.**

This is a natural extension of control-plane ownership.

Every blocking rule should eventually have:

- stable ID;
- owner;
- rationale;
- implementation location;
- enforcement status;
- test corpus;
- exception policy;
- last meaningful review/change;
- deprecation/supersession path.

### Rule lifecycle

Suggested lifecycle:

```text
proposed
→ experimental
→ implemented-nonblocking
→ blocking
→ deprecated
→ superseded/removed
```

A rule should not jump from idea to blocking without:

- test cases;
- acceptable precision;
- ownership;
- a repair path or actionable error message.

### Decision

Add **Rule Lifecycle & Ownership** to governance metadata.

This may share the Canonical Rule Registry proposed above.

---

# 128. Automated Checks Must Produce Actionable Failures

Tool complexity becomes bureaucracy when a failure only says:

```text
Policy violation.
```

### Required failure quality

For blocking rules, diagnostics should aim to provide:

- rule ID;
- what failed;
- file/symbol;
- why the rule exists;
- canonical alternative;
- generator/command if available;
- whether exception is allowed;
- owner/contact path for true blockers.

### Example

Bad:

```text
UI-001 failed.
```

Better:

```text
UI-001: Native <button> is not allowed in product feature code.
Use @platform/ui/Button.
If the shared component lacks the needed behavior, request a platform extension;
do not create a local canonical Button replacement.
```

### Decision

Add **Actionability of gate failures** to governance ergonomics metrics.

The correct path must not only be enforced; the failure must teach the recovery path.

---

# 129. Expert 05 Claim: “Most prior failure causes are under control”

### Evaluation

**Too optimistic as stated.**

A safer statement is:

> Most major historical failure classes have been identified and mapped to intended controls, but many controls remain designed, partial, or unproven on a real consumer.

Examples still not real-consumer proven include:

- deep Repository Truth;
- functional completeness enforcement;
- authorization negatives;
- concurrency/idempotency;
- settings runtime resolution;
- query/performance controls;
- shared package migration;
- control-plane merge authority in real repository rules;
- agent-in-the-loop governed feature delivery.

### Decision

Do not use “under control” unless the relevant capability is at least:

`ENFORCED_IN_REAL_CONSUMER`

and preferably proven by negative/bypass evidence.

---

# 130. Expert 05 and the Current Vertical Slice Decision

Expert 05 recommends:

- deliberate bypass scenarios;
- exception simulation;
- repair simulation;
- complexity monitoring.

### Evaluation

**Accepted, with current sequencing retained.**

These should be incorporated into the first real TAYMEX validation campaign rather than performed as a separate large pre-product program.

### The slice now has three complementary test modes

#### A. Normal delivery
Agent attempts to build the feature correctly.

#### B. Red-team governance
Seed known unauthorized/bypass patches.

#### C. Repair/exception drill
Exercise:

- one governed repair;
- one safe exception;
- one blocked non-waivable case.

This gives stronger evidence than only a happy-path CRUD implementation.

---

# 131. Cross-Expert Convergence After Experts 01–05

The fifth review increases confidence that the central strategic decision is stable.

## 131.1 Real slice before broad expansion

All five reviews converge.

**Decision: CONFIRMED.**

## 131.2 Control-plane and rule authority

Experts 01, 02, 04 and 05 strongly reinforce:

- protected governance;
- clear approver;
- rule ownership;
- no self-expansion.

**Decision: CONFIRMED / P0.**

## 131.3 Platform ergonomics is a survival condition

Experts 01, 02, 04 and 05 emphasize:

- false positives;
- task authoring cost;
- tool complexity;
- fast feedback;
- actionable failures.

**Decision: CONFIRMED.**

## 131.4 Governance itself requires tests

Experts 02 and 05 explicitly reinforce:

- regression corpus;
- accept/reject corpus;
- self-consistency.

**Decision: CONFIRMED.**

## 131.5 Upgrades remain a deferred but unavoidable proof area

All five experts raise upgrade/distribution risk in some form.

**Decision remains:**

- prove versioned/pre-release artifact consumption in first slice;
- perform meaningful upgrade drill before second major consumer;
- define shared schema migration policy before persistent shared schema becomes production-critical.

---

# 132. Expert 05 — New Decisions Worth Carrying Forward

The genuinely useful additions/reinforcements are:

1. **Exception Debt metric** — repeated waivers are a platform signal.
2. **Governance Self-Consistency** — tools must not disagree on the same policy.
3. **Canonical Rule IDs / Rule Registry** — one policy intent, multiple enforcement adapters.
4. **Governance Conformance Suite** — generator/manifests/rules/profiles agree end-to-end.
5. **Project Bootstrap/Profile** — project creation/configuration should be generated and validated.
6. **Post-bootstrap lifecycle** — capability adoption and upgrade must be governed.
7. **Rule Lifecycle & Ownership** — blocking rules themselves are maintained assets.
8. **Actionable gate diagnostics** — failures must point to the golden recovery path.

---

# 133. Expert 05 Claims Requiring Correction

1. **“The current environment moved fully from written rules to automatically enforced constraints.”**  
   - Too broad. The transition is real, but many controls remain planned/partial.

2. **“The agent is forced to use settings/components in all cases.”**  
   - Not yet proven on a real consumer; some classes have executable constraints, others remain intended controls.

3. **“The drift problem is solved much better.”**  
   - Directionally true. “Solved” is not yet justified until consumer proof exists.

4. **“Most previous failure causes are under control.”**  
   - Replace with: identified, mapped, and partially controlled.

5. **“There should be only one automated rules reference.”**  
   - Replace with: one canonical policy intent/rule ID, implemented at the strongest appropriate enforcement layers.

6. **“Project bootstrap should include a checklist.”**  
   - Prefer machine-readable profile + generated/validated configuration over a human checklist as primary mechanism.

---

# 134. Updated Priority Order After Experts 01–05

The fifth expert does **not** justify changing the top-level sequence.

It adds detail to existing priorities.

## P0 — Governance Trust Root

- trusted verifier/base;
- protected control plane;
- required merge status;
- CODEOWNERS/rulesets;
- governance regression corpus;
- rule ownership.

## P1 — Slice-Blocking Decisions Only

- backend runtime topology;
- pre-release artifact boundary;
- Task Contract authority/generation;
- minimal TAYMEX project profile.

## P2 — Used Wave 2 Path

- real styling/runtime;
- canonical UI components;
- consumer enforcement;
- responsive/RTL/a11y;
- visual baseline governance.

## P3 — Real TAYMEX Vertical Slice

TAYMEX itself remains the validation consumer.

## P4 — Agent-in-the-Loop + Actionable Governance

Measure:

- preparation time;
- local feedback time;
- failure clarity;
- repair loops;
- manual interventions.

## P5 — Versioned Artifact Consumption

Prove the platform/product boundary.

## P6 — Functional/Runtime Controls Pulled by the Slice

- auth/authz;
- validation;
- pagination/query evidence;
- audit/errors/logs;
- idempotency/concurrency where relevant;
- data handling baseline.

## P7 — Settings Path

Implement only settings semantics actually required while preserving the full canonical model.

## P8 — Historical Back-Test + Governance/BYPASS Corpus

Also begin Rule IDs/Rule Registry where it reduces duplication.

## P9 — Exception / Repair / Conformance Drills

- exception debt tracking;
- rule conformance;
- generated output passes governance;
- one repair loop.

## P10 — Measure and Reprioritize

Only then decide the depth of:

- Repository Truth;
- Impact Graph;
- broader Wave 3/4;
- platform doctor;
- upgrade automation;
- reference consumers.

---

# 135. Updated Open Questions After Expert 05

66. Does the current governance implementation already have a canonical machine-readable rule registry, or are rule IDs/statuses distributed across several files?
67. Which rules currently have duplicated representations across CLI/Nx/ESLint/Semgrep/OPA?
68. Can a generator currently emit code that later fails the platform’s own governance rules?
69. What is the smallest Governance Conformance Suite required before the first TAYMEX slice?
70. What threshold of repeated exceptions should trigger platform-rule/abstraction review?
71. What fields belong in the minimal TAYMEX Project Profile without duplicating lower-level truth?
72. Which project bootstrap steps can be fully generated and which require owner decisions?
73. What is the canonical lifecycle for a governance rule from proposal to blocking to deprecation?
74. Which current blocking rules lack explicit owners or actionable remediation messages?
75. How will the platform detect drift between rule metadata and the actual implementation adapter?
76. What is the first safe capability-upgrade lifecycle test to run inside TAYMEX after initial package consumption?
77. How will exception usage, false positives and rule-maintenance cost be surfaced in platform-health reporting?

---

# 136. Current Working Conclusion After Experts 01–05

Expert 05 does not change the strategic direction.

It improves one crucial layer:

> **The platform must govern not only product code, but also the consistency and lifecycle of its own governance mechanisms.**

The cumulative architecture should now be understood as three nested systems:

```text
1. Product governance
   - does TAYMEX follow approved architecture/settings/UI/security rules?

2. Agent governance
   - can the coding agent widen scope, guess, bypass or self-approve?

3. Governance governance
   - are the rules themselves consistent, owned, tested, versioned and non-contradictory?
```

The third layer must remain **small and evidence-driven**.

Otherwise we create infinite recursion:

```text
platform
→ governance for platform
→ governance for governance
→ governance for governance tests
```

The correct stopping rule is:

> Build only enough meta-governance to protect the trust root, detect regressions, and keep rule representations consistent.

The first TAYMEX slice therefore remains the central next milestone.

Expert 05 strengthens the slice acceptance model with:

- project bootstrap/profile validation;
- rule self-consistency;
- exception debt;
- actionable failures;
- normal + red-team + repair/exception test modes.

The key principle after five reviews is now highly stable:

> **Do not add another large platform capability until one real TAYMEX slice demonstrates that the governed path is simultaneously safer, understandable, and fast enough to use.**

---

## Document Status

- Expert reviews included: **5**
- Current state: **Cumulative / Active**
- Cross-expert convergence: **very strong**
- Strategic direction: **stable**
- New Expert 05 additions: governance self-consistency, canonical rule IDs, project bootstrap/profile, exception debt, rule lifecycle/ownership
- Main-plan changes: **not automatically applied from this document**
- Next step after remaining expert reviews: consolidate accepted cumulative decisions into explicit Roadmap/ADR/implementation-plan amendments.

# 137. Expert 06 — Overall Evaluation

## 137.1 Overall value

Expert 06 is one of the strongest evidence-discipline reviews so far.

Its strongest contributions are:

- explicitly distinguishing evidence from historical audit reports versus verified source/runtime evidence;
- emphasizing that current Repository Truth is still incomplete for the most dangerous assumptions: real models, fields, API contracts and database schema;
- identifying adapter contract tests as the mechanism that makes `REPLACE` a governed extension mode rather than a disguised fork;
- making **Agent Usability Testing** an explicit platform-quality dimension;
- raising **platform engineering supply-chain continuity / DR** as distinct from product runtime availability;
- reinforcing that deprecation/versioning/migration policy must become executable before shared packages become widely consumed;
- reminding us that “mapped to a control” is not equivalent to “under control.”

Its major problem is sequencing.

The recommendation:

> “Complete remaining Wave 2 + all Wave 3 before any TAYMEX commercial feature”

is too broad and conflicts with the accepted implementation roadmap.

The roadmap explicitly says:

> build the minimum enforceable safety net, prove it with one vertical slice, then deepen controls that demonstrate value.

Wave 2 itself is proven by one real admin CRUD vertical slice; Wave 3 then deepens Repository Truth and contract safety.

Therefore Expert 06 correctly identifies **what must become true**, but places too much of it **before** the very consumer slice intended to drive and prove it.

---

# 138. Historical Audit Evidence and Confirmation Bias

Expert 06 adds an important methodological qualification.

Historical Harbuk/SARH findings often come from:

- audit reports;
- re-audits;
- repair reports;
- agent-generated classifications;
- documentation packages without complete source code.

### Evaluation

**Strongly accepted.**

These historical documents are highly valuable for:

- detecting repeated failure families;
- understanding process failure;
- identifying candidate controls;
- building defect taxonomy/back-tests.

But they are weaker evidence for claims such as:

- exact final defect count;
- exact severity distribution;
- “89/89 fixed”;
- final implementation correctness.

### Required evidence labels for the historical defect corpus

Each historical defect should eventually carry evidence provenance such as:

```text
SOURCE_CODE_VERIFIED
TEST_VERIFIED
RUNTIME_VERIFIED
AUDIT_REPORT_ONLY
REPAIR_REPORT_ONLY
DUPLICATE/UNCERTAIN
```

### Back-test implication

Historical defects should not all receive identical weight.

A critical defect with verified source/test evidence should influence governance priorities more strongly than a low-confidence audit-only finding.

### Decision

Add **Evidence Confidence** to the historical Defect Taxonomy and back-test model.

This directly reduces confirmation bias.

---

# 139. Expert 06 and the Rule of Three / Reference Applications

### Expert concern

If TAYMEX drives platform evolution, the platform may become biased toward TAYMEX. Expert 06 suggests validating platform capabilities against `reference-minimal` and `reference-showcase`, potentially two contexts before promotion.

### Evaluation

**Concern accepted; proposed timing partially rejected.**

The Platform Capability Map already avoids TAYMEX overfitting through an admission rule:

A capability may enter the platform when it is:

1. a universal engineering primitive with established value; or
2. repeatedly evidenced; or
3. proven by second/third implementation.

Reference applications are explicitly placed later in the roadmap, after TAYMEX proves the model.

### Important correction

A synthetic reference application is not equivalent to a second independent product domain.

It can prove:

- packaging;
- backward compatibility;
- configuration combinations;
- minimal/full composition;
- build/conformance stability.

It cannot prove that an abstraction is genuinely domain-neutral in the same way a second real product can.

### Decision

Use reference apps later as **compatibility/conformance consumers**, not as a prerequisite for every early platform capability.

For early v0.x:

- universal L0/L1 primitives may be admitted based on established value;
- TAYMEX-driven L2 patterns remain `experimental/candidate` until broader evidence;
- optional L3 abstractions should not become stable based only on TAYMEX.

---

# 140. REPLACE Must Be Proven by Contract Tests

Expert 06 raises a high-value point:

> `REPLACE` without contract tests can become “forking behind an interface.”

### Evaluation

**Strongly accepted.**

The Platform Capability Map already specifies:

> external vendor integration → port + adapter + contract tests

and L1 includes contract-test harnesses.

But the runtime mechanism is not yet proven.

### Required rule

Any capability that supports `REPLACE` must define:

1. stable contract/port;
2. conformance/contract-test suite;
3. required behavior and failure semantics;
4. version compatibility expectations;
5. test fixtures;
6. non-functional obligations where relevant.

### Examples

A replacement provider may need to prove:

- notification send/failure/retry semantics;
- storage read/write/delete/metadata semantics;
- payment/idempotency/failure mapping;
- search pagination/filter contract;
- identity/session adapter semantics.

### Decision

**Do not build a generalized adapter conformance framework before the first replaceable capability.**

When the first actual `REPLACE` surface appears, its contract suite is mandatory before replacement is considered supported.

This is now a platform capability-admission criterion.

---

# 141. Repository Truth — Expert 06’s Strongest Implementation Critique

### Expert claim

Current Repository Truth is useful but does not yet prevent dangerous assumptions about:

- real model names;
- real fields;
- method signatures;
- API routes/contracts;
- DB schema/migrations;
- permissions/events.

### Evaluation

**Strongly accepted.**

This is exactly what the authoritative Wave 0–1 verification report admits: full symbol/signature truth, OpenAPI/ORM adapters and expanded consumer truth are intentionally not claimed yet.

Wave 3 explicitly introduces:

- symbol/signature index;
- route/OpenAPI registry;
- ORM/database schema index;
- permission/event catalogs;
- generated clients/types;
- OpenAPI breaking-change gate;
- runtime schemas.

### Key disagreement: sequencing

Expert 06 concludes:

> Complete Wave 3 before any TAYMEX feature.

That contradicts the accepted roadmap.

The vertical slice is the Wave 2 proof **before** generalized Wave 3 depth.

### Adopted compromise: Slice-Scoped Repository Truth

The first TAYMEX slice must never be allowed to rely on unverified guessed product contracts.

For each truth category used by the slice:

```text
If truth is already machine-derived → consume it.
If truth adapter is needed to implement the slice safely → build the minimal adapter now.
If truth cannot be established → BLOCK, do not guess.
```

### Example

If Products CRUD defines a `Product` model during the slice:

- the model/schema is introduced under the governed task;
- generated/typed contract becomes truth immediately;
- later feature work may not invent `product.status` if canonical truth says `product.state`.

We do **not** need a universal symbol/ORM/OpenAPI index for every future module before creating the first Product model.

### Decision

**Implement Repository Truth incrementally through the real slice; generalize it in Wave 3 from observed needs.**

---

# 142. “Product.status vs Product.state” — Correct Risk, Wrong Prerequisite

Expert 06 uses an excellent concrete failure case:

> The platform should prevent an agent from assuming `product.status` when the actual field is `product.state`.

### Evaluation

**Correct acceptance target.**

But the prerequisite is not:

> “Complete all Wave 3.”

The actual acceptance condition is:

> Once the canonical Product contract exists, the agent must receive/use machine-derived Product truth and invalid field assumptions must fail type/schema/conformance checks.

This can be proven inside the first slice.

### Recommended deliberate negative case

After the canonical Product contract is created:

1. create a temporary/red-team change using a non-existent field;
2. confirm generated types/schema/lint/build/contract check rejects it;
3. preserve the failure as regression evidence.

### Decision

Add **Model/Field Assumption Negative Test** to the first-slice governance campaign.

---

# 143. Multi-tenancy — Expert 06 Repeats a False Urgency

### Expert claim

Multi-tenancy should be formally decided before building any capability that handles user data because introducing tenancy later may require rebuilding capabilities.

### Evaluation

**The concern is valid; the proposed urgency is too broad.**

The accepted Capability Map already defines:

- organizations/tenancy as **L3 optional reusable capability**;
- settings scopes as environment/project/tenant/user **where permitted**;
- project profiles select capabilities.

Therefore the architecture is not assuming tenancy universally.

### Cumulative decision retained

For TAYMEX v1:

- `tenant` capability/scope is explicitly disabled unless product requirements establish it;
- identity/data models must not accidentally embed “global one-tenant forever” assumptions where inexpensive neutrality is possible;
- capabilities are not required to become fully tenant-aware in advance.

### When tenancy becomes real

Then create a dedicated tenancy ADR covering:

- tenant identity;
- data isolation;
- authorization context;
- unique constraints;
- background jobs;
- cache keys;
- audit;
- migrations;
- cross-tenant administration.

### Decision

Do **not** block the first TAYMEX slice on a full multi-tenancy ADR unless actual TAYMEX requirements require tenancy.

---

# 144. Data Migration Strategy — Important, But Triggered by Persistent Shared Ownership

Expert 06 again emphasizes platform-version data migrations.

### Evaluation

**Strong concern, sequencing remains requirement-triggered.**

We already accepted after Expert 02:

> Before a shared platform package owns persistent production schema, define ownership and expand/contract rules.

### Required future shared-schema contract

- table/schema ownership;
- migration version ownership;
- expand/contract sequencing;
- backward compatibility window;
- rollback/roll-forward;
- data migration strategy;
- cross-boundary foreign-key policy;
- deprecation/removal;
- old/new app version coexistence where required.

### Important distinction

Code codemods and database/data migrations are different problems.

A source codemod cannot safely “migrate data” by itself.

### Decision

Do not require a complete generic data migration framework before the first non-shared Product domain table.

Require it **before the first persistent shared platform capability makes a breaking schema evolution**.

---

# 145. Deprecation Policy as Executable Governance

### Expert claim

Capability lifecycle states are described, but deprecation policy is not yet enforced as code/schema/CI.

### Evaluation

**Partially accepted and worth strengthening.**

We already have:

- lifecycle/deprecation as a platform capability expectation;
- settings lifecycle explicitly defined as `experimental → stable → deprecated → removed`;
- capability admission requiring a deprecation path.

The remaining gap is generic executable lifecycle metadata for reusable packages/capabilities.

### Recommended future capability metadata

For a reusable public platform surface:

```yaml
stability: experimental | candidate | stable | deprecated
introducedIn:
deprecatedIn:
replacement:
removalNotBefore:
migration:
owner:
```

### Gate ideas

For `stable` reusable surfaces:

- cannot remove without a governed breaking-change path;
- deprecated surface must identify replacement/removal plan;
- removal before declared window fails release validation;
- migrations/codemods where applicable.

### Decision

Implement this when the first reusable v0.x surface is promoted toward `stable`.

Do not build a full deprecation engine for experimental first-slice code.

---

# 146. Platform Metrics — Expert 06 Timing Correction

Expert 06 says the platform metrics/dashboard should be built in Wave 3+.

### Evaluation

**Metrics are necessary now; a dashboard is not.**

The official roadmap already says:

> Track first governance metrics from the first vertical slice.

These include:

- blocked assumptions;
- scope violations;
- duplicate/shared component attempts;
- duplicate/unused settings;
- security findings;
- regression rate;
- fast/PR gate duration;
- exceptions;
- manual reminders.

### Decision

Collect metrics from the first slice as structured evidence/log output.

Do **not** delay measurement until a dashboard exists.

A dashboard is only justified when the volume/history makes visualization useful.

### Principle

> Instrument first; dashboard later.

---

# 147. Agent Usability Testing — Expert 06’s Best New Framing

Expert 06 distinguishes:

> “Can the platform stop the agent from doing the wrong thing?”  
> from  
> “Can the agent successfully do the right thing?”

### Evaluation

**Strongly accepted.**

This was already implicit in Agent-in-the-Loop and friction metrics, but Expert 06 gives it a clear test category:

> **Agent Usability Testing**

### Required measures

For representative tasks:

- first-attempt completion rate;
- number of governance failures before success;
- number of manual clarifications;
- number of manual rule reminders;
- context size;
- task-contract preparation time;
- time to first valid diff;
- generator usage vs manual construction;
- exception requests;
- wrong existing-component/setting/model guesses;
- total correction loops.

### Important interpretation

A low first-attempt rate may mean:

- task is underspecified;
- generated context is poor;
- golden path is hard to discover;
- gate error messages are poor;
- abstraction is too complex;
- agent lacks stack familiarity;
- the task itself is genuinely complex.

Therefore usability metrics require qualitative failure categories, not only one success percentage.

### Decision

Rename/expand existing first-slice `Agent-in-the-Loop` measurement into:

> **Agent Governance + Usability Evaluation**

This is now a first-class slice deliverable.

---

# 148. Offline / Stale / Rate-Limited States

Expert 06 notes that a generic PageState list does not automatically provide a data-layer strategy for:

- offline;
- stale;
- rate limited;
- retry/recovery.

### Evaluation

**Valid distinction.**

The architecture already includes page-state concepts, but experience state and data-consistency behavior are different.

### Decision

Do not create a universal offline platform before a real requirement.

For the first slice, test only states genuinely relevant to the selected flow.

When an app needs resilient client caching/offline behavior, define:

- stale semantics;
- retry policy;
- error classification;
- optimistic update behavior;
- cache invalidation;
- rate-limit feedback;
- offline writes if supported.

### Principle

A visual “Offline” component without real data behavior is superficial implementation and must not be mistaken for resilience.

---

# 149. Private Package Distribution — Real Decision, But Bootstrap Already Identified

Expert 06 notes that the exact private registry is not yet chosen.

### Evaluation

**Correct.**

ADR-001/Distribution Research choose private npm-compatible versioned distribution, but the exact operational provider may remain open.

### For first TAYMEX slice

We already identified the need for a pre-release artifact boundary.

The exact mechanism should be selected based on:

- repository/CI provider;
- authentication complexity;
- package retention;
- auditability;
- cost;
- local developer access;
- immutable version support;
- disaster-recovery/export options.

### Decision

Choose the simplest real artifact transport sufficient for the first independent TAYMEX consumer.

Do not build/operate Verdaccio by default merely because it is available.

---

# 150. Previous-Major Support Window

Expert 06 asks for an exact support duration now.

### Evaluation

**Important later; too early to invent a calendar commitment now.**

Before the platform has:

- one stable major;
- multiple production consumers;
- measured upgrade cost;

a fixed “6 months vs 12 months” policy would be speculative.

### Adopted principle

Define support classes before first stable major:

```text
current supported line
security-supported previous line
unsupported / upgrade required
```

Set exact durations using:

- number of consumers;
- security exposure;
- release cadence;
- upgrade duration;
- contractual obligations.

### Decision

No fixed period now.

---

# 151. Platform Engineering Supply-Chain Continuity / DR

Expert 06 raises a genuinely new operational angle:

The product may not depend on a central platform service at runtime, but engineering can still depend on:

- platform Git repository;
- private package registry;
- CI provider;
- artifact storage;
- reusable workflows;
- release credentials.

### Evaluation

**Accepted — useful distinction from product runtime DR.**

Call this:

> **Engineering Supply-Chain Continuity**

rather than treating it as ordinary application disaster recovery.

### Questions to answer before production reliance becomes high

- Can a pinned package version be installed if the platform repo is temporarily unavailable?
- Are released artifacts retained independently/reliably?
- Can build/release proceed during platform-development outage?
- Is the package registry a single unrecoverable point of failure?
- Are registry/package metadata backed up/exportable?
- Are CI workflow definitions versioned?
- Can critical production hotfixes proceed if platform release automation is unavailable?
- Are signing/release credentials recoverable securely?
- Is there a documented break-glass/manual release path with audit?

### Important scope control

Do not build a multi-region platform registry and CI clone for one first consumer.

### Decision

Add a **minimum continuity policy before production**, scaled to actual business criticality.

This should be part of release/operations, not a blocker for the local first slice.

---

# 152. Exact Test Counts and Wave 2 Evidence — Still Pending

Expert 06 repeats specific claims:

- 12 Wave 1 tests;
- 8 Wave 2 tests;
- 18 visual tests;
- specific 768px overflow detection.

### Evaluation

The 12 Wave 0–1 tests are verified by the authoritative verification report.

The additional Wave 2 numbers remain:

`REPORTED / EVIDENCE_PENDING`

within this cumulative review unless the corresponding verification artifact is located.

### Decision

Do not use the combined count as official program maturity evidence yet.

This reinforces Expert 06’s own “Verified before Claimed” principle.

---

# 153. “Complete axe + affected visual before first feature” — Used-Path Interpretation

Expert 06 recommends finishing axe and affected visual regression before first commercial feature.

### Evaluation

**Accepted for the used slice path, not as an exhaustive Wave 2 completion requirement.**

For UI built in the first validation slice:

- accessibility baseline must be real;
- relevant affected UI tests must execute;
- the actual selected component/runtime path must be integrated.

But this does not require:

- all future patterns;
- every locale/theme/viewport combination;
- every page type;
- all future a11y scenarios

before the first bounded slice starts.

### Decision

Retain the **Used Wave 2 Critical Path** model from Expert 03/04.

---

# 154. Performance Budgets — Not a Pre-Slice Universal Requirement

Expert 06 correctly notes performance budgets are not yet implemented.

### Evaluation

**Correct implementation status; sequencing must be risk-driven.**

The Quality Gate Matrix already defines:

- pagination/unbounded-data checks;
- N+1/query amplification;
- critical-path budgets;
- k6 for selected journeys.

### First-slice rule

If the Products slice introduces:

- list endpoint → bounded pagination is required;
- ORM query path → query-count/N+1 evidence where meaningful;
- no meaningful latency-critical journey yet → do not invent a broad k6 program.

### Decision

Do not require generalized performance infrastructure before the slice.

Use deterministic performance correctness from the first relevant backend path; deepen measured performance later.

---

# 155. Expert 06 Final Recommendation — Main Rejection

Expert 06 recommends completing these before the first real TAYMEX feature:

1. full Repository Truth for Models/Fields/API/DB;
2. contract tests for adapters;
3. remaining Wave 2 a11y/visual;
4. performance budgets;
5. multi-tenancy ADR;
6. data migration ADR;
7. deprecation schema/CI;
8. metrics dashboard;
9. agent usability tests.

### Evaluation

This bundle mixes four different classes:

## A. Required for the first slice
- used UI/a11y path;
- Agent Governance + Usability Evaluation;
- enough Repository Truth to prevent guessing in the used model/contracts;
- real artifact/package boundary;
- auth/settings/audit/functional proof as used.

## B. Required only if triggered by the first slice
- query/performance instrumentation;
- adapter contract tests if a replaceable adapter is introduced;
- backend/API truth adapter if the slice uses that boundary.

## C. Required before later stability/production conditions
- generic deprecation enforcement for stable reusable capabilities;
- engineering supply-chain continuity policy;
- shared persistent schema migration policy before shared schema evolution.

## D. Not required unless product requirements demand them
- multi-tenancy architecture;
- generalized offline;
- full performance/k6 matrix;
- reference applications.

### Cumulative decision

**Reject the nine-item precondition bundle.**

The correct policy remains:

> The first bounded TAYMEX vertical slice starts once the trust root and used critical path are ready; missing deeper controls are pulled into the platform as the real slice encounters them.

---

# 156. Cross-Expert Convergence After Experts 01–06

Six reviews now provide enough convergence to distinguish stable conclusions from individual preference.

## 156.1 Stable: no broad new platform wave before real TAYMEX proof

All experts warn, in different ways, about platform over-expansion.

**CONFIRMED.**

## 156.2 Stable: first TAYMEX slice is the proving mechanism

Experts differ on whether more platform work should precede it, but the authoritative roadmap resolves this:

**The bounded vertical slice is the Wave 2 proof and precedes generalized Wave 3 depth.**

**CONFIRMED.**

## 156.3 Stable: Repository Truth is a major remaining maturity gap

Experts 01, 03, 04 and 06 explicitly reinforce this.

**CONFIRMED.**

New precision:

> Slice-scoped truth first; generalized truth adapters in Wave 3.

## 156.4 Stable: functional/backend correctness needs more proof

Repeated areas:

- authz;
- state/invariants;
- idempotency/concurrency;
- query behavior;
- settings runtime;
- error/audit/observability.

**CONFIRMED.**

## 156.5 Stable: agent usability matters as much as enforcement

Experts 02, 03, 04, 05 and 06 converge through:

- task authoring;
- false positives;
- fast loop;
- discoverability;
- actionable failures;
- agent success/correction loops.

**CONFIRMED.**

## 156.6 Stable: package/data evolution is the major later shared-platform risk

All six experts mention distribution/upgrade/migration risk in some form.

**CONFIRMED**, with timing tied to actual shared versioned/persistent use.

---

# 157. Expert 06 — New Decisions Worth Carrying Forward

1. **Historical Evidence Confidence** in defect taxonomy/back-tests.
2. **REPLACE requires Contract Tests** before replacement is a supported capability mode.
3. **Slice-Scoped Repository Truth** as the bridge between Wave 2 and generalized Wave 3.
4. **Model/Field Assumption Negative Test** in first TAYMEX slice.
5. **Agent Governance + Usability Evaluation** as explicit slice deliverable.
6. **Engineering Supply-Chain Continuity** as a production operations concern.
7. **Instrument metrics from the first slice; dashboard later.**
8. **Deprecation enforcement triggered by promotion to stable reusable surfaces.**
9. **Separate code migrations from persistent data migrations.**
10. **Historical audits are evidence sources with confidence levels, not unquestioned ground truth.**

---

# 158. Expert 06 Claims Requiring Correction

1. **“Reference applications should validate each capability before promotion.”**  
   Useful compatibility tools later; synthetic references do not replace real cross-product evidence and are deliberately later in the roadmap.

2. **“Complete Wave 3 before first TAYMEX feature.”**  
   Contradicts the accepted roadmap. Use slice-scoped truth, then generalize in Wave 3.

3. **“Multi-tenancy must be decided before any user-data capability.”**  
   Too broad. Tenancy is optional L3; disable it explicitly for TAYMEX unless required.

4. **“Data migration strategy must be fully designed before first domain data.”**  
   Required before breaking evolution of shared persistent platform schema, not before ordinary TAYMEX-owned domain tables.

5. **“Platform metrics require a dashboard before we can evaluate success.”**  
   Instrument structured metrics in the first slice; dashboard later.

6. **“All performance budgets must exist before first feature.”**  
   Use risk/affected deterministic controls; full performance programs are later/selected.

7. **“All adapter contract tests must exist before first feature.”**  
   Contract suites are mandatory when a replaceable adapter surface actually appears.

8. **“Exact previous-major support duration must be decided now.”**  
   Principle now, numeric window before stable production lines based on real upgrade economics.

9. **“All causes of guessing remain unresolved until full Wave 3.”**  
   We can make individual used contracts truthful immediately through generated types/schema during the slice.

---

# 159. Updated Priority Order After Experts 01–06

The top-level direction remains stable, with one refinement: **Repository Truth is now explicitly slice-scoped before generalized Wave 3.**

## P0 — Trust Root / Merge Authority

- trusted verifier/base;
- protected control plane;
- required status;
- ownership/rulesets;
- governance regression corpus.

## P1 — True Slice-Blocking Decisions

- backend topology if needed;
- artifact transport;
- Task Contract authority;
- minimal project profile;
- used locale/settings scope.

## P2 — Used Wave 2 Critical Path

- real UI/styling runtime;
- canonical components;
- consumer enforcement;
- used a11y;
- responsive/RTL;
- visual baseline governance.

## P3 — Start TAYMEX Vertical Slice

TAYMEX is the real validation consumer.

## P4 — Slice-Scoped Repository Truth

As the canonical Product/API/data surface is created:

- generate/inspect real model/type truth;
- no guessed fields;
- route/schema truth if used;
- permission/settings truth;
- add negative assumption tests.

## P5 — Agent Governance + Usability Evaluation

Measure:

- task generation;
- first-attempt success;
- correction loops;
- manual reminders;
- gate clarity;
- context usefulness;
- time to valid diff.

## P6 — Artifact Boundary + Runtime Foundations

Consume real pre-release packages and pull:

- auth/authz;
- settings resolver;
- audit/error/logging;
- pagination/query evidence;
- data handling baseline.

## P7 — Historical Defect Back-Test

Now with evidence-confidence metadata and severity weighting.

## P8 — Triggered Deep Controls

Only when the slice introduces them:

- adapter contract tests;
- concurrency/idempotency harness;
- external integration schemas;
- meaningful performance budgets.

## P9 — Exception / Repair / Governance Conformance

- safe exception;
- non-waivable case;
- repair loop;
- rule consistency.

## P10 — Generalize Into Wave 3 From Evidence

After the slice:

- generalized symbol index;
- full OpenAPI/ORM adapters;
- permission/event catalogs;
- broader Repository Truth;
- later upgrade/deprecation/compatibility machinery.

---

# 160. Updated Open Questions After Expert 06

78. What confidence labels can be assigned to historical Harbuk/SARH defect evidence?
79. Which historical defect counts are source/test verified versus audit-report only?
80. Which exact Repository Truth adapters are needed by the first Products slice, and which can wait for generalized Wave 3?
81. What deliberate invalid model/field assumption will be used to prove `UNKNOWN/invalid → fail`?
82. What is the first platform capability likely to support `REPLACE`, and what contract suite will define its conformance?
83. What exact artifact transport will be used for first `0.x` independent TAYMEX consumption?
84. Does that artifact mechanism have adequate retention/export/recovery properties?
85. What minimum engineering supply-chain continuity is required before TAYMEX production release?
86. Which platform surfaces will initially remain `experimental` and therefore not require full deprecation guarantees?
87. What evidence threshold promotes a reusable surface from `experimental/candidate` to `stable`?
88. Which first-slice metrics can be emitted automatically as JSON/JUnit/SARIF without building a dashboard?
89. What categories will be used to classify Agent Usability failures?
90. What first-attempt success and correction-loop baseline does Codex actually achieve on the Products slice?
91. Which Product data belongs entirely to TAYMEX domain versus shared platform persistent ownership?
92. What event would trigger a dedicated multi-tenancy ADR for TAYMEX?
93. What future shared persistent capability will trigger the first expand/contract data-migration policy?
94. Which offline/stale/rate-limit states are truly relevant to the first bounded flow?
95. When the first stable major exists, what real consumer data will determine previous-major support duration?

---

# 161. Current Working Conclusion After Experts 01–06

Expert 06 makes the cumulative review more rigorous, especially around evidence quality and Repository Truth.

Its strongest warning is valid:

> **The platform cannot claim “no guessing” merely because it can inspect manifests and settings while it still lacks truth for the actual model/API/data surface being edited.**

The correction is about timing.

We should not respond to this warning by postponing TAYMEX until a universal Repository Truth engine is finished.

Instead:

```text
Create bounded real slice
      ↓
Establish the canonical Product/API/data truth it actually uses
      ↓
Make those contracts machine-readable/generated
      ↓
Deliberately prove invalid assumptions fail
      ↓
Generalize the successful truth adapters into Wave 3
```

This is exactly the evidence-first evolutionary model the roadmap intended.

After six experts, the central risk is no longer ambiguity about strategy.

The strategy is now highly stable.

The remaining danger is **overreacting to every legitimate gap by turning it into a prerequisite**.

A gap can be:

```text
must exist before slice
must be built when slice triggers it
must exist before production
must exist before second consumer
optional until requirement appears
```

Those are different.

The first TAYMEX slice should therefore not be “commercial feature construction at full speed.”

It is a controlled engineering experiment inside the real product repository.

It must prove:

- real task governance;
- real agent usability;
- real model/field truth for what it touches;
- real platform artifact consumption;
- real UI/settings/auth/audit paths;
- negative assumptions fail;
- failures are repairable without bypass;
- friction remains acceptable.

Once that succeeds, generalized Wave 3 becomes grounded engineering rather than another theoretical foundation layer.

---

## Document Status

- Expert reviews included: **6**
- Current state: **Cumulative / Active**
- Cross-expert convergence: **very strong**
- Strategic direction: **stable**
- Expert 06’s main accepted additions: evidence confidence, slice-scoped Repository Truth, adapter contract-test requirement, agent usability testing, engineering supply-chain continuity
- Expert 06’s main rejected recommendation: completing all Wave 2 + Wave 3 before beginning the real TAYMEX validation slice
- Main-plan changes: **not automatically applied from this document**
- Next step after remaining expert reviews: consolidate accepted decisions into a smaller prioritized amendment set rather than carrying all open questions as implementation prerequisites.

# 162. Expert 07 — Overall Evaluation

## 162.1 Why this review matters

Expert 07 is the first reviewer to challenge the **philosophical boundary** of Correct-by-Construction rather than mainly its maturity and sequencing.

The strongest question is:

> **Which engineering decisions should be machine-enforced, and which must remain contextual design judgments?**

This is a real gap worth making explicit.

The expert is correct that not every architectural decision can or should become:

- lint;
- CI rule;
- schema;
- generator constraint.

Examples such as:

- “Is this concept Product, SKU or Offering?”
- “Should this workflow become event-driven?”
- “Is the current abstraction still useful?”
- “Should we split this module now or later?”

depend on semantics, business context, trade-offs and evolution.

Trying to force these into deterministic blocking gates would create false certainty and architectural rigidity.

However, Expert 07 overcorrects from this valid concern into a radical recommendation:

> Build TAYMEX fully first, then extract a platform after second/third projects.

That recommendation is **not adopted**.

It ignores the very strong historical evidence from Harbuk and SARH that post-hoc extraction and audit-based governance arrive too late after drift has already accumulated.

The cumulative plan is deliberately between the two extremes:

```text
NOT:
design a complete universal platform before product

AND NOT:
build a full unconstrained product and extract governance later

BUT:
build a minimum enforceable platform safety layer
→ run a bounded real TAYMEX slice
→ let product evidence pull the next platform abstractions
→ keep unproven abstractions experimental
```

This remains the preferred strategy.

---

# 163. New Fundamental Classification: Policy Modality

Expert 07 correctly exposes a missing explicit distinction:

> Not all engineering guidance has the same enforceability.

### Adopted classification

Every important platform rule/decision should belong to one of the following modalities.

## A. HARD_INVARIANT

Deterministic, high-confidence, machine-blocking.

Examples:

- forbidden dependency direction;
- unauthorized path modification;
- new dependency without approval;
- secret in repository;
- raw platform setting duplication where deterministically detectable;
- invalid schema/API contract;
- protected control-plane modification;
- missing required authorization on a known protected route where reliably testable.

## B. GENERATED_DEFAULT

The platform provides the preferred implementation automatically, but variation may be legitimate.

Examples:

- module skeleton;
- CRUD page structure;
- test setup;
- project bootstrap;
- standard error plumbing.

Deviation is not automatically wrong if approved/justified.

## C. REVIEW_REQUIRED_CONTEXT

A contextual architectural/design decision that should produce explicit reasoning/ADR/review rather than a simplistic CI failure.

Examples:

- Product vs SKU domain boundary;
- event-driven vs direct transaction;
- extracting a new shared abstraction;
- replacing a canonical workflow;
- choosing eventual vs strong consistency for a new flow.

## D. ADVISORY_SIGNAL

Probabilistic or heuristic signal.

Examples:

- semantic duplicate naming similarity;
- potential over-abstraction;
- unusually complex component;
- possible business-concept overlap.

These should normally warn/review rather than block.

## E. EXPERIMENTAL_RULE

Candidate rule being measured before becoming blocking.

### Decision

Add `modality` or equivalent semantics to the Canonical Rule Registry / governance metadata.

### Core principle

> **Machine enforcement is strongest for objective invariants. Human/architectural judgment remains explicit for semantic trade-offs.**

Correct-by-Construction is not “automate every decision.”

---

# 164. Architectural Evolution Must Be a First-Class Escape From Old Rules

Expert 07 warns that strict rules can freeze architecture at one moment in time.

### Evaluation

**Accepted.**

The platform already has:

- exceptions;
- ADR supersession;
- lifecycle/deprecation;
- migration/codemed strategy;
- experimental/stable states.

But we should make the distinction explicit:

### Exception

Temporary deviation from a still-valid rule.

### Architecture Change

Intentional change to the rule/abstraction itself because the old design is no longer correct.

These are not the same.

### Required architecture-change path

For a rule or canonical abstraction to change:

1. identify evidence that the current design no longer fits;
2. propose replacement/superseding decision;
3. assess consumers/impact;
4. migrate generated/reference consumers where applicable;
5. update rule tests/conformance corpus;
6. deprecate old surface;
7. remove only after compatibility policy permits.

### Important safeguard

Do **not** force a legitimate architectural evolution through a permanent “exception.”

Repeated valid exceptions are evidence that the rule may need redesign.

### Decision

Explicitly distinguish:

`EXCEPTION` vs `RULE/ARCHITECTURE EVOLUTION`.

---

# 165. “No Guessing” Does Not Mean “No Reasoning”

Expert 07 argues that if the agent cannot create files, add libraries, or interpret plans freely, it becomes little more than a traditional code generator.

### Evaluation

**Rejected as a false equivalence.**

The platform limits **authority and factual invention**, not all reasoning.

There are at least four different kinds of agent freedom:

## 1. Repository-fact invention
Example:

> assuming `product.status` exists.

This should be blocked.

## 2. Authority expansion
Example:

> deciding it needs a new dependency, migration or platform change and granting itself permission.

This should be blocked or separately approved.

## 3. Implementation reasoning inside an approved contract
Examples:

- how to decompose a function;
- how to structure tests;
- how to implement validation;
- how to repair a failing edge case;
- how to use existing APIs/components correctly.

This is precisely where agent intelligence remains valuable.

## 4. Architectural proposal
Example:

> “The existing pattern cannot support this requirement; I recommend a new extension point.”

The agent may propose this, but should not silently implement the architecture change without authority.

### Adopted concept: Bounded Agency

The goal is:

> **Maximum useful reasoning inside minimum necessary authority.**

This is stronger than either:

- unrestricted autonomous coding;
- deterministic code generation only.

### Decision

Add **Agency Boundary / Bounded Agency** explicitly to the Agent Execution System.

---

# 166. Agency Budget by Risk and Task Type

To make Bounded Agency operational, the contract can define degrees of freedom.

Example concept:

```yaml
agency:
  mayModifyExistingImplementation: true
  mayCreateFiles: false
  mayAddDependencies: false
  mayProposeArchitectureChange: true
  mayApplyArchitectureChange: false
  mayRequestScopeExpansion: true
  maySelfApproveExpansion: false
```

Higher-risk work receives narrower automatic authority and stronger review.

A generator task may legitimately allow known generated files.

A bug fix should remain highly constrained.

### Decision

Do not reduce every task to the same rigid contract.

Task type + risk should determine the **agency budget**.

This provides a better answer to Expert 07 than removing governance.

---

# 167. Expert 07’s “Build TAYMEX Fully, Extract Platform Later” Recommendation

### Evaluation

**Rejected.**

This is the largest strategic disagreement.

### Why it is attractive

The recommendation follows a legitimate principle:

- avoid premature abstractions;
- learn from real product pressure;
- extract reusable patterns from actual use.

We already accept these ideas.

### Why the full recommendation is wrong for this project

Harbuk and SARH are not hypothetical warnings.

They already show that building first and introducing safety/governance after implementation leads to:

- duplicate patterns;
- settings drift;
- local authorization variants;
- UI divergence;
- post-hoc security hardening;
- audit/re-audit cycles;
- high repair cost.

Therefore going back to:

```text
Build all TAYMEX first
→ extract platform later
```

would knowingly discard learned evidence.

### Adopted middle path

The current roadmap is already the YAGNI-compatible version of a platform:

- minimum safety net first;
- one real TAYMEX vertical slice;
- only slice-driven capabilities next;
- optional L3 deferred;
- new abstractions remain experimental;
- second/third products determine stabilization/generalization.

### Decision

Keep ENGINEERING_PLATFORM, but treat TAYMEX as the near-term stabilizing consumer.

Do not build a “platform market” in advance.

---

# 168. Rule of Three — Correct Principle, Incorrect Application

Expert 07 says:

> There are zero real uses, therefore no platform abstraction should exist yet.

### Evaluation

**Too absolute.**

The accepted Platform Capability Map intentionally has several admission routes:

1. universal engineering primitive with established value;
2. repeated historical evidence;
3. later multi-product proof.

Examples such as:

- validation primitives;
- error contracts;
- task governance;
- secrets scanning;
- basic audit primitives;

do not require us to reinvent them three times.

### Where Rule of Three matters strongly

- business-neutral UX patterns whose abstraction shape is uncertain;
- optional L3 capabilities;
- generalized workflows;
- domain-adjacent components;
- complex extension APIs.

### Decision

Retain current admission rule.

Do not stabilize uncertain TAYMEX-derived patterns until broader evidence exists.

---

# 169. Nx OSS / Enterprise Critique — Partially Correct, Strategically Overstated

Expert 07 argues that Nx OSS is a vendor-lock trap because advanced Conformance and Distributed Task Execution are paid/cloud/enterprise features.

### Current verification

Nx documentation confirms:

- the JS/TS `@nx/enforce-module-boundaries` ESLint rule is available for enforcing import/dependency constraints in JavaScript/TypeScript workspaces;
- the language-agnostic `@nx/conformance` plugin requires Nx Enterprise;
- distributed task execution through Nx Agents is an Nx Cloud capability;
- remote caching has free/managed/self-hosted paths, including official self-hosted options.

### Evaluation

**The factual distinction is real; the conclusion does not follow for our architecture.**

Our accepted enforcement architecture does **not** require Nx Enterprise Conformance.

We deliberately allocated:

- JS/TS import boundaries → Nx ESLint;
- cross-language patterns → Semgrep;
- structured/cross-language policy → OPA/Conftest;
- repository/task governance → our CLI;
- merge authority → CI/rulesets.

Therefore Nx is being used as:

- workspace/project graph;
- affected execution;
- generators;
- JS/TS boundaries;

not as the sole proprietary governance engine.

### Vendor-lock controls

- avoid dependence on Nx Enterprise-only conformance features for constitutional rules;
- keep canonical manifests/policies independent of Nx-specific proprietary formats where practical;
- keep package/build boundaries understandable outside Nx;
- monitor migration cost as part of architecture debt.

### Decision

**No Nx → Turborepo/Bazel migration is justified now.**

Changing orchestration technology before the real TAYMEX slice would add major cost without solving the primary governance problem.

Bazel may provide stronger hermetic build semantics, but its complexity would directly conflict with the current goal of reducing platform operational burden unless future scale demonstrates the need.

---

# 170. Golden Pattern Escape Problem

Expert 07 asks what happens when 50 pages follow a Golden CRUD pattern and one page legitimately differs by 5%.

This is a real framework-design problem.

### Bad responses

## A. Fork the whole pattern
Creates drift.

## B. Add endless boolean flags
Creates a God Pattern.

## C. Refuse legitimate variation
Creates a Golden Cage.

### Adopted response: Constrained Composition

Golden patterns should define:

- stable skeleton;
- explicit slots/extension points;
- composition boundaries;
- replaceable subcomponents where contractually supported;
- project-owned content/domain sections.

Avoid deep inheritance and flag explosions.

### Example

A CRUD pattern may own:

- page states;
- toolbar frame;
- table shell;
- pagination integration;
- form/error plumbing.

The product may provide:

- columns;
- fields/schema;
- domain actions;
- filters;
- contextual side panel;
- approved custom section.

### Promotion rule

If a new customization:

- appears once → local extension through supported slot;
- repeats → candidate reusable extension;
- repeatedly breaks the pattern → reconsider the pattern boundary itself.

### Decision

Add **Golden Pattern Extensibility** and **flag-count/escape pressure** to pattern-health review.

---

# 171. Golden Pattern Extension Budget

To prevent `CrudPage` from becoming a configurable God component, monitor signals such as:

- number of boolean/config switches;
- number of product-specific branches in shared code;
- number of escape slots;
- frequency of local overrides;
- percentage of pages requiring custom replacement;
- repeated exceptions to the same pattern.

No fixed universal number is required initially.

### Decision rule

If product-specific configuration grows faster than stable shared structure, the abstraction is likely at the wrong level.

---

# 172. Agent Observability — Use Execution Telemetry, Not Hidden Reasoning Traces

Expert 07 proposes “Agent Decision Traces.”

### Evaluation

**The need for observability is valid; the proposed wording needs correction.**

The platform should not depend on collecting or exposing private hidden chain-of-thought.

What we need is **Agent Execution Telemetry**:

- task ID/type/risk;
- generated context sources;
- contract version;
- commands/tools invoked where available;
- files changed;
- gate failures;
- scope expansion requests;
- exceptions;
- repair attempts;
- generator use;
- elapsed time;
- human clarification points;
- final evidence status.

### Useful derived metrics

- drift attempt rate;
- first-pass success;
- repeated failure categories;
- most confusing rules;
- most bypassed golden paths;
- repeated manual interventions.

### Postmortems

For repeated agent failures, review observable artifacts:

- task input;
- generated context;
- diff;
- verifier output;
- test failures;
- corrections.

Do not require internal reasoning disclosure.

### Decision

Rename any future “agent trace” feature as **Agent Execution Telemetry / Governance Telemetry**.

---

# 173. Bus Factor and Governance Ownership Coverage

Expert 07 raises the risk that only one person may understand:

- Nx;
- Panda;
- custom lint rules;
- OPA;
- generators;
- CI;
- deployment tooling.

### Evaluation

**Accepted as a real operational risk.**

This extends the prior platform-owner/maintenance concern.

### Metrics / controls

Track:

- owner count for critical platform areas;
- backup owner/reviewer;
- undocumented single-person-only processes;
- recovery/runbook for releases;
- percentage of P0 governance code with at least two competent reviewers where possible.

### Important scope

A small team cannot create artificial redundancy everywhere.

Prioritize redundancy for:

- release/registry credentials;
- control-plane verifier;
- settings resolver;
- shared migration tooling;
- security-sensitive build/release paths.

### Decision

Add **Bus Factor / Ownership Coverage** to platform operational-health review.

---

# 174. Maintenance Economics — Valid Question, Unsupported Generalization

Expert 07 claims that for most teams under 20 developers, governance maintenance cost is usually greater than its benefit.

### Evaluation

**Not accepted as a general fact.**

No project-specific measurement supports that threshold.

In this project, historical Harbuk/SARH audit/rework cost is direct evidence that uncontrolled development also has substantial cost.

### Correct decision framework

Measure both sides:

```text
Platform/Governance Cost
- tooling maintenance
- task preparation
- CI time
- rule false positives
- upgrade effort
- platform-owner intervention

VERSUS

Avoided/Rework Cost
- defects prevented
- duplicate abstractions prevented
- audit/re-audit reduction
- repair regression reduction
- security issues blocked
- faster future project bootstrap
```

### Decision

No “team size < 20 → platform bad” rule.

The first slice must provide actual cost/benefit data.

---

# 175. “Governance MVP = Only 3 Rules” Recommendation

### Evaluation

**Rejected as an arbitrary rollback.**

The project has already implemented and verified more than three low-cost, high-value controls.

Removing:

- scope enforcement;
- new-file default deny;
- dependency approval;
- base verification;
- manifest/settings validation;

would discard working safeguards with little benefit.

### Correct MVP principle

Use:

> **Minimum effective set, not minimum rule count.**

A rule remains if it:

- addresses evidenced high-cost failure;
- is deterministic/high precision;
- has low maintenance/latency cost;
- provides clear remediation.

Remove/defer rules that are:

- speculative;
- noisy;
- expensive;
- not relevant to current slice.

---

# 176. Critical Business Logic “Agent-Locked” Proposal

Expert 07 recommends a locked L4 category where agents cannot touch business-critical logic such as the solar calculator without explicit human approval.

### Evaluation

**Partially accepted; blanket prohibition rejected.**

The earlier claim that:

> “Solar calculations cannot be performed by AI”

has not been established as an approved project requirement.

More importantly, “AI wrote the code” and “AI performs runtime engineering calculations” are different questions.

A deterministic solar engine can be:

- specified by approved engineering formulas;
- implemented with agent assistance;
- validated against human-approved golden cases;
- reviewed by a technical owner;
- executed deterministically at runtime.

### Adopted high-risk domain control

For critical domain logic, use:

- R4 classification;
- explicit domain owner approval;
- no self-approval;
- approved formula/reference sources;
- golden datasets/cases;
- property/invariant tests;
- change impact evidence;
- restricted exceptions.

### Optional lock

Certain files/areas may require owner approval and may be excluded from autonomous write modes.

But this is **risk-based human authority**, not a universal ban on agent-assisted implementation.

### Decision

Do not create a blanket `L4-LOCKED = no agent access` rule.

Create **Critical Domain Change Policy** when solar engineering logic begins.

---

# 177. L2 AppShell Boundary — Useful Clarification

Expert 07 argues that AppShell/Sidebar/Header may differ too much between products to belong in shared L2.

### Evaluation

**The concern is valid; moving all shell concerns to L4 is unnecessary.**

We should distinguish:

## Shared Shell Mechanism (L2)
Reusable engineering/application concerns:

- responsive layout primitives;
- navigation regions;
- focus/skip behavior;
- mobile shell mechanics;
- authenticated shell state;
- accessibility;
- directionality;
- theming hooks.

## Product Shell Composition (L4 or product configuration)
Product-specific decisions:

- actual navigation information architecture;
- branding;
- menu grouping;
- product-specific actions;
- dashboard content;
- route priorities.

### Decision

Keep reusable shell **mechanisms** in L2.

Keep product-specific shell **composition/IA** out of the shared foundation.

This prevents both:

- duplicated shell mechanics;
- a forced identical UI across unrelated products.

---

# 178. L1/L2 Boundary Question

Expert 07 questions why i18n is L1 rather than L2.

### Evaluation

This is mostly a taxonomy question, not a high-risk architecture flaw.

Generic:

- locale types;
- message/formatting contracts;
- directionality helpers;
- translation interfaces;

can reasonably live in the kernel/foundation.

Product-specific:

- enabled locales;
- translation catalogs;
- content;
- locale routing policy;

belongs at application/product level.

### Decision

Clarify ownership by **mechanism vs configuration/content**, rather than reorganizing layers solely for conceptual purity.

---

# 179. Commerce as “Optional Capability”

Expert 07 says Commerce is too complex to be just an optional capability.

### Evaluation

**Terminology is being misread.**

“Optional capability” does not mean “small/simple.”

It means:

- not constitutional for every product;
- independently adoptable;
- may itself contain multiple packages/sub-capabilities;
- only built when demand exists.

Commerce can be a large capability family while still being L3 optional.

### Decision

No architecture change.

---

# 180. Migration / Deprecation Critique — Already Converged

Expert 07 raises:

- dependency/framework upgrades;
- executable-spec migration;
- `platform migrate`;
- deprecation.

### Evaluation

**Valid, already strongly represented in cumulative review and accepted ADRs.**

ADR-002 already selected:

- semver;
- release groups;
- codemods/migrations;
- compatibility/deprecation approach.

Cumulative review already added:

- shared persistent data migration;
- upgrade drill;
- lifecycle metadata;
- platform.lock/compatibility timing.

### Decision

No new immediate prerequisite.

First meaningful upgrade drill remains:

> after first real versioned TAYMEX platform consumption and before second major consumer/stable multi-consumer scale.

---

# 181. Expert 07’s “6–12 Month Platform” Estimate

### Evaluation

**Unsupported.**

No capacity/team-size/work breakdown was provided that justifies a 6–12 month estimate.

### Decision

Do not use this estimate.

Measure first-slice effort and platform intervention time instead.

---

# 182. Expert 07’s “Only YAGNI-Driven Extraction Works” Claim

### Evaluation

**Rejected as anecdotal absolutism.**

Pure platform-first and pure extract-later can both fail.

The correct approach depends on:

- historical evidence;
- shared mechanisms already known;
- cost of failure;
- number of consumers;
- team capacity;
- migration cost;
- product urgency.

For this project, historical failures justify some pre-product enforcement, while product uncertainty justifies delaying speculative abstractions.

That is exactly the cumulative **pull-based platform** strategy.

---

# 183. Cross-Expert Convergence After Experts 01–07

Expert 07 challenges the philosophy more than previous reviewers, yet after correction it strengthens rather than overturns the current direction.

## 183.1 New stable principle: Enforce invariants, review trade-offs

This is the most important addition from Expert 07.

**CONFIRMED.**

Do not turn every architecture judgment into CI.

## 183.2 Existing stable principle: real TAYMEX slice now

Expert 07 recommends full TAYMEX first; previous evidence and roadmap reject that extreme.

The cumulative middle path remains stronger.

**CONFIRMED.**

## 183.3 Existing stable principle: bounded agency

No guessing/self-authorization does not eliminate useful reasoning.

This is now explicitly documented.

**CONFIRMED.**

## 183.4 Existing stable principle: avoid Golden Cage

Exception debt, pattern extensibility, composition and architecture evolution all converge.

**CONFIRMED.**

## 183.5 Existing stable principle: platform economics must be measured

Bus factor and maintenance cost strengthen the existing friction/economics metrics.

**CONFIRMED.**

---

# 184. New Decisions Worth Carrying Forward From Expert 07

1. **Policy Modality** — hard invariant vs generated default vs contextual review vs advisory vs experimental.
2. **Exception vs Architecture Evolution** — do not use waivers to preserve obsolete rules.
3. **Bounded Agency / Agency Budget** — restrict authority, not reasoning.
4. **Golden Pattern Extensibility** — composition/slots/contracts instead of forks or flag explosion.
5. **Golden Pattern escape-pressure metrics**.
6. **Agent Execution Telemetry**, not hidden reasoning traces.
7. **Bus Factor / Ownership Coverage** for critical platform mechanisms.
8. **L2 shell mechanism vs L4 product shell composition**.
9. **Critical Domain Change Policy** rather than blanket “no agent” prohibition.
10. **Keep constitutional rules independent of Nx Enterprise-only features**.

---

# 185. Expert 07 Claims Rejected or Heavily Corrected

1. **“Every architectural decision is being converted to lint/CI.”**  
   - Not the intended design. Add explicit Policy Modality to prevent this drift.

2. **“Build TAYMEX completely first and extract the platform after project 2/3.”**  
   - Rejected; historical evidence shows governance introduced only after full products is too late.

3. **“Zero gray area means the agent is just a generator.”**  
   - False. We remove unauthorized factual invention while preserving implementation reasoning/proposals.

4. **“Nx OSS is an unacceptable lock-in trap.”**  
   - Overstated. Enterprise Conformance is paid, but our constitutional rules do not depend on it; OSS JS/TS boundaries remain available and other policies use independent tools. citeturn463701search0turn463701search1turn463701search3

5. **“Switch to Turborepo/Bazel.”**  
   - No evidence currently justifies migration cost.

6. **“Governance MVP should contain only 3 rules.”**  
   - Arbitrary; retain the minimum *effective* high-value controls already working.

7. **“Teams under ~20 usually lose more from governance than they gain.”**  
   - Unsupported generalization; measure our own economics.

8. **“L2 AppShell must move wholly to L3/L4.”**  
   - Clarify shared mechanism vs product composition instead.

9. **“Critical business logic must never be touched by an agent.”**  
   - Too absolute; use R4 + domain-owner approval + deterministic reference evidence.

10. **“Solar calculations cannot be performed by AI is already an accepted requirement.”**  
    - Still unsupported as a formal project rule.

11. **“6–12 months are required for the platform.”**  
    - Unsupported estimate.

12. **“Pure extract-later is the only platform approach that works.”**  
    - Unsupported absolute claim.

---

# 186. Updated Priority Order After Experts 01–07

Expert 07 does not change the execution sequence. It adds governance-shape constraints to prevent a Golden Cage.

## P0 — Trust Root / Merge Authority
Unchanged.

## P1 — Slice-Blocking Decisions
Include:
- backend topology if needed;
- artifact transport;
- Task Contract authority;
- minimal profile;
- **Policy Modality for new blocking rules**.

## P2 — Used Wave 2 Critical Path
Unchanged, plus:
- validate Golden Pattern extension model;
- ensure used rules are structural/high precision.

## P3 — Real TAYMEX Vertical Slice
Unchanged.

## P4 — Slice-Scoped Repository Truth + Bounded Agency
- truth for models/API/data used;
- no invented facts;
- agent can still propose implementation/architecture changes without self-authorizing them.

## P5 — Agent Governance + Usability + Execution Telemetry
- observable execution events;
- gate failures;
- correction loops;
- no chain-of-thought dependency.

## P6 — Artifact / Runtime Foundations
Unchanged.

## P7 — Historical Back-Test
Unchanged.

## P8 — Triggered Deep Controls / Contract Tests
Unchanged.

## P9 — Exception + Architecture Evolution + Pattern Escape Review
- exception debt;
- repeated escape pressure;
- distinguish temporary waiver from rule redesign.

## P10 — Measure Economics / Bus Factor Before Expansion
- tooling maintenance;
- owner coverage;
- platform intervention;
- avoided rework.

Then deepen Wave 3/4 only from evidence.

---

# 187. Updated Open Questions After Expert 07

96. Which current governance rules are true `HARD_INVARIANT` versus contextual/advisory?
97. Does the current Rule Registry/metadata support a modality field, or must one be added?
98. Which rules are currently blocking despite depending on semantic judgment?
99. What agency budget should each task mode/risk tier receive?
100. Which scope expansions may the agent request automatically but never self-approve?
101. Which architecture changes require a superseding ADR rather than an exception?
102. What extension points does the first CRUD Golden Pattern need to avoid forks/flag explosion?
103. What metrics indicate a Golden Pattern is becoming a God Component?
104. What observable Agent Execution Telemetry can be captured without relying on hidden reasoning?
105. Which platform areas currently have Bus Factor = 1?
106. Which P0 control-plane/release capabilities need a secondary competent owner before production?
107. Which constitutional policies currently depend on Nx-specific behavior, and could they survive an orchestration-tool migration?
108. What current use of Nx, if any, accidentally requires Enterprise-only features?
109. What is the exact boundary between shared AppShell mechanism and TAYMEX-specific navigation/IA?
110. Which future TAYMEX domain files should be R4/owner-protected rather than universally agent-locked?
111. What evidence would justify changing an invariant instead of issuing another exception?

---

# 188. Current Working Conclusion After Experts 01–07

Expert 07 provides the strongest philosophical stress test so far.

Its central valid warning is:

> **A governance system can become wrong by enforcing yesterday’s architecture perfectly.**

The answer is not to abandon executable governance.

The answer is to govern different kinds of decisions differently.

The cumulative model is now:

```text
Objective invariant
    → machine block

Known preferred structure
    → generator/default

Contextual architectural trade-off
    → review/ADR

Heuristic concern
    → advisory signal

Temporary deviation
    → expiring exception

Rule no longer fits reality
    → architecture evolution + migration
```

This resolves the apparent conflict between:

- correct-by-construction;
- evolutionary architecture.

The second important result is a clearer definition of agent autonomy:

> **The agent is not forbidden from thinking. It is forbidden from inventing repository facts, expanding its own authority, and silently changing architecture.**

It remains free to:

- reason about implementation;
- produce tests;
- diagnose failures;
- propose architecture changes;
- optimize inside the approved contract.

That is **Bounded Agency**, not code generation.

Finally, the expert’s radical “build TAYMEX first, extract later” recommendation is not adopted because it would repeat a pattern already observed in Harbuk/SARH.

The strongest path remains:

```text
minimal proven governance
→ bounded real TAYMEX slice
→ product-driven platform evolution
→ broader stabilization only after evidence
```

The seventh review therefore does not overturn the platform strategy.

It improves its constitution:

> **Do not automate judgment merely because automation is possible.  
> Automate invariants, expose trade-offs, and keep the architecture evolvable.**

---

## Document Status

- Expert reviews included: **7**
- Current state: **Cumulative / Active**
- Cross-expert convergence: **very strong**
- Strategic direction: **stable after first major philosophical challenge**
- Expert 07’s main accepted additions: Policy Modality, Bounded Agency, architecture-evolution path, Golden Pattern extensibility, agent execution telemetry, bus-factor measurement
- Expert 07’s main rejected recommendation: full TAYMEX-first / platform-extract-later strategy
- Main-plan changes: **not automatically applied from this document**
- Next step after remaining expert reviews: compress all accepted conclusions into a smaller set of constitutional rules and execution amendments.

# 189. Expert 08 — Duplicate / Non-Independent Review

## 189.1 Duplicate assessment

Expert 08 is **substantively the same review as Expert 07**.

The following major elements are repeated with effectively the same argument structure and conclusions:

- not every architectural decision can be automated;
- the “platform vs first consumer” critique;
- the recommendation to build TAYMEX first and extract the platform later;
- “no guessing vs agent intelligence” objection;
- Nx OSS / Enterprise / lock-in critique;
- migration/deprecation concerns;
- agent observability;
- Golden Pages escape-hatch problem;
- L0–L4 critique;
- L2/AppShell concern;
- bus-factor and hidden governance-maintenance cost;
- exception proliferation;
- “three golden rules” governance MVP;
- YAGNI-driven platform recommendation;
- solar/business-critical logic lock recommendation;
- the same final “strategically correct but tactically overbuilt” conclusion.

Because the reasoning is not materially independent, this review must **not** be counted as another expert independently converging on these claims.

---

# 190. Independence Matters in Expert Aggregation

A cumulative expert review can become misleading if duplicated or derivative opinions are counted as separate votes.

Therefore every future review should carry an independence classification where relevant:

```text
INDEPENDENT
PARTIALLY_DERIVED
DERIVED/RESTATEMENT
DUPLICATE
UNKNOWN
```

### Why this matters

Suppose:

- Expert 07 raises concern X;
- Expert 08 repeats the same text;
- Expert 09 paraphrases Expert 07 without new evidence.

Counting all three as:

> “3 experts agree”

would create false confidence.

### Decision

Cross-expert convergence should be based primarily on:

- independent reasoning;
- independent evidence;
- materially different analysis arriving at the same conclusion.

Repetition may strengthen clarity, but not evidentiary weight.

---

# 191. Expert 08 — Decision Impact

## New architectural decisions
**None.**

## New implementation priorities
**None.**

## New risks
**None.**

## New evidence
**None.**

## Changes to Expert 07 evaluation
**None.**

All Expert 07 decisions remain unchanged, including:

### Accepted from Expert 07
- Policy Modality;
- Bounded Agency;
- architecture evolution vs temporary exception;
- Golden Pattern extensibility;
- Agent Execution Telemetry;
- bus-factor/ownership coverage;
- L2 shell mechanism vs product composition;
- risk-based critical-domain owner approval.

### Rejected/corrected from Expert 07
- full TAYMEX-first / platform-extract-later strategy;
- “agent becomes only a generator” argument;
- Nx → Turborepo/Bazel switch without evidence;
- arbitrary three-rule governance rollback;
- unsupported team-size economics generalization;
- blanket no-agent critical-domain rule;
- unsupported “no AI in solar” constitutional claim;
- unsupported 6–12 month platform estimate.

---

# 192. Cross-Expert Convergence — Independence Adjustment

The project has now received **8 numbered reviews**, but only **7 substantively distinct reviews**.

Therefore:

```text
Numbered expert reviews: 8
Substantively independent/distinct reviews: 7
Known duplicate reviews: 1
```

### Important correction

Expert 08 must not increase the convergence count for Expert 07’s unique philosophical objections.

For example, it would be incorrect to say:

> “Two independent experts recommend building all of TAYMEX first and extracting the platform later.”

Based on the material reviewed here, that recommendation remains attributable to **one substantive review position**, repeated twice.

---

# 193. New Meta-Rule: Review Provenance

For any future expert-review corpus, store metadata such as:

```yaml
expertReview:
  id:
  source:
  independence:
  overlapsWith:
  newEvidence:
  newClaims:
  duplicatedClaims:
  confidence:
```

This is especially useful if reviews are generated by:

- related AI systems;
- the same model with different prompts;
- summaries of prior reviews;
- humans who saw previous review conclusions.

### Decision

Do not treat expert count as a voting system.

Use experts to discover:

- missing risks;
- contradictions;
- stronger evidence;
- alternative architectures.

The final decision remains evidence- and project-context-driven.

---

# 194. Priority Order After Expert 08

**No change.**

The current priority sequence remains the one established after Expert 07:

1. Trust Root / Merge Authority.
2. True slice-blocking decisions.
3. Used Wave 2 critical path.
4. Real bounded TAYMEX vertical slice.
5. Slice-scoped Repository Truth + Bounded Agency.
6. Agent Governance + Usability + Execution Telemetry.
7. Artifact/runtime foundations.
8. Historical defect back-test.
9. Triggered deep controls / adapter contract tests.
10. Exception + architecture-evolution + pattern-escape review.
11. Measure economics / bus factor before broader platform expansion.

---

# 195. Updated Open Questions After Expert 08

No new product/platform technical questions are added because the review is duplicate.

One new **review-methodology** question is added:

112. For remaining expert reviews, which are genuinely independent versus generated/paraphrased from earlier reviews, and how should convergence weighting account for this?

---

# 196. Current Working Conclusion After Experts 01–08

Expert 08 does not alter the engineering conclusion.

Its main value is methodological:

> **Repeated text is not repeated evidence.**

The cumulative review should not become a popularity contest.

The strongest architecture after all distinct reviews remains:

```text
minimum proven governance
→ bounded real TAYMEX slice
→ slice-scoped repository truth
→ bounded agent authority
→ product-driven platform evolution
→ stabilization only from real evidence
```

And the constitutional correction introduced by Expert 07 remains valid:

> **Automate objective invariants; do not automate architectural judgment merely because a tool can express a rule.**

Expert 08 adds no independent reason to move toward the rejected extreme:

```text
build full TAYMEX unconstrained
→ extract platform later
```

Nor does it add evidence for abandoning:

- Nx;
- ENGINEERING_PLATFORM;
- existing governance controls;
- the bounded vertical-slice strategy.

---

## Document Status

- Numbered expert reviews included: **8**
- Substantively distinct reviews: **7**
- Duplicate/non-independent reviews: **1**
- Current state: **Cumulative / Active**
- Strategic direction: **unchanged**
- Expert 08 impact: **methodology/provenance only; no new engineering decision**
- Main-plan changes: **not automatically applied from this document**

# 197. Expert 09 — Overall Evaluation

## 197.1 Overall value

Expert 09 is one of the strongest **adversarial governance reviews** in the corpus.

Rather than mainly asking whether product code can violate rules, it asks:

> **Can the agent alter the evidence, context, baselines, verifier inputs, or CI behavior that decide whether it passes?**

That is exactly the right next level after:

- product governance;
- agent governance;
- governance self-consistency.

The strongest new/strengthened concerns are:

1. protection of verification assets;
2. forward self-hosting of ENGINEERING_PLATFORM governance;
3. repository content as untrusted data for agent context generation;
4. separation of infrastructure failure from policy failure in CI;
5. language-neutral constitutional governance vs TypeScript-specific application tooling;
6. evidence provenance for agent/model/task/context versions;
7. terminology-registry lifecycle;
8. explicit platform timebox/foundation exit pressure;
9. ASVS-to-executable-control mapping;
10. test-data/factory strategy for deterministic visual/integration evidence.

Its main weakness is, again, turning several legitimate gaps into prerequisites that should all be completed before the real TAYMEX slice.

The cumulative strategy remains:

> **Protect the trust/evidence path → make the slice-used path real → run the TAYMEX slice → deepen from observed failures.**

---

# 198. Protect the Evidence, Not Just the Product Code

Expert 09 identifies a critical attack surface:

An agent may not need to bypass a product rule if it can instead modify:

- governance tests;
- policy fixtures;
- visual baselines;
- schemas;
- rule definitions;
- CI workflows;
- evidence generation.

### Evaluation

**Strongly accepted.**

This is a direct extension of the Control Plane / Trust Root concern.

### Important correction

A blanket default-deny on all:

```text
tests/**
```

is too broad.

Feature tasks should normally be allowed — and often required — to create/modify **product tests** that belong to the feature.

The protected distinction should be based on **ownership and evidentiary authority**, not the word `tests`.

### Protected proof/control assets

Examples:

```text
governance/**
tooling/governance/**
policy/**
schemas/governance/**
tests/governance/**
tests/conformance/**
baselines/shared/**
visual-baselines/shared/**
.github/**
CODEOWNERS
release-policy/**
```

Exact paths depend on the repository.

### Product/feature test assets

Examples:

```text
features/products/**/*.test.*
apps/taymex/e2e/products/**
```

may be writable when the task contract explicitly includes them.

### Decision

Introduce **Proof Asset Classification**:

```text
PRODUCT_TEST
PLATFORM_CONFORMANCE_TEST
GOVERNANCE_REGRESSION_TEST
SHARED_VISUAL_BASELINE
PRODUCT_VISUAL_BASELINE
CONTROL_PLANE_SCHEMA
```

Authority differs by class.

---

# 199. Baseline Update Is a Distinct Governed Change Class

Expert 09 correctly notes that an agent could “fix” a visual failure by approving a new baseline.

### Evaluation

**Strongly accepted and consistent with the Visual Baseline Governance added after Expert 04.**

### Required behavior

A shared/canonical baseline update should be treated as a distinct change class.

It should require:

- explicit task intent;
- affected screenshot diff;
- owner/reviewer approval for shared components/patterns;
- explanation of why the visual change is intended;
- no unrelated baseline churn;
- exact environment metadata.

### For ordinary feature tasks

The agent may generate **candidate screenshots/artifacts**, but should not silently bless them as the new shared truth.

### Decision

Add `BASELINE_UPDATE` as a governed task/change category.

For product-local baselines, authority may be lower risk than for shared platform baselines, but still explicit.

---

# 200. Forward Self-Hosting — The Platform Must Obey Its Own Governance

Expert 09 raises a “bootstrap paradox”:

> The governance platform itself was initially built before its own mature controls existed.

### Evaluation

**Valid concern, but bootstrap history is unavoidable.**

Every governance system has a bootstrap period.

It is not useful to retroactively invalidate all early code simply because the final verifier did not exist yet.

The right correction is **forward self-hosting**.

### Adopted rule

From the point at which the minimum verifier/trust-root is stable enough:

> **Changes to ENGINEERING_PLATFORM itself must pass the same class of governed task/evidence flow appropriate to their risk.**

### Stronger rule for control-plane changes

Changes to:

- verifier;
- governance schemas;
- CI/rules;
- generators that affect policy;
- shared rule metadata;

require:

- R4/control-plane classification;
- previous trusted verifier or pinned release;
- governance regression corpus;
- owner approval;
- no self-certification by the new verifier alone.

### Decision

Add **Forward Self-Hosting Milestone** before broad future platform evolution.

This is a P0/P1 trust-root item.

---

# 201. Repository Content Is Data, Not Authority

Expert 09 raises prompt/instruction injection through repository content.

This builds directly on the Agent Threat Model introduced after Expert 02.

### Evaluation

**Strongly accepted.**

Files, comments, README fragments, issue text, fixture strings and source comments may contain natural-language text that looks like instructions.

The agent must not treat repository prose as higher-authority governance.

### Required context rule

The generated context should distinguish:

```text
AUTHORITATIVE_MACHINE_TRUTH
APPROVED_TASK_INSTRUCTIONS
REFERENCE_DOCUMENTATION
UNTRUSTED_REPOSITORY_CONTENT
```

### Important principle

> Repository content may describe the system, but it does not grant permissions or override the task/governance contract.

### Context sanitation

Context generation should also avoid exposing:

- secrets;
- raw sensitive setting values;
- credentials;
- tokens;
- production PII;
- restricted files not required by the task.

### Decision

Add **Context Trust Classification + Secret/PII Filtering** to the Agent Execution Threat Model.

---

# 202. Context-Pack Integrity

To make context trust observable, generated context artifacts should carry provenance such as:

```text
taskContractHash
baseRevision
repositoryTruthVersion/hash
projectProfileVersion/hash
ruleRegistryVersion/hash
generatedAt
generatorVersion
```

Where feasible.

### Purpose

This lets later evidence answer:

- What truth did the agent actually receive?
- Was it stale?
- Which governance version produced the context?
- Did a repair run use different truth than the original implementation?

### Decision

Add **Context Pack Integrity Metadata** to the first real agent-run evidence package.

Do not expose secrets or hidden system instructions.

---

# 203. CI Failure Taxonomy: Policy Failure ≠ Infrastructure Failure

Expert 09 identifies a serious operational problem:

If `governance-summary` fails because a runner/network/cache is broken, teams may learn to distrust the same red status used for real policy violations.

### Evaluation

**Strongly accepted.**

### Required failure classes

At minimum distinguish:

```text
POLICY_FAILURE
TEST_FAILURE
SECURITY_FAILURE
INFRASTRUCTURE_FAILURE
TOOLING_FAILURE
CONFIGURATION_FAILURE
UNKNOWN_FAILURE
```

Exact taxonomy can remain smaller initially.

### Merge behavior

A non-policy infrastructure failure should **not** become “pass.”

It still blocks merge until the required evidence exists.

But the remediation is different:

- retry/re-run;
- alternate runner;
- tool recovery.

### Retry policy

Retries should apply only to failure classes that can legitimately be transient.

Never automatically retry a deterministic policy violation until it “happens to pass.”

### Quarantine caution

Do not create a quarantine mechanism that silently removes required protection.

A flaky test may be temporarily isolated only with:

- owner;
- expiry;
- explicit reduced-confidence status;
- compensating control where needed.

### Decision

Add **CI Failure Taxonomy + Transient Retry Policy** before governance becomes heavily relied on in production workflows.

---

# 204. Agent Evidence Metadata — Useful, With Privacy/Authority Limits

Expert 09 recommends recording:

- model;
- version;
- prompt/task-contract hash.

### Evaluation

**Accepted with qualification.**

Useful evidence metadata may include, where available:

```text
agentProvider/tool
modelFamily/modelId
agentHarnessVersion
taskContractHash
contextPackHash
baseRevision
platformGovernanceVersion
generatorVersion
attempt/runId
```

### Do not require

- hidden chain-of-thought;
- private system prompt contents;
- unavailable proprietary internal model metadata.

A hash should only be used for instruction/task artifacts the platform actually owns and can reproduce.

### Why this matters

It enables later questions such as:

- Does model A have higher first-pass success than model B?
- Did failures spike after a harness upgrade?
- Did a governance change reduce drift?
- Which context-pack version produced a recurring mistake?

### Decision

Add **Agent Run Provenance Metadata** to governance evidence.

---

# 205. Multi-Model / Harness Baseline — New Measurement Opportunity

Expert 09 notes that historical diagnosis did not compare different agent/model behaviors.

### Evaluation

**Valid, but not an immediate architecture blocker.**

Once the same bounded task can be reproduced safely, it may be valuable to compare:

- Codex configurations/models;
- context strategies;
- generator usage;
- task-contract verbosity.

### Metrics

- first-valid-diff rate;
- correction loops;
- scope violations;
- component/setting discovery;
- test failures;
- time/cost where measurable.

### Decision

Do not design different governance architectures per model prematurely.

Use a shared governed task and gather comparative evidence later if operationally useful.

---

# 206. Language Scope — A Real Architectural Clarification

Expert 09 asks:

> Is ENGINEERING_PLATFORM TS/JS-only, or is its governance kernel language-neutral?

### Evaluation

**This deserves an explicit decision, but not necessarily a large ADR project before the slice.**

The current architecture already points toward a hybrid answer:

- application/web foundation is TypeScript/React-centric;
- governance intent/manifests/diff/risk should not depend conceptually on React/TypeScript;
- enforcement adapters can be language-specific.

### Recommended constitutional position

> **Application Platform v0.x is TypeScript-first. Governance contracts and policy intent are language-neutral where practical, with ecosystem-specific adapters.**

### Consequences

Language-neutral core concepts:

- task contract;
- risk;
- scope;
- protected paths;
- exception;
- rule IDs;
- project profile;
- diff classification;
- merge evidence.

TypeScript-specific adapters:

- Nx graph;
- TS compiler/symbol truth;
- ESLint UI/import rules;
- Next/React frontend checks.

Future .NET/Python adapters may provide:

- symbol/schema truth;
- dependency boundaries;
- framework-specific checks.

### Decision

Add a concise **Language Scope decision** before describing ENGINEERING_PLATFORM as universal across arbitrary stacks.

No rewrite to Bazel or polyglot implementation is required now.

---

# 207. Release Groups: Governance Core vs UI Foundation

Expert 09 proposes separating governance and React UI releases.

### Evaluation

**Directionally correct and compatible with ADR-002’s compatibility-based release groups.**

Governance/tooling and frontend runtime do not necessarily need synchronized versioning.

### Possible release groups

Conceptually:

```text
governance/tooling
kernel/contracts
settings
web-ui/design-system
optional-capabilities
```

The exact grouping should follow actual compatibility coupling.

### Important rule

Do not create many release groups simply for conceptual neatness.

A group is justified when:

- it evolves independently;
- forcing lockstep versions would create unnecessary upgrades;
- compatibility can be expressed clearly.

### Decision

When first real packages are published, ensure **governance/tooling is not unnecessarily coupled to React UI package versions**.

---

# 208. ASVS Reference Needs Executable Mapping

Expert 09 notes that citing OWASP ASVS is weaker than mapping requirements to implemented controls.

### Evaluation

**Strongly accepted.**

A security standard should not become another large document that “exists.”

### Preferred mapping artifact

For relevant ASVS controls:

```text
ASVS requirement
→ applicable/not applicable
→ platform/project owner
→ gate/test/control
→ evidence
→ exception/non-waivable status
```

### Scope control

Do not map every ASVS item before the first slice if many are irrelevant to the current application surface.

Start from:

- authentication;
- authorization;
- validation;
- session;
- sensitive data;
- API security;
- logging/audit;

as those capabilities appear.

### Decision

Add **Security Control Mapping** when implementing the first security-bearing backend path.

---

# 209. Terminology Registry Needs a Lifecycle

Expert 09 correctly asks:

> Who adds new terminology and how does it remain current?

### Evaluation

**Accepted.**

The existing model covers forbidden aliases and canonical terms, but governance also needs term evolution.

### Suggested term lifecycle

A domain term addition/change should identify:

- canonical term;
- owner/domain;
- definition;
- aliases/forbidden aliases;
- introduced by task/ADR;
- affected schemas/types/events where relevant;
- deprecation/replacement if renamed.

### Blocking behavior

- known forbidden alias → blocking;
- unknown new semantic term → review/advisory initially;
- approved new term → added through governed task.

### Decision

Add **Terminology Lifecycle & Ownership** to terminology governance.

---

# 210. Identity Timing — Important Capability, Wrong as a Separate Pre-Slice Project

Expert 09 argues that Identity should start before the vertical slice because it is on the critical path for most products.

### Evaluation

**Partially accepted.**

Identity/authentication is clearly an important reusable foundation.

But starting a standalone “Identity Capability project” before the TAYMEX slice risks another horizontal expansion.

### Preferred approach

If the selected Products slice requires authenticated admin access — likely — then the slice should pull the **minimum real identity/auth path** it needs:

- user/account;
- session/authentication;
- permission/authorization;
- audit actor.

Do not build in advance:

- social login;
- MFA;
- self-service registration;
- verification flows;
- complex Keycloak integration;

unless required.

### Decision

Identity remains **slice-pulled**, not a separate prerequisite wave.

---

# 211. Settings Engine Minimum — Strong Convergence

Expert 09 recommends implementing:

- Resolver;
- typed access;
- saved-but-not-applied diagnostics.

### Evaluation

**Strongly accepted and consistent with all prior reviews.**

This should occur when the first slice introduces a real governed setting.

### Minimum first-slice setting proof

For one real setting:

1. canonical registry entry;
2. generated/typed accessor;
3. effective resolver;
4. actual runtime consumer;
5. provenance/explain;
6. hardcode/duplicate prevention;
7. consumer declaration;
8. diagnostic evidence that the value is actually applied.

### Strong deliberate test

Temporarily remove/bypass the runtime consumption and confirm the diagnostic or contract test fails.

### Decision

Add **Saved-but-not-applied Negative Test** to first settings-enabled slice.

---

# 212. Impact Graph — Build the Smallest Useful Version

Expert 09 recommends an initial Impact Graph from manifests/imports to make Repair Protocol executable.

### Evaluation

**Accepted with scope control.**

The full impact engine belongs to later Repository Truth work.

But a small first version may be justified by the slice/repair flow.

### Initial signals

- package/project graph;
- TS imports;
- module manifests;
- component consumers;
- settings consumers;
- public API consumers where available.

### Output

For a changed shared component/contract:

- known direct consumers;
- affected projects/tests;
- confidence level.

### Decision

If the first real repair/shared change needs it, implement a **Direct Consumer Graph** first.

Do not build transitive universal semantic impact analysis upfront.

---

# 213. Test Data / Fixture Strategy — Useful New Gap

Expert 09 points out that visual/integration tests require stable realistic data.

### Evaluation

**Accepted.**

Without deterministic fixtures/factories:

- screenshots become noisy;
- integration tests become brittle;
- localization/edge cases remain untested;
- agents may invent inconsistent setup.

### Preferred approach

The platform may provide small reusable test primitives:

- deterministic IDs;
- fixed clock;
- locale-aware sample factories;
- standard error/offline fixtures;
- data reset helpers.

TAYMEX owns domain factories:

- Product;
- category;
- solar-domain data.

### Decision

Add **Deterministic Test Fixture Strategy** to the first real slice, but only for data it actually uses.

---

# 214. Pending Library Decisions — Do Not Turn Them All Into Pre-Slice ADRs

Expert 09 lists:

- ORM;
- Forms;
- Table;
- Data fetching;
- Charts;
- Fonts;
- i18n runtime;
- registry.

### Evaluation

The general warning is correct:

> Choices should not be made accidentally inside an agent diff.

But not every library needs an ADR before the first task.

### Decide before use

For the first Products slice, likely slice-blocking choices include:

- backend/data access/ORM if backend is separate;
- form approach;
- table/list approach;
- i18n runtime;
- font baseline;
- artifact/package transport.

### Defer until requirement

- charts;
- advanced data visualization;
- search stack;
- offline cache architecture.

### Decision

Use **Decision-on-First-Use**, not “ADR everything now.”

Each consequential dependency addition is already default-denied, creating the appropriate review point.

---

# 215. Timebox / Foundation Exit Budget

Expert 09 strongly emphasizes the economic risk:

> A good platform may consume the product.

### Evaluation

**Strongly accepted.**

Prior experts already converged on exit criteria and platform economics.

Expert 09 sharpens this into a need for a visible **Foundation Budget/Timebox**.

### Important caution

Do not invent an arbitrary duration without team capacity data.

### Better control

Set:

- a bounded list of pre-slice prerequisites;
- no new horizontal capability unless it closes a slice blocker;
- target dates/effort budget chosen by the actual team;
- explicit “foundation extension” approval if the budget is exceeded;
- weekly metric of platform work vs product-slice progress.

### Foundation Exit

The platform leaves “foundation mode” when the real slice demonstrates:

- governed agent task;
- artifact boundary;
- real UI/runtime;
- real auth/settings/audit path as used;
- acceptable friction;
- negative/bypass tests;
- merge evidence.

### Decision

Add **Foundation Budget + Exit Gate** to the execution plan.

---

# 216. Self-Hosting Does Not Mean Infinite Meta-Governance

Forward self-hosting introduces a danger:

If every rule change requires ever-more rules to govern rule changes, the system can recurse indefinitely.

### Stopping rule

Self-hosting only needs enough protection to ensure:

- control-plane changes are explicitly classified;
- trusted previous verifier evaluates them;
- regression corpus detects weakening;
- owner authority is independent;
- evidence is retained.

It does not require a second governance platform.

### Decision

Keep meta-governance bounded.

---

# 217. Expert 09’s Reported Wave 2 Test Counts

Expert 09 again reports:

- 12 + 8 governance tests;
- 18 visual scenarios;
- 768px overflow detection.

### Evaluation

The cumulative evidence rule remains unchanged:

- official Wave 0–1 12-test report: verified;
- additional Wave 2 counts: **expert-reported until direct verification artifact is located**.

### Decision

Do not let repetition from multiple experts convert an unverified claim into verified project truth.

This also demonstrates why the expert-independence rule from Expert 08 matters.

---

# 218. Expert 09’s “Backend/Identity = zero” and Other Implementation Status Claims

### Evaluation

These claims may accurately describe the reviewed snapshot, but should be treated as **snapshot/report claims** unless backed by current repository inspection/verification evidence.

The cumulative review should avoid turning old snapshot status into permanent architecture truth.

### Decision

When moving from review to implementation amendments, refresh current repository state first.

---

# 219. Top Risks After Expert 09 — Adjusted

Expert 09’s risk list is useful, but the cumulative ordering becomes:

## P0 risks

1. **Control/proof assets can be modified by the same task they certify.**
2. **Merge authority/trusted verifier not actually enforced in real repo.**
3. **No real agent-in-the-loop consumer proof yet.**
4. **Platform work expands faster than TAYMEX validation progress.**

## High risks

5. **Repository Truth insufficient for used model/API/data contracts.**
6. **Settings resolver/consumer diagnostics not proven.**
7. **Backend/authz/concurrency/idempotency remain weakly proven.**
8. **CI flakiness/infrastructure failures could erode trust.**
9. **Visual baseline approval/churn can become a bypass.**
10. **Owner/bus-factor bottleneck.**

## Later/shared-platform risks

11. distribution/upgrade;
12. shared-schema migrations;
13. deprecation/stability;
14. engineering supply-chain continuity.

### Decision

This ordering reinforces — rather than changes — the current slice strategy.

---

# 220. Updated Priority Order After Experts 01–09

Expert 09 adds several P0/P1 hardening items.

## P0A — Trust Root / Proof Asset Protection

- trusted verifier/base;
- protected control-plane files;
- protected governance/conformance tests;
- protected shared baselines;
- required merge status;
- governance regression corpus;
- baseline-update task class.

## P0B — Forward Self-Hosting

- all new ENGINEERING_PLATFORM changes enter governed task flow;
- control-plane changes validated by previous trusted verifier;
- no self-certification.

## P1 — Context and Failure-Mode Safety

- repository content classified as data, not authority;
- context pack secret/PII filtering;
- context integrity metadata;
- CI failure taxonomy/retry rules.

## P2 — Slice-Blocking Decisions

Only:
- backend topology if needed;
- language-scope statement;
- package/artifact transport;
- task authority;
- minimal project profile;
- first-use libraries actually required.

## P3 — Used Wave 2 Critical Path

- real UI/runtime;
- used Storybook/component truth;
- a11y/RTL/responsive;
- baseline governance.

## P4 — Real TAYMEX Vertical Slice

No change.

## P5 — Slice-Scoped Repository Truth + Agent Evidence

- Product/API/data truth used by slice;
- invalid field assumption test;
- agent run provenance;
- bounded agency.

## P6 — Agent Governance + Usability + Telemetry

- first-valid-diff;
- correction loops;
- rule failures;
- drift attempts;
- manual clarification;
- model/harness metadata where available.

## P7 — Runtime Foundations Pulled by Slice

- minimal identity/authz;
- settings resolver;
- saved-but-not-applied negative test;
- audit/errors/logs;
- pagination/query evidence.

## P8 — Historical/Adversarial Evidence

- evidence-confidence back-test;
- governance bypass corpus;
- proof-asset attacks;
- prompt/context injection scenarios.

## P9 — Repair / Impact / Exception

- direct consumer graph if needed;
- repair loop;
- exception drill;
- architecture evolution path.

## P10 — Foundation Exit Review

Measure:

- platform work vs product progress;
- agent success;
- gate latency;
- false positives;
- exception debt;
- owner wait;
- maintenance cost.

Only after success deepen/generalize Wave 3/4.

---

# 221. New Decisions Worth Carrying Forward From Expert 09

1. **Proof Asset Classification** — not all tests/baselines have the same authority.
2. **Baseline Update as a governed change class.**
3. **Forward Self-Hosting** for ENGINEERING_PLATFORM.
4. **Repository Content = Data, not governance authority.**
5. **Context Trust Classification + secret/PII filtering.**
6. **Context Pack Integrity Metadata.**
7. **CI Failure Taxonomy** separating policy from infrastructure/tooling failures.
8. **Agent Run Provenance Metadata.**
9. **TypeScript-first application platform + language-neutral governance contracts.**
10. **Governance/tooling release independence from UI where coupling does not require lockstep.**
11. **ASVS → executable security-control mapping.**
12. **Terminology Lifecycle & Ownership.**
13. **Saved-but-not-applied negative test.**
14. **Deterministic Test Fixture Strategy.**
15. **Foundation Budget + Exit Gate.**

---

# 222. Expert 09 Claims Requiring Correction

1. **“Protect all tests/** from feature tasks.”**  
   Too broad. Protect governance/conformance/shared proof assets; feature tests are task-owned evidence.

2. **“The platform must be considered invalid because it was initially built before self-hosting.”**  
   Bootstrap is unavoidable. Adopt forward self-hosting now.

3. **“Identity must become a standalone phase before the slice.”**  
   Pull the minimum identity/auth path through the real slice.

4. **“Distribution should be proven with a second mini-project before TAYMEX.”**  
   TAYMEX itself is the real independent consumer. Synthetic second consumer remains later.

5. **“Impact Graph must be fully built before Repair Protocol can start.”**  
   Start with direct known consumers when needed; generalize later.

6. **“All pending libraries require immediate ADRs.”**  
   Decide consequential dependencies on first use; defer irrelevant stacks.

7. **“Every critical SARH primitive must be built into Kernel before first backend feature.”**  
   Pull only the controls relevant to the selected real flow; do not create generic primitives without need.

8. **“All reported Wave 2 test counts are verified.”**  
   Not yet; retain evidence discipline.

9. **“A monthly drift rate baseline must exist before using the system.”**  
   Begin collecting from the first real agent/slice; baseline emerges from data.

10. **“TS-only vs fully polyglot is a binary architecture choice.”**  
    Better: TS-first application platform with language-neutral governance contracts/adapters.

---

# 223. Updated Open Questions After Expert 09

113. Which exact files are control/proof assets that ordinary feature tasks may never modify?
114. Which product tests are legitimately writable by a feature task, and how is that distinguished from governance tests?
115. What task type and approval path governs shared visual-baseline updates?
116. From what commit/milestone does ENGINEERING_PLATFORM begin mandatory forward self-hosting?
117. How will a new verifier version be validated by the previous trusted verifier?
118. What context-pack fields are authoritative machine truth versus untrusted repository text?
119. What secret/PII filters are required before Repository Truth/context generation runs on real projects?
120. Which context-pack hashes/versions are needed for reproducible agent evidence?
121. What CI failure taxonomy will the first real repository expose?
122. Which failure classes may be auto-retried, and how many times?
123. What is the explicit language-scope statement for ENGINEERING_PLATFORM v0.x?
124. Which governance contracts must remain language-neutral from the start?
125. Which release groups should first packages actually use, and which would be unnecessary fragmentation?
126. Which ASVS requirements apply to the first authenticated Products slice and what evidence proves them?
127. What is the approval lifecycle for adding/renaming a canonical domain term?
128. What deterministic test fixtures are required for Products CRUD, localization and visual evidence?
129. What is the Foundation Budget/exit condition chosen by the actual team?
130. Which metrics demonstrate that foundation work is no longer consuming product progress?
131. Which current implementation-status claims from expert reviews need repository refresh before roadmap amendments?

---

# 224. Current Working Conclusion After Experts 01–09

Expert 09 materially strengthens the **trust boundary** of the platform.

The important new insight is:

> **A gate is meaningless if the same task can rewrite the ruler, the exam, or the answer key.**

Therefore governance authority must protect not only product boundaries but also:

- the verifier;
- governance tests;
- conformance corpus;
- shared baselines;
- policy schemas;
- CI authority.

At the same time, protection must remain precise.

A feature agent must still be allowed to write the tests that prove its own feature behavior.

The distinction is:

```text
Feature writes product evidence
but cannot redefine constitutional evidence
that decides what “passing governance” means.
```

The second important addition is forward self-hosting:

> **ENGINEERING_PLATFORM should now practice the governance discipline it imposes on consumers.**

Not retroactively, and not through infinite meta-governance — but from a defined milestone forward.

The third addition is operational:

> **A red CI result must explain whether the code violated policy or the infrastructure failed to produce evidence.**

Both block merge, but they require different remediation.

Finally, Expert 09 reinforces the strongest existing conclusion:

> The next proof is not another ADR or broad Wave. It is a real agent, real TAYMEX slice, real protected evidence path, and measured friction.

After nine numbered reviews (eight substantively distinct), the strategic direction remains stable.

What has changed is the precision of the constitutional boundary around that strategy.

---

## Document Status

- Numbered expert reviews included: **9**
- Substantively distinct reviews: **8**
- Known duplicate reviews: **1**
- Current state: **Cumulative / Active**
- Cross-expert convergence: **very strong**
- Strategic direction: **stable**
- Expert 09’s strongest additions: proof-asset protection, baseline-update authority, forward self-hosting, context trust classification, CI failure taxonomy, agent provenance, language-scope clarification, foundation exit budget
- Main-plan changes: **not automatically applied from this document**
- Next step after remaining expert reviews: consolidate the distinct accepted conclusions into a smaller constitutional amendment set and first-slice execution checklist.
