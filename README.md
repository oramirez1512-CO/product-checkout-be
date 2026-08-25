# product-checkout-be

API for a product checkout flow: stock, customers, deliveries, and payment transactions.

Built with NestJS. Business logic lives here (not in the database). PostgreSQL via Supabase is used only for persistence. Deploy target: Vercel.

## Architecture

Light hexagonal layout under `src/`:

```
src/
  domain/            # entities, value objects, errors, ports
  application/       # use cases
  infrastructure/    # persistence, payment client, config
  presentation/      # controllers, DTOs (thin HTTP layer)
```

Controllers stay thin. Use cases own the flow. Adapters talk to the DB and the payment provider.

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

## Status

Folder scaffold + SQL migrations ready. Nest bootstrap and endpoints come next.
