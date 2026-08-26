import { describe, expect, it } from '@jest/globals';
import {
  toCustomerResponse,
  toDeliveryResponse,
  toProductResponse,
  toTransactionResponse,
} from './dto';

describe('dto mappers', () => {
  it('maps product', () => {
    const result = toProductResponse({
      id: '1',
      name: 'A',
      description: 'd',
      price: 1,
      stock: 2,
      imageUrl: null,
    });
    expect(result).toEqual({
      id: '1',
      name: 'A',
      description: 'd',
      price: 1,
      stock: 2,
      imageUrl: null,
    });
  });

  it('maps customer', () => {
    expect(
      toCustomerResponse({
        id: '1',
        email: 'a@b.co',
        fullName: 'Ada',
        phone: null,
      }),
    ).toEqual({
      id: '1',
      email: 'a@b.co',
      fullName: 'Ada',
      phone: null,
    });
  });

  it('maps delivery', () => {
    expect(
      toDeliveryResponse({
        id: '1',
        customerId: '2',
        address: 'x',
        city: 'y',
        region: 'z',
        postalCode: null,
      }),
    ).toEqual({
      id: '1',
      customerId: '2',
      address: 'x',
      city: 'y',
      region: 'z',
      postalCode: null,
    });
  });

  it('maps transaction including card metadata', () => {
    expect(
      toTransactionResponse({
        id: '1',
        reference: 'chk',
        status: 'APPROVED',
        productId: 'p',
        customerId: 'c',
        deliveryId: 'd',
        quantity: 1,
        amount: 1,
        baseFee: 1,
        deliveryFee: 1,
        total: 3,
        currency: 'COP',
        providerTransactionId: 'prov',
        cardBrand: 'VISA',
        cardLastFour: '4242',
      }),
    ).toEqual(
      expect.objectContaining({
        status: 'APPROVED',
        providerTransactionId: 'prov',
        cardLastFour: '4242',
      }),
    );
  });
});
