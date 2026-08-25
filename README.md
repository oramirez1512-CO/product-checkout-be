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
| `PAYMENT_*` | Sandbox payment provider keys / URL |
| `BASE_FEE` / `DELIVERY_FEE` | Fixed fees in COP (`numeric` style, e.g. `3500.00`) |
| `CURRENCY` | Default `COP` |
| `CORS_ORIGIN` | Frontend origin |

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

### curl examples

```bash
# List products
curl -s http://localhost:3000/products | jq

# Upsert customer
curl -s -X POST http://localhost:3000/customers \
  -H 'Content-Type: application/json' \
  -d '{"email":"buyer@example.com","fullName":"Ada Buyer","phone":"3001234567"}' | jq

# Create delivery (use customer id from previous response)
curl -s -X POST http://localhost:3000/deliveries \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"<CUSTOMER_UUID>","address":"Calle 1 #2-3","city":"Bogota","region":"Cundinamarca","postalCode":"110111"}' | jq

# Create PENDING transaction
curl -s -X POST http://localhost:3000/transactions \
  -H 'Content-Type: application/json' \
  -d '{"productId":"<PRODUCT_UUID>","customerId":"<CUSTOMER_UUID>","deliveryId":"<DELIVERY_UUID>","quantity":1}' | jq
```

## Status

Phase 0 done: scaffold, migrations, env example, agreed fees.

Phase 1 (bootstrap): Nest app boots locally. `GET /health` → `{ "status": "ok" }`.

Phase core-api (`feature/be-core-api`): products, customers, deliveries, PENDING transactions with hexagonal + ROP use cases.
