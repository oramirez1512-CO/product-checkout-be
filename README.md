# product-checkout-be

API for a product checkout flow: stock, customers, deliveries, and payment transactions.

Built with NestJS. Business logic lives here (not in the database). PostgreSQL via Supabase is used only for persistence. Deploy target: Vercel.

## Architecture

Light hexagonal layout under `src/`:

```
src/
  domain/            # entities, ports, Result/ROP errors, money helpers
  application/       # use cases + validation
  infrastructure/    # persistence (pg), fees config, payment (later)
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
| `npm run test:cov` | Tests + coverage report |

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`

## Core API (current)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/products` | List products + stock |
| GET | `/products/:id` | Product by id |
| POST | `/customers` | Upsert customer by email |
| POST | `/deliveries` | Create delivery for a customer |
| POST | `/transactions` | Create `PENDING` transaction (server-side totals) |
| GET | `/transactions/:id` | Transaction status (refresh recovery) |

Fees (`BASE_FEE`, `DELIVERY_FEE`) are applied only on the server. Stock is checked on `POST /transactions` but **not** decremented until a later pay flow.

## Docs

API examples live under `docs/`:

| File | Description |
|------|-------------|
| [`docs/product-checkout-be.postman_collection.json`](docs/product-checkout-be.postman_collection.json) | Postman collection (health, products, customers, deliveries, transactions) |

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

Phase core-api (`feature/be-core-api`): products, customers, deliveries, PENDING transactions with hexagonal + ROP use cases. API key + Helmet headers.
