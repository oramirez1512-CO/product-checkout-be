import { Provider } from '@nestjs/common';
import { Pool } from 'pg';
import {
  CUSTOMER_REPOSITORY,
  DELIVERY_REPOSITORY,
  PRODUCT_REPOSITORY,
  TRANSACTION_REPOSITORY,
} from '../../domain/ports';
import {
  PgCustomerRepository,
  PgDeliveryRepository,
  PgProductRepository,
  PgTransactionRepository,
} from './pg-repositories';

export const PG_POOL = Symbol('PG_POOL');

export function createPgPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const needsSsl =
    connectionString.includes('supabase') ||
    connectionString.includes('sslmode=require');

  return new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export const persistenceProviders: Provider[] = [
  {
    provide: PG_POOL,
    useFactory: (): Pool => createPgPool(),
  },
  {
    provide: PRODUCT_REPOSITORY,
    useFactory: (pool: Pool) => new PgProductRepository(pool),
    inject: [PG_POOL],
  },
  {
    provide: CUSTOMER_REPOSITORY,
    useFactory: (pool: Pool) => new PgCustomerRepository(pool),
    inject: [PG_POOL],
  },
  {
    provide: DELIVERY_REPOSITORY,
    useFactory: (pool: Pool) => new PgDeliveryRepository(pool),
    inject: [PG_POOL],
  },
  {
    provide: TRANSACTION_REPOSITORY,
    useFactory: (pool: Pool) => new PgTransactionRepository(pool),
    inject: [PG_POOL],
  },
];
