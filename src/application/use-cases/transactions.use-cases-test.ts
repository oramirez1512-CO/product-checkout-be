import { describe, expect, it, jest } from '@jest/globals';
import {
  Customer,
  Delivery,
  Product,
  Transaction,
} from '../../domain/entities';
import {
  CreatePendingTransactionInput,
  CustomerRepository,
  DeliveryRepository,
  ProductRepository,
  TransactionRepository,
} from '../../domain/ports';
import { DomainError } from '../../domain/result';
import { FeesConfig } from '../../infrastructure/config/fees';
import { CreatePendingTransactionUseCase } from './transactions.use-cases';

describe('CreatePendingTransactionUseCase', () => {
  const productId = '11111111-1111-4111-8111-111111111111';
  const customerId = '22222222-2222-4222-8222-222222222222';
  const deliveryId = '33333333-3333-4333-8333-333333333333';

  const product: Product = {
    id: productId,
    name: 'Aurora',
    description: 'Headphones',
    price: 249900,
    stock: 12,
    imageUrl: null,
  };

  const customer: Customer = {
    id: customerId,
    email: 'buyer@example.com',
    fullName: 'Ada Buyer',
    phone: null,
  };

  const delivery: Delivery = {
    id: deliveryId,
    customerId,
    address: 'Calle 1',
    city: 'Bogota',
    region: 'Cundinamarca',
    postalCode: '110111',
  };

  const fees: FeesConfig = {
    baseFee: 3500,
    deliveryFee: 10000,
    currency: 'COP',
  };

  function buildUseCase(overrides?: {
    stock?: number;
    deliveryCustomerId?: string;
  }) {
    const products = {
      findById: jest.fn(async () => ({
        ...product,
        stock: overrides?.stock ?? product.stock,
      })),
      list: jest.fn(async (): Promise<Product[]> => []),
    } satisfies ProductRepository;
    const customers = {
      findById: jest.fn(async () => customer),
      upsertByEmail: jest.fn(async () => customer),
    } satisfies CustomerRepository;
    const deliveries = {
      findById: jest.fn(async () => ({
        ...delivery,
        customerId: overrides?.deliveryCustomerId ?? delivery.customerId,
      })),
      create: jest.fn(async () => delivery),
    } satisfies DeliveryRepository;
    const transactions = {
      findById: jest.fn(async (): Promise<Transaction | null> => null),
      createPending: jest.fn(
        async (input: CreatePendingTransactionInput): Promise<Transaction> => ({
          id: '44444444-4444-4444-8444-444444444444',
          status: 'PENDING',
          ...input,
        }),
      ),
    } satisfies TransactionRepository;

    return {
      useCase: new CreatePendingTransactionUseCase(
        products,
        customers,
        deliveries,
        transactions,
        fees,
      ),
      transactions,
    };
  }

  it('creates PENDING with server-side totals', async () => {
    const { useCase, transactions } = buildUseCase();
    const result = await useCase.execute({
      productId,
      customerId,
      deliveryId,
      quantity: 2,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('PENDING');
      expect(result.value.amount).toBe(499800);
      expect(result.value.baseFee).toBe(3500);
      expect(result.value.deliveryFee).toBe(10000);
      expect(result.value.total).toBe(513300);
      expect(result.value.reference).toMatch(/^chk_/);
    }
    expect(transactions.createPending).toHaveBeenCalled();
  });

  it('rejects insufficient stock without creating tx', async () => {
    const { useCase, transactions } = buildUseCase({ stock: 1 });
    const result = await useCase.execute({
      productId,
      customerId,
      deliveryId,
      quantity: 2,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
    expect(transactions.createPending).not.toHaveBeenCalled();
  });

  it('rejects delivery that does not belong to customer', async () => {
    const { useCase } = buildUseCase({
      deliveryCustomerId: '55555555-5555-4555-8555-555555555555',
    });
    const result = await useCase.execute({
      productId,
      customerId,
      deliveryId,
      quantity: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(
        DomainError.validation('delivery does not belong to customer'),
      );
    }
  });
});
