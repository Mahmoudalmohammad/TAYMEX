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

## Honest maturity

The structural implementation can move relevant F8 capabilities to `IMPLEMENTED`. `PROVEN` requires exact-SHA Node 24 build/typecheck, Chromium runtime checks across AR/TR/EN and representative mobile/tablet/desktop widths, RTL/LTR assertions, keyboard/focus/accessibility smoke, reduced-motion, theme switching, overflow/layout checks and screenshot evidence. F8 remains open until that evidence is returned and reviewed.
