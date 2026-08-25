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

## Status

Scaffold only — folder structure is in place. App bootstrap, schema, and endpoints come next.
