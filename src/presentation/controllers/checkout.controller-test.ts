import { describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  CreateDeliveryUseCase,
  UpsertCustomerUseCase,
} from '../../application/use-cases/checkout.use-cases';
import { ok } from '../../domain/result';
import { CheckoutController } from './checkout.controller';

describe('CheckoutController', () => {
  it('upserts customer', async () => {
    // Arrange
    const customer = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'buyer@example.com',
      fullName: 'Ada',
      phone: null,
    };
    const upsertCustomer = {
      execute: jest.fn(async () => ok(customer)),
    };
    const createDelivery = { execute: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [
        { provide: UpsertCustomerUseCase, useValue: upsertCustomer },
        { provide: CreateDeliveryUseCase, useValue: createDelivery },
      ],
    }).compile();
    const controller = moduleRef.get(CheckoutController);

    // Act
    const result = await controller.upsert({
      email: 'buyer@example.com',
      fullName: 'Ada',
    });

    // Assert
    expect(result).toEqual(expect.objectContaining({ email: customer.email }));
  });

  it('creates delivery', async () => {
    // Arrange
    const delivery = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      customerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      address: 'Calle 1',
      city: 'Bogota',
      region: 'Cundinamarca',
      postalCode: null,
    };
    const upsertCustomer = { execute: jest.fn() };
    const createDelivery = {
      execute: jest.fn(async () => ok(delivery)),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [
        { provide: UpsertCustomerUseCase, useValue: upsertCustomer },
        { provide: CreateDeliveryUseCase, useValue: createDelivery },
      ],
    }).compile();
    const controller = moduleRef.get(CheckoutController);

    // Act
    const result = await controller.createDeliveryEndpoint({
      customerId: delivery.customerId,
      address: 'Calle 1',
      city: 'Bogota',
      region: 'Cundinamarca',
    });

    // Assert
    expect(result).toEqual(
      expect.objectContaining({ id: delivery.id, city: 'Bogota' }),
    );
  });
});
