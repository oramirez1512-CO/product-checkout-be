import { describe, expect, it, jest } from '@jest/globals';
import { Pool } from 'pg';
import {
  PgCustomerRepository,
  PgDeliveryRepository,
  PgProductRepository,
  PgTransactionRepository,
} from './pg-repositories';

type QueryResult = { rows: unknown[]; rowCount?: number };

function mockPool(responses: QueryResult[]) {
  const query = jest.fn(async () => {
    const next = responses.shift();
    return next ?? { rows: [] };
  });
  return { query } as unknown as Pool;
}

describe('Pg repositories (mocked pool)', () => {
  it('PgProductRepository findById and list', async () => {
    // Arrange
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Aurora',
      description: 'd',
      price: '249900.00',
      stock: 12,
      image_url: null,
    };
    const pool = mockPool([{ rows: [row] }, { rows: [row] }]);
    const repo = new PgProductRepository(pool);

    // Act
    const found = await repo.findById(row.id);
    const list = await repo.list();

    // Assert
    expect(found?.price).toBe(249900);
    expect(list).toHaveLength(1);
  });

  it('PgProductRepository returns null when missing', async () => {
    const pool = mockPool([{ rows: [] }]);
    const repo = new PgProductRepository(pool);
    expect(
      await repo.findById('11111111-1111-4111-8111-111111111111'),
    ).toBeNull();
  });

  it('PgCustomerRepository findById and upsertByEmail', async () => {
    const row = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'a@b.co',
      full_name: 'Ada',
      phone: null,
    };
    const pool = mockPool([{ rows: [row] }, { rows: [row] }]);
    const repo = new PgCustomerRepository(pool);

    expect(await repo.findById(row.id)).toEqual(
      expect.objectContaining({ email: 'a@b.co', fullName: 'Ada' }),
    );
    expect(
      await repo.upsertByEmail({
        email: 'a@b.co',
        fullName: 'Ada',
        phone: null,
      }),
    ).toEqual(expect.objectContaining({ id: row.id }));
  });

  it('PgDeliveryRepository findById and create', async () => {
    const row = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      customer_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      address: 'Calle 1',
      city: 'Bogota',
      region: 'Cundinamarca',
      postal_code: '110111',
    };
    const pool = mockPool([{ rows: [row] }, { rows: [row] }]);
    const repo = new PgDeliveryRepository(pool);

    expect(await repo.findById(row.id)).toEqual(
      expect.objectContaining({ city: 'Bogota', postalCode: '110111' }),
    );
    expect(
      await repo.create({
        customerId: row.customer_id,
        address: 'Calle 1',
        city: 'Bogota',
        region: 'Cundinamarca',
        postalCode: '110111',
      }),
    ).toEqual(expect.objectContaining({ id: row.id }));
  });

  it('PgTransactionRepository findById and createPending', async () => {
    const row = {
      id: '44444444-4444-4444-8444-444444444444',
      reference: 'chk_x',
      status: 'PENDING',
      product_id: '11111111-1111-4111-8111-111111111111',
      customer_id: '22222222-2222-4222-8222-222222222222',
      delivery_id: '33333333-3333-4333-8333-333333333333',
      quantity: 1,
      amount: '249900.00',
      base_fee: '3500.00',
      delivery_fee: '10000.00',
      total: '263400.00',
      currency: 'COP',
      provider_transaction_id: null,
      card_brand: null,
      card_last_four: null,
    };
    const pool = mockPool([{ rows: [row] }, { rows: [row] }]);
    const repo = new PgTransactionRepository(pool);

    expect(await repo.findById(row.id)).toEqual(
      expect.objectContaining({ status: 'PENDING', total: 263400 }),
    );
    expect(
      await repo.createPending({
        reference: 'chk_x',
        productId: row.product_id,
        customerId: row.customer_id,
        deliveryId: row.delivery_id,
        quantity: 1,
        amount: 249900,
        baseFee: 3500,
        deliveryFee: 10000,
        total: 263400,
        currency: 'COP',
      }),
    ).toEqual(expect.objectContaining({ reference: 'chk_x' }));
  });

  it('finalizePayment APPROVED decrements stock and commits', async () => {
    // Arrange
    const txRow = {
      id: '44444444-4444-4444-8444-444444444444',
      reference: 'chk_x',
      status: 'APPROVED',
      product_id: '11111111-1111-4111-8111-111111111111',
      customer_id: '22222222-2222-4222-8222-222222222222',
      delivery_id: '33333333-3333-4333-8333-333333333333',
      quantity: 1,
      amount: '1.00',
      base_fee: '1.00',
      delivery_fee: '1.00',
      total: '3.00',
      currency: 'COP',
      provider_transaction_id: 'prov',
      card_brand: 'VISA',
      card_last_four: '4242',
    };
    const responses: QueryResult[] = [
      { rows: [] },
      {
        rows: [
          {
            status: 'PENDING',
            product_id: txRow.product_id,
            quantity: 1,
          },
        ],
      },
      { rows: [], rowCount: 1 },
      { rows: [txRow], rowCount: 1 },
      { rows: [] },
    ];
    const client = {
      query: jest.fn(async () => responses.shift() ?? { rows: [] }),
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn(async () => client),
    } as unknown as Pool;
    const repo = new PgTransactionRepository(pool);

    // Act
    const result = await repo.finalizePayment({
      transactionId: txRow.id,
      status: 'APPROVED',
      providerTransactionId: 'prov',
      providerStatus: 'APPROVED',
      cardBrand: 'VISA',
      cardLastFour: '4242',
      rawResponse: { ok: true },
    });

    // Assert
    expect(result?.status).toBe('APPROVED');
    expect(client.release).toHaveBeenCalled();
  });

  it('finalizePayment returns null when not PENDING', async () => {
    const responses: QueryResult[] = [
      { rows: [] },
      {
        rows: [{ status: 'APPROVED', product_id: 'p', quantity: 1 }],
      },
      { rows: [] },
    ];
    const client = {
      query: jest.fn(async () => responses.shift() ?? { rows: [] }),
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn(async () => client),
    } as unknown as Pool;
    const repo = new PgTransactionRepository(pool);

    const result = await repo.finalizePayment({
      transactionId: '44444444-4444-4444-8444-444444444444',
      status: 'APPROVED',
      providerTransactionId: 'p',
      providerStatus: 'APPROVED',
      cardBrand: null,
      cardLastFour: null,
      rawResponse: null,
    });

    expect(result).toBeNull();
  });
});
