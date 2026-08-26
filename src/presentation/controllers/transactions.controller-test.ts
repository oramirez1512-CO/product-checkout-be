import { describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  CreatePendingTransactionUseCase,
  GetTransactionUseCase,
  PayTransactionUseCase,
} from '../../application/use-cases/transactions.use-cases';
import { ok } from '../../domain/result';
import { TransactionsController } from './transactions.controller';

describe('TransactionsController', () => {
  const tx = {
    id: '44444444-4444-4444-8444-444444444444',
    reference: 'chk_x',
    status: 'PENDING' as const,
    productId: '11111111-1111-4111-8111-111111111111',
    customerId: '22222222-2222-4222-8222-222222222222',
    deliveryId: '33333333-3333-4333-8333-333333333333',
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

  async function build() {
    const createPending = { execute: jest.fn(async () => ok(tx)) };
    const payTransaction = {
      execute: jest.fn(async () =>
        ok({ ...tx, status: 'APPROVED' as const, cardLastFour: '4242' }),
      ),
    };
    const getTransaction = { execute: jest.fn(async () => ok(tx)) };
    const moduleRef = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: CreatePendingTransactionUseCase, useValue: createPending },
        { provide: PayTransactionUseCase, useValue: payTransaction },
        { provide: GetTransactionUseCase, useValue: getTransaction },
      ],
    }).compile();
    return {
      controller: moduleRef.get(TransactionsController),
      createPending,
      payTransaction,
      getTransaction,
    };
  }

  it('creates pending transaction', async () => {
    // Arrange
    const { controller, createPending } = await build();

    // Act
    const result = await controller.create({
      productId: tx.productId,
      customerId: tx.customerId,
      deliveryId: tx.deliveryId,
      quantity: 1,
    });

    // Assert
    expect(result.status).toBe('PENDING');
    expect(createPending.execute).toHaveBeenCalled();
  });

  it('pays transaction', async () => {
    // Arrange
    const { controller, payTransaction } = await build();

    // Act
    const result = await controller.pay(tx.id, {
      number: '4242424242424242',
      cvc: '123',
      expMonth: '12',
      expYear: '29',
      cardHolder: 'Ada',
    });

    // Assert
    expect(result.status).toBe('APPROVED');
    expect(payTransaction.execute).toHaveBeenCalled();
  });

  it('gets transaction by id', async () => {
    // Arrange
    const { controller } = await build();

    // Act
    const result = await controller.getById(tx.id);

    // Assert
    expect(result.id).toBe(tx.id);
  });
});
