import { describe, expect, it } from '@jest/globals';
import { FakePaymentProvider } from './fake-payment.provider';

describe('FakePaymentProvider', () => {
  const provider = new FakePaymentProvider();

  it('approves a normal charge', async () => {
    const result = await provider.charge({
      amountInCents: 150000,
      currency: 'COP',
      customerEmail: 'buyer@example.com',
      reference: 'chk_test_1',
      card: {
        number: '4242424242424242',
        cvc: '123',
        expMonth: '12',
        expYear: '29',
        cardHolder: 'Ada Buyer',
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('APPROVED');
      expect(result.value.cardBrand).toBe('VISA');
      expect(result.value.cardLastFour).toBe('4242');
      expect(result.value.providerTransactionId).toBe('fake_chk_test_1');
    }
  });

  it('declines when cardHolder contains DECLINED', async () => {
    const result = await provider.charge({
      amountInCents: 150000,
      currency: 'COP',
      customerEmail: 'buyer@example.com',
      reference: 'chk_test_2',
      card: {
        number: '4111111111111111',
        cvc: '123',
        expMonth: '12',
        expYear: '29',
        cardHolder: 'DECLINED User',
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('DECLINED');
    }
  });
});
