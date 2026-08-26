import { afterEach, describe, expect, it } from '@jest/globals';
import { FakePaymentProvider } from './fake-payment.provider';
import { paymentProviders } from './payment.providers';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

describe('paymentProviders factory', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns FakePaymentProvider when payment env incomplete', () => {
    // Arrange
    delete process.env.PAYMENT_API_URL;
    delete process.env.PAYMENT_PUBLIC_KEY;
    delete process.env.PAYMENT_PRIVATE_KEY;
    delete process.env.PAYMENT_INTEGRITY_KEY;

    // Act
    const [provider] = paymentProviders();
    const instance = (provider as { useFactory: () => unknown }).useFactory();

    // Assert
    expect(instance).toBeInstanceOf(FakePaymentProvider);
  });

  it('returns SandboxPaymentProvider when all payment env set', () => {
    // Arrange
    process.env.PAYMENT_API_URL = 'https://api-sandbox.example.com/v1';
    process.env.PAYMENT_PUBLIC_KEY = 'pub';
    process.env.PAYMENT_PRIVATE_KEY = 'prv';
    process.env.PAYMENT_INTEGRITY_KEY = 'int';

    // Act
    const [provider] = paymentProviders();
    const instance = (provider as { useFactory: () => unknown }).useFactory();

    // Assert
    expect(instance).toBeInstanceOf(SandboxPaymentProvider);
  });
});
