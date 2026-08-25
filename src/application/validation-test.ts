import { describe, expect, it } from '@jest/globals';
import { requireCardPayment } from './validation';

describe('requireCardPayment', () => {
  it('accepts a valid card payload', () => {
    const result = requireCardPayment({
      number: '4242 4242 4242 4242',
      cvc: '123',
      expMonth: '12',
      expYear: '29',
      cardHolder: 'Ada Buyer',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.number).toBe('4242424242424242');
      expect(result.value.expMonth).toBe('12');
    }
  });

  it('rejects missing card number', () => {
    const result = requireCardPayment({
      cvc: '123',
      expMonth: '12',
      expYear: '29',
      cardHolder: 'Ada Buyer',
    });

    expect(result.ok).toBe(false);
  });
});
