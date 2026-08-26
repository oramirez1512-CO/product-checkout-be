# product-checkout-be

[![CI](https://github.com/oramirez1512-CO/product-checkout-be/actions/workflows/ci.yml/badge.svg)](https://github.com/oramirez1512-CO/product-checkout-be/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/oramirez1512-CO/product-checkout-be/graph/badge.svg)](https://codecov.io/gh/oramirez1512-CO/product-checkout-be)

API for a product checkout flow: stock, customers, deliveries, and payment transactions.

Built with NestJS. Business logic lives here (not in the database). PostgreSQL via Supabase is used only for persistence. Deploy target: Vercel.

## Architecture

Light hexagonal layout under `src/`:

```
src/
  domain/            # entities, ports, Result/ROP errors, money helpers
  application/       # use cases + validation
  infrastructure/    # persistence (pg), fees config, payment adapters
  presentation/      # controllers, DTOs, HTTP mapping
```

Controllers stay thin. Use cases own the flow. Adapters talk to the DB and the payment provider.

## Environment

Copy `.env.example` → `.env` and fill in real values locally (or set them in Vercel). Never commit `.env`.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase Postgres connection string |
| `API_KEY` | Shared secret; clients must send header `x-api-key` (except `/health`) |
| `PAYMENT_*` | Sandbox payment provider keys / URL |
| `BASE_FEE` / `DELIVERY_FEE` | Fixed fees in COP (`numeric` style, e.g. `3500.00`) |
| `CURRENCY` | Default `COP` |
| `CORS_ORIGIN` | Frontend origin |

Generate a local key with `uuidgen` and put it in `.env` (same value in Vercel). Never commit the real key.

Defaults for fees also live in `src/infrastructure/config/fees.ts` (`3500.00` base, `10000.00` delivery). Env wins when wired at bootstrap.

## Database

Postgres on Supabase. Money uses `numeric(12, 2)` (e.g. `products.price`), not integer cents.

Migrations live in `migrations/` and are meant to be run **manually** in the Supabase SQL Editor (in order):

1. `migrations/001_init_schema.sql` — tables, enums, indexes
2. `migrations/002_seed_product.sql` — sample product

### Model (brief)

| Table | Role |
|-------|------|
| `products` | Catalog + stock (`price`, `stock`) |
| `customers` | Buyer (`email` unique) |
| `deliveries` | Shipping address linked to a customer |
| `transactions` | Payment attempt (`PENDING` → `APPROVED` / `DECLINED` / `ERROR`) |

Card PAN/CVV are never stored. Optional `card_brand` / `card_last_four` only for UI.

A transaction always references product, customer, and delivery. Amounts (`amount`, `base_fee`, `delivery_fee`, `total`) are calculated in the API.

## Run locally

Prerequisites: Node.js 20+, npm, and a Postgres database (Supabase) with the migrations applied.

```bash
# 1. Env
cp .env.example .env
# edit .env — at least DATABASE_URL and CORS_ORIGIN

# 2. Install
npm install

# 3. Dev server (watch mode)
npm run start:dev
```

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Nest in watch mode (default for local work) |
| `npm run start` | Nest once, no watch |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled app (`node dist/main`) |
| `npm test` | Unit tests (Jest) |
| `npm run test:cov` | Tests + coverage report (threshold ≥80% lines/statements) |

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

Coverage HTML: `coverage/lcov-report/index.html` after `npm run test:cov`.

## CI (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

On push/PR to `main` / `develop` / `feature/**`:

1. `npm ci`
2. `npm run build`
3. `npm run test:cov` (fails if global coverage drops below the Jest threshold)
4. Uploads coverage to **[Codecov](https://app.codecov.io/gh/oramirez1512-CO/product-checkout-be)** (visual report + PR comments)
5. Also uploads the HTML report as artifact **`coverage-report`**

### One-time Codecov setup (public repo, free)

1. Sign in at [codecov.io](https://codecov.io) with GitHub and grant access to `product-checkout-be`.
2. Open the repo in Codecov → **Settings** → copy the **Upload token**.
3. In GitHub: **Settings → Secrets and variables → Actions** → New repository secret:
   - Name: `CODECOV_TOKEN`
   - Value: the upload token from Codecov
4. Push / re-run CI. The badge and dashboard populate after the first successful upload.

Local HTML remains available at `coverage/lcov-report/index.html` after `npm run test:cov`.
## Core API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/products` | List products + stock |
| GET | `/products/:id` | Product by id |
| POST | `/customers` | Upsert customer by email |
| POST | `/deliveries` | Create delivery for a customer |
| POST | `/transactions` | Create `PENDING` transaction (server-side totals) |
| POST | `/transactions/:id/pay` | Charge card and finalize transaction |
| GET | `/transactions/:id` | Transaction status (refresh recovery) |

Fees (`BASE_FEE`, `DELIVERY_FEE`) are applied only on the server. Stock is checked on `POST /transactions` and again on pay. Stock is decremented only when the provider returns `APPROVED`.

### Pay flow

1. Client creates a `PENDING` transaction (`POST /transactions`).
2. Client sends card data to `POST /transactions/:id/pay` (PAN/CVV are forwarded to the provider only; never stored).
3. Server tokenizes/charges via the configured payment adapter (sandbox or fake fallback).
4. Server persists provider metadata (`providerTransactionId`, `cardBrand`, `cardLastFour`) and final status.
5. Re-posting `/pay` on a final transaction (`APPROVED`, `DECLINED`, `ERROR`) is **idempotent** — returns the stored row without charging again.

Card body example:

```json
{
  "number": "4242424242424242",
  "cvc": "123",
  "expMonth": "12",
  "expYear": "29",
  "cardHolder": "Ada Buyer",
  "installments": 1
}
```

Without `PAYMENT_*` env vars the app boots with `FakePaymentProvider` (useful for local/tests). Configure sandbox keys in `.env` or Vercel for real charges.

## Docs

API examples live under `docs/`:

| File | Description |
|------|-------------|
| [`docs/product-checkout-be.postman_collection.json`](docs/product-checkout-be.postman_collection.json) | Postman collection (health, products, customers, deliveries, transactions, pay) |

Import the JSON in Postman (**Import → Upload Files**). Collection variables: `baseUrl` (default `http://localhost:3000`), `apiKey` (same as `API_KEY`), `productId`, `customerId`, `deliveryId`, `transactionId`. Run requests in order; tests scripts fill the ids when possible. Protected routes need header `x-api-key`.

## Security

Aligned with the brief’s security bonus (HTTPS + headers + careful handling of sensitive data):

| Measure | How |
|---------|-----|
| HTTPS | Provided by Vercel in production |
| Security headers | [`helmet`](https://helmetjs.github.io/) in `src/main.ts` (e.g. `X-Content-Type-Options: nosniff`, `X-Frame-Options` / frameguard, `Referrer-Policy`, etc.) |
| API access | Shared secret `API_KEY` via request header `x-api-key` (see `ApiKeyValidator`). `/health` stays open for probes |
| Card data | PAN/CVV are never stored; only optional brand / last four later for UI |
| Totals | Fees and amounts are calculated on the server |

CSP is left off by default so a JSON API is not blocked by browser CSP meant for HTML apps. CORS is restricted to `CORS_ORIGIN`.

## Status

Phase 0 done: scaffold, migrations, env example, agreed fees.

Phase 1 (bootstrap): Nest app boots locally. `GET /health` → `{ "status": "ok" }`.

Phase core-api: products, customers, deliveries, PENDING transactions with hexagonal + ROP use cases. API key + Helmet headers.

Phase payments: payment port + sandbox adapter + `POST /transactions/:id/pay` with idempotent finalize and stock decrement on `APPROVED`.

Phase tests/coverage (`feature/test-n-coverage`): Jest suites with AAA + boundary (min/max) cases; global coverage threshold ≥80%; GitHub Actions CI uploads coverage HTML artifact.
