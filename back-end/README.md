# BillBhai Back-End API

Express 5 REST API for the BillBhai retail POS system, persisted to PostgreSQL.

```
request → route (src/routes) → service (src/services) → repository (src/repositories) → PostgreSQL
```

## Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14 (local dev assumes Homebrew: `brew install postgresql@15`)
- A running PostgreSQL server (`brew services start postgresql@15`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env — set DATABASE_URL (and TEST_DATABASE_URL for tests).

# 3. Create the app role + databases (one-time; adjust passwords as you like)
psql postgres -c "CREATE ROLE billbhai_app LOGIN PASSWORD '<your-local-dev-password>';"
psql postgres -c "CREATE DATABASE billbhai OWNER billbhai_app;"
psql postgres -c "CREATE DATABASE billbhai_test OWNER billbhai_app;"

# 4. Apply migrations and seed demo data
npm run db:setup
```

## Run

```bash
npm run dev         # development with watch (migrates + seeds first)
npm start           # migrate + seed + serve — safe on every boot
npm run start:only  # just the server, no migration/seed step
npm run start:prod  # NODE_ENV=production npm start
```

`npm start` applies pending migrations and the idempotent seed before serving,
so a fresh environment (or a fresh hosted database) self-configures on first
boot. Set `SKIP_DB_SEED=1` to skip demo data for real deployments. Both steps
are safe to re-run: migrations are tracked in `schema_migrations`, and the seed
never touches existing rows.

The API runs on `http://localhost:3000` by default. `GET /api/health` reports
`database: "up"|"down"` alongside process liveness.

The server verifies database connectivity at boot and exits with a clear
error if PostgreSQL is unreachable. SIGINT/SIGTERM drain HTTP connections and
close the pool before exiting.

## Deploying to Render (or any host)

1. Create a managed **PostgreSQL** instance in the same region as the web
   service.
2. In the web service → **Environment**, set:
   - `DATABASE_URL` — the database's *Internal* connection string.
   - `JWT_SECRET` — e.g. `openssl rand -hex 32`. Required; no fallback warning
     becomes an error you want to avoid.
   - `SKIP_DB_SEED=1` — optional, to deploy without demo accounts/data.
3. Start command: `npm start` (default). First boot runs migrations + seed
   against the hosted database automatically; later boots are no-ops.
4. If your provider requires TLS on external URLs (`PGSSL=require`) — not
   needed for internal Render URLs.

## Database

| Command | What it does |
|---|---|
| `npm run db:migrate` | Applies pending SQL migrations from `src/db/migrations` |
| `npm run db:seed` | Idempotent demo-data seed (never touches existing rows) |
| `npm run db:setup` | Migrate + seed |

Migrations are plain SQL files applied once each inside a transaction,
tracked in `schema_migrations`, serialized by an advisory lock. A fresh
PostgreSQL database is fully reproducible with `db:migrate`.

### Schema overview

- **companies** — tenants. Every business table carries `company_id`.
- **users** — staff accounts; bcrypt `password_hash`, unique username, role
  CHECK (`superuser|admin|cashier|customer|inventorymanager|deliveryops|returnhandler`).
- **customers** — per company; phone numbers unique per company (partial
  unique index so phoneless walk-ins are allowed).
- **suppliers** — shared catalog reference data.
- **products** — `supplier_id` optional; `company_id NULL` = shared item;
  barcode unique.
- **inventory** — one row per (product, company); `stock >= 0` enforced;
  partial index serves `/inventory/low-stock`; derived stock *status* is
  computed at read time, never stored.
- **stock_movements** — append-only ledger of why stock changed (`sale`,
  `adjustment`, …), written in the same transaction as the change itself.
  `GET /api/inventory/product/:productId/movements` reads it newest-first.
- **products** also carry `gst_rate` / `purchase_price` for GST line items
  and profit reporting; `GET /api/reports/top-products?days=30&limit=10`
  aggregates best sellers from order history.
- **orders / order_items** — order history keeps customer name/address
  snapshots, so deleting a customer never rewrites history.
- **bills** (1:1 orders) / **payments** (1:1 bills) — billed orders cannot be
  deleted; payments cascade only from their bill.
- **deliveries** — cascade from their order.
- **returns** — financial audit records; survive order deletion (`SET NULL`).

Money columns are `numeric(x,2)`; timestamps are `timestamptz`;
`updated_at` is maintained by trigger. Business-facing IDs are human-readable
codes (`ORD-4830`, `BILL-003`) generated database-side from sequences.

## Test

```bash
npm test               # unit + integration (integration rebuilds billbhai_test)
npm run test:unit      # pure logic tests, no database needed
npm run test:integration
npm run test:smoke     # against a RUNNING server (start it first)
```

Integration tests drop and recreate the schema in `$TEST_DATABASE_URL`
(`billbhai_test`) on every run — never point that variable at your dev or
production database.

## Key API Modules

`auth`, `companies`, `users`, `customers`, `products`, `suppliers`,
`inventory`, `orders` (+ `bills`, `payments`), `deliveries`, `returns`,
`reports`.

## Seeded Demo Logins

Login accepts either a **username** or an **email address**
(`admin` or `admin@billbhai.com`). Passwords are bcrypt-hashed at rest;
these plaintext values exist only as seed inputs.

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | admin |
| `cashier` | `cashier123` | cashier |
| `inventorymanager` | `inventory123` | inventorymanager |
| `deliveryops` | `delivery123` | deliveryops |
| `returnhandler` | `return123` | returnhandler |
| `chirag` | `chirag1234` | superuser |
| `customer` | `customer123` | customer |

### Self-serve registration

`POST /api/auth/register` creates a company and its admin user in one
transaction:

```json
{ "businessName": "Acme Retail", "ownerName": "Priya", "email": "priya@acme.in",
  "phone": "9876543210", "password": "secret123" }
```

Returns the same shape as `/login` (including a JWT), so callers can sign in
immediately. The username is derived from the email's local part; email
uniqueness is enforced by a partial unique index (migration 002).

## Security notes

- All SQL is parameterized (`$1…$n`) — no string-built queries anywhere.
- Password hashes are never returned by any endpoint.
- JWTs carry `{ userId, username, role, companyId, email }` and expire in 8h.
  Set a real `JWT_SECRET` in production (the dev fallback warns loudly).
- Tenant isolation: non-superusers are pinned to their token's company;
  `?companyId=` overrides are honored only for superusers.
- Error responses keep the `{ statusCode, message, error }` shape; 5xx logs
  never include query parameters.
