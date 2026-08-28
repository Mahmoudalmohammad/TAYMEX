# TAYMEX Products Vertical Slice v0

## Status

Validation slice specification. This is deliberately **not** the final commerce/catalog domain model.

The purpose of this slice is to prove the independent TAYMEX consumer, governance loop, runtime foundations, Product truth, authorization, settings, audit, multilingual UI, and repair behavior with the smallest useful real feature.

## Source basis

The slice is grounded in the existing TAYMEX material:

- the approved website proposal requires a multilingual AR/TR/EN product catalog/store, product classification, product pages, specifications, images, prices, and later purchase-or-quotation behavior;
- the current UGP 2026 catalog set contains these real product families:
  - solar panels;
  - lithium batteries;
  - high-voltage lithium batteries;
  - inverters;
  - building-integrated photovoltaic systems (BIPV);
- real catalog model identifiers include examples such as `UGP6R-78HBC`, `UGP6-66HBD`, and `UGP75K-GP-LV-G10`.

## Slice-only domain decisions

These decisions are intentionally narrow and may evolve later. They are not promoted to ENGINEERING_PLATFORM.

### Product fields

- `id`: UUID, technical identity.
- `modelCode`: required catalog/model code, trimmed, unique case-insensitively.
- `category`: one of the five current source-backed product-family codes:
  - `solar-panel`
  - `lithium-battery`
  - `high-voltage-lithium-battery`
  - `inverter`
  - `bipv`
- `name.ar`, `name.tr`, `name.en`: required localized display names for the enabled TAYMEX locales.
- `priceAmount`: optional decimal monetary amount; binary floating-point is not used for persistence/business comparison.
- `priceCurrency`: optional ISO-style three-letter currency code; it is required exactly when `priceAmount` is present.
- `publicationStatus`: `draft | published | archived`.
- `version`: positive integer optimistic-concurrency version.
- `createdAt`, `updatedAt`: server timestamps.

### State rules

- New products start as `draft` unless explicitly created as `published` with valid complete data.
- `archived` is the removal behavior for this slice; physical delete is not part of v0.
- Archived products may not be modified except by a later explicitly approved restore feature; restore is out of scope now.
- Updates require the caller's expected `version`; stale writes fail with a conflict rather than silently overwriting a newer change.

### Price rules

- `priceAmount` and `priceCurrency` are both absent or both present.
- A present price must be non-negative.
- No global/default currency is invented in this slice.

## Admin operations in scope

- Paginated Products list.
- Read Product details.
- Create Product.
- Edit Product.
- Change publication status to `draft`, `published`, or `archived` subject to state rules.
- Search by model code or localized name is optional only if it does not expand the slice; bounded pagination is mandatory.

## Authorization truth for v0

Two product-domain permissions are canonical:

- `catalog.products.read` — read/list Product administration data.
- `catalog.products.manage` — create/edit/change publication status.

The slice must prove a positive and negative authorization case. The implementing agent must not invent role-name checks such as `role === 'admin'` in domain code.

## Settings truth for v0

The first real runtime setting is:

- `catalog.products.defaultPageSize`
  - integer;
  - platform/project scopes only;
  - `OVERRIDE` resolution;
  - default `25`;
  - governed range `1..100` at runtime;
  - effective value must be explainable with source/provenance.

A client-provided `pageSize` may request a smaller/different value but must remain bounded to `1..100`. The setting is the default, not permission to run unbounded queries.

## Audit requirement

Every successful mutation must create an audit record containing at least:

- action;
- actor/principal identity;
- Product id;
- timestamp;
- previous/new version where applicable;
- changed fields or status transition without leaking secrets.

The audit mechanism is a reusable foundation mechanism; Product-specific action names remain TAYMEX domain semantics.

## API/runtime expectations

The NestJS/Fastify Core API owns Product business rules, authorization decisions, persistence transactions, settings consumption, audit-producing mutations, and optimistic concurrency.

Next.js owns presentation and consumes the approved API contract; it must not duplicate Product invariants.

The Product HTTP contract must become machine-readable during implementation. Hand-written duplicate frontend DTOs are not accepted as the final slice state.

## UI proof

The admin UI must use the platform artifacts already consumed by TAYMEX, including canonical table/form/button/page patterns where suitable.

Representative proof must cover:

- Arabic RTL;
- English LTR;
- Turkish LTR where text/layout risk differs;
- mobile width and desktop width;
- loading/empty/error/permission-denied states where applicable;
- accessibility for used controls.

## Explicitly out of scope

- image/media upload;
- technical-specification editor;
- category CRUD;
- inventory/stock;
- variants;
- supplier management;
- cart/checkout/orders;
- payment;
- purchase-vs-quotation sales-mode rules;
- public storefront Product page;
- SEO;
- AI;
- solar sizing/compatibility calculations;
- multi-tenancy;
- hard delete;
- restore archived Product.

These are not forgotten requirements; they are intentionally excluded from this validation slice.

## Slice completion evidence

The complete slice is not accepted until it demonstrates:

1. governed Task Contract and trusted base;
2. real Product model/API/data truth for the fields actually used;
3. bounded pagination using the effective setting;
4. authorization positive + negative cases;
5. runtime validation and domain invariants;
6. optimistic-concurrency conflict case;
7. audit evidence for mutation;
8. canonical multilingual UI;
9. no platform source-link or local canonical UI fork;
10. a real `prepare -> implement -> verify -> fail/fix -> pass` run when Codex is available;
11. at least one deliberate invalid Product-field assumption is rejected after canonical truth exists;
12. measured task/gate friction and manual intervention count.
