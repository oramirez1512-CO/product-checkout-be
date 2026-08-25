import { Provider } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '../../domain/ports';
import { FakePaymentProvider } from './fake-payment.provider';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

export function paymentProviders(): Provider[] {
  return [
    {
      provide: PAYMENT_PROVIDER,
      useFactory: () => {
        const apiUrl = process.env.PAYMENT_API_URL?.trim();
        const publicKey = process.env.PAYMENT_PUBLIC_KEY?.trim();
        const privateKey = process.env.PAYMENT_PRIVATE_KEY?.trim();
        const integrityKey = process.env.PAYMENT_INTEGRITY_KEY?.trim();

        if (!apiUrl || !publicKey || !privateKey || !integrityKey) {
          // Keep API bootable before sandbox keys are configured (e.g. core-only deploys).
          return new FakePaymentProvider();
        }

        return new SandboxPaymentProvider({
          apiUrl,
          publicKey,
          privateKey,
          integrityKey,
        });
      },
    },
  ];
}
