# F8 UI/UX Foundation

## Scope

F8 completes the used UI/UX foundation without creating a second design system inside TAYMEX. TAYMEX consumes versioned, hash-locked design tokens, UI components, UI patterns, and AppShell artifacts. Component discovery and theme token truth come from those verified artifacts; the former copied `.platform/catalog` tree is removed.

## Enforced design decisions

- One semantic token/theme source drives color, typography, spacing, density, radius, elevation, z-index, focus and motion.
- TAYMEX owns one governed project theme profile; generated theme CSS is not edited by hand.
- Arabic, Turkish and English routes set the document `lang` and `dir` from the route locale rather than a hard-coded root value.
- Shared form controls expose explicit default, focus, validation, disabled and loading behavior rather than feature-local control styling.
- Navigation uses the shared AppShell: desktop collapse changes presentation only, while the mobile surface is a dismissible modal navigation with focus management.
- Tables, search, pagination, tabs, upload, password, single/multiple-choice controls, feedback, toast, modal, empty and loading states are demonstrated through platform primitives/patterns on one real TAYMEX reference route.
- Motion is semantic, bounded and compatible with reduced-motion preferences. Hover is not required to discover primary actions.
- Visual verification is representative rather than an exhaustive locale × theme × viewport cross product. Browser evidence is required before F8 closure.
- Higher-cost interaction patterns remain conditional/deferred until a real consumer requires them; the platform pattern-admission registry is the decision record rather than a mandate to build every pattern.

## Real-consumer route

`/{locale}/foundation/ui` is the F8 proof surface. It is not a parallel product UI or a component fork; it imports the exact locked platform artifacts used by application pages.

## Exact-SHA proof and closure

The final bounded local-repair campaign proved the used F8 foundation on exact TAYMEX revision `545c8733ef99d1f9bf2a2c95565a35dd8ebec97a` and ENGINEERING_PLATFORM revision `f95612d51c2f5b724c62e8cbc782189970802777` with Node `v24.14.0`, pnpm `11.24.0`, PostgreSQL `18.6`, and Chromium `149.0.7827.114`. The full runner passed build/typecheck/tests, F0-F8 structural verification, PostgreSQL regressions, real HTTP/API process smoke, representative AR RTL / TR-EN LTR browser scenarios, light/dark theme, reduced motion, responsive overflow, touch/focus/accessibility smoke, screenshots, Governance, Trust, Consumer Boundary, Handoff, and final exact-SHA integrity.

The accepted proof is recorded in `docs/evidence/F8_UI_UX_REAL_PROOF.md`. Therefore the F8 capabilities proven by this campaign are promoted to `PROVEN`, F8 is **CLOSED**, and `foundation.currentStage` advances to `F9`. This closure does not modify the runtime/UI code that was proven and does not imply F9 operations, backup/restore, remote merge authority, public-web, or production readiness.
