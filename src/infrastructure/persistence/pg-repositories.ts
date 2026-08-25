import { Pool } from 'pg';
import {
  Customer,
  Delivery,
  Product,
  Transaction,
  TransactionStatus,
} from '../../domain/entities';
import { parseMoney } from '../../domain/money';
import {
  CreateDeliveryInput,
  CreatePendingTransactionInput,
  CustomerRepository,
  DeliveryRepository,
  FinalizePaymentInput,
  ProductRepository,
  TransactionRepository,
  UpsertCustomerInput,
} from '../../domain/ports';

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  image_url: string | null;
};

type CustomerRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
};

type DeliveryRow = {
  id: string;
  customer_id: string;
  address: string;
  city: string;
  region: string;
  postal_code: string | null;
};

type TransactionRow = {
  id: string;
  reference: string;
  status: TransactionStatus;
  product_id: string;
  customer_id: string;
  delivery_id: string;
  quantity: number;
  amount: string;
  base_fee: string;
  delivery_fee: string;
  total: string;
  currency: string;
  provider_transaction_id: string | null;
  card_brand: string | null;
  card_last_four: string | null;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: parseMoney(row.price),
    stock: row.stock,
    imageUrl: row.image_url,
  };
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
  };
}

function mapDelivery(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    customerId: row.customer_id,
    address: row.address,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    productId: row.product_id,
    customerId: row.customer_id,
    deliveryId: row.delivery_id,
    quantity: row.quantity,
    amount: parseMoney(row.amount),
    baseFee: parseMoney(row.base_fee),
    deliveryFee: parseMoney(row.delivery_fee),
    total: parseMoney(row.total),
    currency: row.currency,
    providerTransactionId: row.provider_transaction_id,
    cardBrand: row.card_brand,
    cardLastFour: row.card_last_four,
  };
}

const TRANSACTION_SELECT = `
  id, reference, status, product_id, customer_id, delivery_id,
  quantity, amount, base_fee, delivery_fee, total, currency,
  provider_transaction_id, card_brand, card_last_four
`;

export class PgProductRepository implements ProductRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>(
      `SELECT id, name, description, price, stock, image_url
       FROM products WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapProduct(row) : null;
  }

  async list(): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(
      `SELECT id, name, description, price, stock, image_url
       FROM products ORDER BY created_at ASC`,
    );
    return result.rows.map(mapProduct);
  }
}

export class PgCustomerRepository implements CustomerRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Customer | null> {
    const result = await this.pool.query<CustomerRow>(
      `SELECT id, email, full_name, phone FROM customers WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapCustomer(row) : null;
  }

  async upsertByEmail(input: UpsertCustomerInput): Promise<Customer> {
    const result = await this.pool.query<CustomerRow>(
      `INSERT INTO customers (email, full_name, phone)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         updated_at = now()
       RETURNING id, email, full_name, phone`,
      [input.email, input.fullName, input.phone],
    );
    return mapCustomer(result.rows[0]);
  }
}

export class PgDeliveryRepository implements DeliveryRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Delivery | null> {
    const result = await this.pool.query<DeliveryRow>(
      `SELECT id, customer_id, address, city, region, postal_code
       FROM deliveries WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapDelivery(row) : null;
  }

  async create(input: CreateDeliveryInput): Promise<Delivery> {
    const result = await this.pool.query<DeliveryRow>(
      `INSERT INTO deliveries (customer_id, address, city, region, postal_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, customer_id, address, city, region, postal_code`,
      [
        input.customerId,
        input.address,
        input.city,
        input.region,
        input.postalCode,
      ],
    );
    return mapDelivery(result.rows[0]);
  }
}

export class PgTransactionRepository implements TransactionRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Transaction | null> {
    const result = await this.pool.query<TransactionRow>(
      `SELECT ${TRANSACTION_SELECT}
       FROM transactions WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapTransaction(row) : null;
  }

  async createPending(
    input: CreatePendingTransactionInput,
  ): Promise<Transaction> {
    const result = await this.pool.query<TransactionRow>(
      `INSERT INTO transactions (
         reference, status, product_id, customer_id, delivery_id,
         quantity, amount, base_fee, delivery_fee, total, currency
       ) VALUES (
         $1, 'PENDING', $2, $3, $4,
         $5, $6, $7, $8, $9, $10
       )
       RETURNING ${TRANSACTION_SELECT}`,
      [
        input.reference,
        input.productId,
        input.customerId,
        input.deliveryId,
        input.quantity,
        input.amount,
        input.baseFee,
        input.deliveryFee,
        input.total,
        input.currency,
      ],
    );
    return mapTransaction(result.rows[0]);
  }

  async finalizePayment(
    input: FinalizePaymentInput,
  ): Promise<Transaction | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const locked = await client.query<{
        status: TransactionStatus;
        product_id: string;
        quantity: number;
      }>(
        `SELECT status, product_id, quantity
         FROM transactions
         WHERE id = $1
         FOR UPDATE`,
        [input.transactionId],
      );
      const current = locked.rows[0];
      if (!current || current.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return null;
      }

      if (input.status === 'APPROVED') {
        const stockUpdate = await client.query(
          `UPDATE products
           SET stock = stock - $2, updated_at = now()
           WHERE id = $1 AND stock >= $2`,
          [current.product_id, current.quantity],
        );
        if (stockUpdate.rowCount === 0) {
          await client.query('ROLLBACK');
          throw new Error('insufficient stock while finalizing payment');
        }
      }

      const updated = await client.query<TransactionRow>(
        `UPDATE transactions
         SET status = $2,
             provider_transaction_id = $3,
             provider_status = $4,
             card_brand = $5,
             card_last_four = $6,
             raw_response = $7::jsonb,
             updated_at = now()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING ${TRANSACTION_SELECT}`,
        [
          input.transactionId,
          input.status,
          input.providerTransactionId,
          input.providerStatus,
          input.cardBrand,
          input.cardLastFour,
          JSON.stringify(input.rawResponse ?? null),
        ],
      );

      if (updated.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query('COMMIT');
      return mapTransaction(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
