# BillBhai

A billing and inventory application for Indian small businesses. React 19 +
Vite frontend (`front-end/`), Express 5 + PostgreSQL backend (`back-end/`).

## Primary UX goal

Create a bill as quickly as possible. The core loop is:

```
PRODUCT → SEARCH OR BARCODE SCAN → ADD TO BILL → PAYMENT → INVOICE → INVENTORY UPDATE
```

Everything else supports that loop.

## Design principles

- Fast, dense but readable, mobile-first, professional.
- Strong typography with a real type hierarchy; clear ₹ numeral emphasis.
- Avoid generic SaaS aesthetics: no card spam, no card-within-card layouts,
  no unnecessary gradients, no decorative UI without function.
- Excellent dark mode built on semantic tokens (`--background`, `--surface`,
  `--foreground`, `--border`, …) — not an inverted white theme. Light/Dark/
  System modes persisted, no flash on load.
- Every important interaction has loading / error / success states.

## Engineering rules

- Preserve existing backend API contracts unless a feature genuinely
  requires changing them. Do not rewrite the backend for frontend reasons.
- Do not introduce unnecessary dependencies; do not duplicate business
  logic (totals, discounts and stock math live server-side).
- All SQL is parameterized; money is `numeric(x,2)`; schema changes go
  through versioned SQL migrations in `back-end/src/db/migrations` only.
- New features require tests (`npm test` in `back-end/`). Backend changes
  are not done until unit + integration tests pass.
- Do not consider a task complete until it has been browser-tested.
- Never commit real credentials; secrets live only in `.env` (gitignored)
  or host environment settings.

## Domain invariants

- Barcode scan must add products to the bill rapidly; inventory must stay
  synchronized with sales (checkout decrements stock transactionally and
  writes `stock_movements`; stock can never go below zero).
- Tenant isolation: every business table carries `company_id`; staff are
  pinned to their token's company; only superusers may override it.
- Business-facing IDs keep their formats (`ORD-4830`, `BILL-003`, `P001`);
  they are generated database-side from sequences.

## Deliberately out of scope (do not build yet)

Payroll, HR, accounting ledgers, supplier ERP, multi-branch management,
complicated permissions, accounting integrations. Get the core billing loop
incredible first.
