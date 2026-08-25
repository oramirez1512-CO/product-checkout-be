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
};

export class PgProductRepository implements ProductRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>(
      `SELECT id, name, description, price, stock, image_url
       FROM products WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          name: row.name,
          description: row.description,
          price: parseMoney(row.price),
          stock: row.stock,
          imageUrl: row.image_url,
        }
      : null;
  }

  async list(): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(
      `SELECT id, name, description, price, stock, image_url
       FROM products ORDER BY created_at ASC`,
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseMoney(row.price),
      stock: row.stock,
      imageUrl: row.image_url,
    }));
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
    return row
      ? {
          id: row.id,
          email: row.email,
          fullName: row.full_name,
          phone: row.phone,
        }
      : null;
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
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      phone: row.phone,
    };
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
    return row
      ? {
          id: row.id,
          customerId: row.customer_id,
          address: row.address,
          city: row.city,
          region: row.region,
          postalCode: row.postal_code,
        }
      : null;
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
    const row = result.rows[0];
    return {
      id: row.id,
      customerId: row.customer_id,
      address: row.address,
      city: row.city,
      region: row.region,
      postalCode: row.postal_code,
    };
  }
}

export class PgTransactionRepository implements TransactionRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Transaction | null> {
    const result = await this.pool.query<TransactionRow>(
      `SELECT id, reference, status, product_id, customer_id, delivery_id,
              quantity, amount, base_fee, delivery_fee, total, currency
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
       RETURNING id, reference, status, product_id, customer_id, delivery_id,
                 quantity, amount, base_fee, delivery_fee, total, currency`,
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
  };
}
