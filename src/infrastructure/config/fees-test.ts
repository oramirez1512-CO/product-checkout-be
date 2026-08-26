import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_BASE_FEE,
  DEFAULT_CURRENCY,
  DEFAULT_DELIVERY_FEE,
  resolveFeesConfig,
} from './fees';

describe('resolveFeesConfig', () => {
  it('uses defaults when env empty', () => {
    // Arrange / Act
    const fees = resolveFeesConfig({});

    // Assert
    expect(fees).toEqual({
      baseFee: DEFAULT_BASE_FEE,
      deliveryFee: DEFAULT_DELIVERY_FEE,
      currency: DEFAULT_CURRENCY,
    });
  });

  it('reads fees from env (min zero allowed)', () => {
    // Arrange / Act
    const fees = resolveFeesConfig({
      BASE_FEE: '0',
      DELIVERY_FEE: '0',
      CURRENCY: ' USD ',
    });

    // Assert
    expect(fees.baseFee).toBe(0);
    expect(fees.deliveryFee).toBe(0);
    expect(fees.currency).toBe('USD');
  });

  it('rejects negative BASE_FEE', () => {
    expect(() => resolveFeesConfig({ BASE_FEE: '-1' })).toThrow(/BASE_FEE/);
  });

  it('rejects negative DELIVERY_FEE', () => {
    expect(() => resolveFeesConfig({ DELIVERY_FEE: '-0.01' })).toThrow(
      /DELIVERY_FEE/,
    );
  });

  it('rejects NaN BASE_FEE', () => {
    expect(() => resolveFeesConfig({ BASE_FEE: 'nope' })).toThrow(/BASE_FEE/);
  });
});
