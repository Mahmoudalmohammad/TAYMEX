# F8 UI/UX and Browser Foundation Real Proof

## Evidence state

**PROVEN**

F8 was executed on the exact committed consumer and platform revisions below using the pinned local toolchain, real PostgreSQL 18 regressions, a real production Next.js process, and real Chromium/CDP browser automation. This proof is attached to the tested runtime SHAs; the separate closure commit records the result without modifying the proven runtime/UI implementation.

## Tested revisions and toolchain

```text
TAYMEX F8 proven HEAD:          545c8733ef99d1f9bf2a2c95565a35dd8ebec97a
ENGINEERING_PLATFORM proven:    f95612d51c2f5b724c62e8cbc782189970802777
Node:                           v24.14.0
pnpm:                           11.24.0
Python:                         3.12.3
PostgreSQL:                     18.6 (Debian 18.6-1.pgdg13+2)
server_version_num:             180006
Chromium:                       Chrome/149.0.7827.114
```

The returned canonical workspace artifact reviewed for closure is:

```text
TAYMEX_WORKSPACE_F8_PASSED_FINAL_R11.zip
SHA-256: 37bc36752e51e1ff152db74955b14a005c7b1c21d6915207ba626d87f65eedd1
embedded proof directory: .local-validation-results/f8_20260830_132322
```

Its proof manifest deliberately records the pre-closure state:

```text
FOUNDATION_STAGE=F8
F8_STRUCTURAL_VERIFICATION=PASS
F8_BROWSER_PROOF=PASS
F8_POSTGRES_REGRESSIONS=PASS
CONSUMER_BOUNDARY=PASS
HANDOFF=PASS
F8_REAL_PROOF=PASS
F8_CLOSED=NO
F9_STARTED=NO
```

The runtime proof therefore happened before this separate governed closure step.

## Clean install, build, typecheck, and regressions

On the tested exact SHAs, the F8 validation campaign passed the complete local runner, including:

- pinned Node/pnpm/Python/Docker/Chromium toolchain checks;
- Git exact-SHA identity, clean worktrees, and strict repository integrity checks;
- ENGINEERING_PLATFORM bootstrap, artifact generation, AppShell contract checks, pattern admission, Repository Truth, governance, and trust segments;
- clean TAYMEX install;
- topological internal-package build;
- strict web typecheck before application build;
- production builds for API and Next.js web;
- workspace typecheck and package/unit regressions;
- F0-F8 structural verifiers, with F8 reporting `88/88 PASS`;
- Consumer Boundary verification;
- PostgreSQL 18 migrations, idempotency, and F4/F6/F7 real regressions;
- real F5 HTTP regressions and API health process smoke;
- final Governance, Trust, Consumer Boundary, Handoff, and exact-SHA integrity.

## Real Chromium/CDP proof

The production Next.js process started successfully and the browser proof used Chromium `Chrome/149.0.7827.114`. The representative exact-SHA scenarios passed:

```text
ar-mobile   390x844    RTL    light/dark
tr-tablet   768x900    LTR    light/dark
en-desktop  1440x1000  LTR    light/dark
```

Observed browser evidence includes:

- root locale redirect;
- document `lang` and `dir`;
- one `h1` and one main landmark;
- no mobile horizontal overflow;
- mixed-script sample using `dir=auto`;
- locale-specific number, currency, date, and unit formatting;
- real design-token values;
- accessibility-tree smoke with zero unnamed interactive nodes;
- mobile drawer focus movement and Escape focus restoration;
- desktop/tablet sidebar collapse;
- dark theme switching;
- reduced-motion computed transition/animation duration of `0s`;
- six retained browser screenshots with SHA-256 evidence.

The Arabic sample rendered localized digits and `٥°م`; Turkish and English rendered their own locale-specific number/currency/date values.

## Runtime defects discovered and repaired before final proof

The local bounded-repair campaign exposed defects that structural checks alone had not caught, including:

- invalid `Intl.NumberFormat` unit usage;
- React Server Component serialization of a function-valued translation helper;
- React Aria field status slot misuse;
- mobile horizontal overflow;
- undersized touch targets;
- reduced-motion timing behavior;
- mobile drawer focus behavior;
- proof-runner/runtime integration defects such as package build order and the API health route.

Each source defect was repaired in committed bounded changes before the final exact-SHA proof. The final tested TAYMEX and ENGINEERING_PLATFORM worktrees were clean.

## Governance, trust, artifact boundary, and handoff

The final proof package contains passing task-governance and trust evidence for the full F8 implementation/repair chain, including the final consumer and platform accessibility/touch/responsive repair commits. The final Consumer Boundary reports locked runtime artifacts as verified with no escapes, and Handoff reports both repositories at the exact proven SHAs with clean Git state and `status: verified`.

The object databases reported unreachable/dangling objects during `git fsck`; the command exited successfully and the objects are not reachable from the proven HEADs. They do not represent corruption of the committed history.

## Scope boundary

F8 proves the used UI/frontend foundation and representative browser/runtime behavior. It does **not** claim:

- exhaustive coverage of every locale × viewport × theme permutation;
- full assistive-technology certification across every browser/OS/device;
- production remote merge authority or deployment proof;
- backup/restore proof;
- production capacity or SLO proof;
- public storefront/SEO production readiness;
- F9 operations/delivery/recovery maturity;
- F10 integrated final production proof.

Those later obligations remain explicit.

## Closure decision supported by this proof

The exact-SHA evidence is sufficient to promote:

- `localization.i18n-bidi-formatting`;
- `ui.design-tokens-theme-typography`;
- `ui.shell-navigation`;
- `ui.components-patterns-states`;
- `ui.responsive-rtl-accessibility-visual`;
- `testing.integrated-harness`

from `IMPLEMENTED` to `PROVEN` for the declared F8 scope and to close F8. Advancing `foundation.currentStage` to `F9` means **F9 is ready to begin**; it does not promote F9 operations/recovery/public-web capabilities or claim production readiness.
