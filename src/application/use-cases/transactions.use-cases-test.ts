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
import {
  CreatePendingTransactionUseCase,
  PayTransactionUseCase,
} from './transactions.use-cases';
import { PaymentProvider } from '../../domain/ports';

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
          providerTransactionId: null,
          cardBrand: null,
          cardLastFour: null,
          ...input,
        }),
      ),
      finalizePayment: jest.fn(async (): Promise<Transaction | null> => null),
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

describe('PayTransactionUseCase', () => {
  const transactionId = '44444444-4444-4444-8444-444444444444';
  const productId = '11111111-1111-4111-8111-111111111111';
  const customerId = '22222222-2222-4222-8222-222222222222';
  const deliveryId = '33333333-3333-4333-8333-333333333333';

  const pendingTx: Transaction = {
    id: transactionId,
    reference: 'chk_test_ref',
    status: 'PENDING',
    productId,
    customerId,
    deliveryId,
    quantity: 1,
    amount: 249900,
    baseFee: 3500,
    deliveryFee: 10000,
    total: 263400,
    currency: 'COP',
    providerTransactionId: null,
    cardBrand: null,
    cardLastFour: null,
  };

  const approvedTx: Transaction = {
    ...pendingTx,
    status: 'APPROVED',
    providerTransactionId: 'fake_chk_test_ref',
    cardBrand: 'VISA',
    cardLastFour: '4242',
  };

  const card = {
    number: '4242424242424242',
    cvc: '123',
    expMonth: '12',
    expYear: '29',
    cardHolder: 'Ada Buyer',
  };

  function buildPayUseCase(overrides?: {
    transaction?: Transaction | null;
    stock?: number;
    chargeStatus?: 'APPROVED' | 'DECLINED';
    finalizeReturns?: Transaction | null;
  }) {
    const tx = overrides?.transaction ?? pendingTx;
    const transactions = {
      findById: jest.fn(async () => tx),
      createPending: jest.fn(async () => pendingTx),
      finalizePayment: jest.fn(
        async (): Promise<Transaction | null> =>
          overrides?.finalizeReturns ??
          (overrides?.chargeStatus === 'DECLINED'
            ? { ...pendingTx, status: 'DECLINED' }
            : approvedTx),
      ),
    } satisfies TransactionRepository;

    const customers = {
      findById: jest.fn(async () => ({
        id: customerId,
        email: 'buyer@example.com',
        fullName: 'Ada Buyer',
        phone: null,
      })),
      upsertByEmail: jest.fn(async () => ({
        id: customerId,
        email: 'buyer@example.com',
        fullName: 'Ada Buyer',
        phone: null,
      })),
    } satisfies CustomerRepository;

    const products = {
      findById: jest.fn(async () => ({
        id: productId,
        name: 'Aurora',
        description: 'Headphones',
        price: 249900,
        stock: overrides?.stock ?? 5,
        imageUrl: null,
      })),
      list: jest.fn(async (): Promise<Product[]> => []),
    } satisfies ProductRepository;

    const payments = {
      charge: jest.fn(async () => ({
        ok: true as const,
        value: {
          providerTransactionId: 'fake_chk_test_ref',
          status: overrides?.chargeStatus ?? 'APPROVED',
          statusMessage: null,
          cardBrand: 'VISA',
          cardLastFour: '4242',
          rawResponse: { fake: true },
        },
      })),
    } satisfies PaymentProvider;

    return {
      useCase: new PayTransactionUseCase(
        transactions,
        customers,
        products,
        payments,
      ),
      payments,
      transactions,
    };
  }

  it('returns existing transaction when already APPROVED (idempotent)', async () => {
    const { useCase, payments } = buildPayUseCase({ transaction: approvedTx });
    const result = await useCase.execute({ transactionId, card });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('APPROVED');
    }
    expect(payments.charge).not.toHaveBeenCalled();
  });

  it('charges and finalizes a PENDING transaction', async () => {
    const { useCase, payments, transactions } = buildPayUseCase();
    const result = await useCase.execute({ transactionId, card });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('APPROVED');
      expect(result.value.cardLastFour).toBe('4242');
    }
    expect(payments.charge).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: pendingTx.reference,
        amountInCents: 26340000,
        customerEmail: 'buyer@example.com',
      }),
    );
    expect(transactions.finalizePayment).toHaveBeenCalled();
  });

  it('rejects pay when stock is insufficient', async () => {
    const { useCase, payments } = buildPayUseCase({ stock: 0 });
    const result = await useCase.execute({ transactionId, card });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
    expect(payments.charge).not.toHaveBeenCalled();
  });

  it('persists DECLINED without treating it as a hard error', async () => {
    const { useCase } = buildPayUseCase({ chargeStatus: 'DECLINED' });
    const result = await useCase.execute({ transactionId, card });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('DECLINED');
    }
  });

  it('validates card payload', async () => {
    const { useCase } = buildPayUseCase();
    const result = await useCase.execute({
      transactionId,
      card: { ...card, number: '' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });
});
