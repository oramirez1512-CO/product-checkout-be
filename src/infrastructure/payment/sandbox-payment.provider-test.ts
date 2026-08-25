import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

describe('SandboxPaymentProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('tokenizes, charges and maps APPROVED without polling when final', async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.includes('/merchants/') && method === 'GET') {
        return jsonResponse({
          data: {
            presigned_acceptance: { acceptance_token: 'acc_1' },
            presigned_personal_data_auth: { acceptance_token: 'pers_1' },
          },
        });
      }

      if (url.endsWith('/tokens/cards') && method === 'POST') {
        return jsonResponse({
          data: {
            id: 'tok_test_1',
            brand: 'VISA',
            last_four: '4242',
          },
        });
      }

      if (url.endsWith('/transactions') && method === 'POST') {
        return jsonResponse({
          data: {
            id: 'prov_tx_1',
            status: 'APPROVED',
            status_message: null,
            payment_method: {
              type: 'CARD',
              extra: { brand: 'VISA', last_four: '4242' },
            },
          },
        });
      }

      throw new Error(`unexpected fetch ${method} ${url}`);
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new SandboxPaymentProvider(
      {
        apiUrl: 'https://api-sandbox.example.com/v1',
        publicKey: 'pub_test',
        privateKey: 'prv_test',
        integrityKey: 'int_test',
        maxStatusPolls: 0,
      },
      async () => undefined,
    );

    const result = await provider.charge({
      amountInCents: 26340000,
      currency: 'COP',
      customerEmail: 'buyer@example.com',
      reference: 'chk_ref_1',
      card: {
        number: '4242424242424242',
        cvc: '123',
        expMonth: '12',
        expYear: '29',
        cardHolder: 'Ada Buyer',
        installments: 1,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('APPROVED');
      expect(result.value.providerTransactionId).toBe('prov_tx_1');
      expect(result.value.cardLastFour).toBe('4242');
    }
    expect(fetchMock).toHaveBeenCalled();
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}
