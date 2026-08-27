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
| `CORS_ORIGIN` | Frontend origin(s); comma-separated; `*` wildcards OK. Prefer `http://localhost:5173,https://product-checkout-fe*.vercel.app` so only this FE’s Vercel hosts are allowed |

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

## How to view coverage

There are three ways to inspect coverage. Prefer **Codecov** for reviews; use local HTML while developing.

### 1. Codecov (visual dashboard — public)

Dashboard: [app.codecov.io/gh/oramirez1512-CO/product-checkout-be](https://app.codecov.io/gh/oramirez1512-CO/product-checkout-be)

Anyone can open it while the repository is public. The badge at the top of this README links to the same place.

**What you can see in Codecov**

| View | What it shows |
|------|----------------|
| **Overview / sunburst** | Global coverage % for the branch (statements covered vs total). Trend over recent commits. |
| **File tree** | Coverage broken down by folder (`application/`, `domain/`, `infrastructure/`, `presentation/`, …). Useful to spot weak areas quickly. |
| **Single file** | Source code with lines highlighted: **green** = covered by at least one test, **red** = not executed, **yellow/partial** = only some branches hit. Click a file to review gaps line by line. |
| **Commit / commit comparison** | Coverage for a specific SHA, and how % changed vs the previous commit. |
| **Pull request** | Patch coverage (only lines added/changed in the PR) vs project coverage. Flags drops below the targets in `codecov.yml` (project/patch ~80%). |
| **PR comment on GitHub** | After CI uploads a report, Codecov comments on the PR with a short summary (project %, patch %, and links back to the full report). |

In short: Codecov answers “are we above 80%?” and “which lines in this PR or file still have no tests?” without downloading HTML.

**One-time setup** (repo owner; free for public repos):

1. Sign in at [codecov.io](https://codecov.io) with GitHub and grant access to `product-checkout-be`.
2. In Codecov → repo **Settings**, copy the **Upload token**.
3. In GitHub → **Settings → Secrets and variables → Actions**, create secret:
   - Name: `CODECOV_TOKEN`
   - Value: the upload token
4. Push or re-run the **CI** workflow. After the first successful upload, the badge and dashboard populate.

### 2. Local HTML (Istanbul)

```bash
npm run test:cov
open coverage/lcov-report/index.html   # macOS
```

Browse folders/files and see line hits in the browser. Requires generating the report on your machine (the `coverage/` folder is gitignored).

### 3. GitHub Actions artifact

1. Open the repo on GitHub → **Actions**.
2. Select the latest **CI** run.
3. Under **Artifacts**, download **`coverage-report`**.
4. Unzip and open `index.html` locally.

Same Istanbul HTML as local, produced by CI. GitHub does not render that HTML inside the Actions UI; you open it after download.

## CI (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

On push/PR to `main` / `develop` / `feature/**`:

1. `npm ci`
2. `npm run build`
3. `npm run test:cov` (fails if global coverage drops below the Jest threshold: ≥80% statements/lines/functions, ≥70% branches)
4. Uploads `coverage/lcov.info` to Codecov
5. Uploads the HTML report as artifact **`coverage-report`**

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

CSP is left off by default so a JSON API is not blocked by browser CSP meant for HTML apps. CORS is restricted to `CORS_ORIGIN` (exact origins and/or `*` patterns). For Vercel Previews use `https://product-checkout-fe*.vercel.app` so the host must start with `product-checkout-fe` and end with `.vercel.app` (browser `Origin` has no path).
