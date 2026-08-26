import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

describe('SandboxPaymentProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const chargeInput = {
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
  };

  it('tokenizes, charges and maps APPROVED without polling when final', async () => {
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
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
      },
    );

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

    const result = await provider.charge(chargeInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('APPROVED');
      expect(result.value.providerTransactionId).toBe('prov_tx_1');
      expect(result.value.cardLastFour).toBe('4242');
    }
    expect(fetchMock).toHaveBeenCalled();
  });

  it('polls PENDING until APPROVED', async () => {
    let polls = 0;
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';

        if (url.includes('/merchants/')) {
          return jsonResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'acc_1' },
              presigned_personal_data_auth: { acceptance_token: 'pers_1' },
            },
          });
        }
        if (url.endsWith('/tokens/cards')) {
          return jsonResponse({
            data: { id: 'tok_1', brand: 'VISA', last_four: '1111' },
          });
        }
        if (url.endsWith('/transactions') && method === 'POST') {
          return jsonResponse({
            data: {
              id: 'prov_pending',
              status: 'PENDING',
              payment_method: {},
            },
          });
        }
        if (url.includes('/transactions/prov_pending') && method === 'GET') {
          polls += 1;
          return jsonResponse({
            data: {
              id: 'prov_pending',
              status: polls >= 1 ? 'APPROVED' : 'PENDING',
              payment_method: {
                extra: { brand: 'VISA', last_four: '1111' },
              },
            },
          });
        }
        throw new Error(`unexpected ${method} ${url}`);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new SandboxPaymentProvider(
      {
        apiUrl: 'https://api-sandbox.example.com/v1',
        publicKey: 'pub',
        privateKey: 'prv',
        integrityKey: 'int',
        maxStatusPolls: 3,
        pollDelayMs: 1,
      },
      async () => undefined,
    );

    const result = await provider.charge(chargeInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('APPROVED');
    }
  });

  it('maps provider HTTP errors to CONFLICT', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    })) as unknown as typeof fetch;

    const provider = new SandboxPaymentProvider({
      apiUrl: 'https://api-sandbox.example.com/v1',
      publicKey: 'pub',
      privateKey: 'prv',
      integrityKey: 'int',
      maxStatusPolls: 0,
    });

    const result = await provider.charge(chargeInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT');
    }
  });

  it('maps DECLINED status', async () => {
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        if (url.includes('/merchants/')) {
          return jsonResponse({
            data: {
              presigned_acceptance: { acceptance_token: 'a' },
              presigned_personal_data_auth: { acceptance_token: 'b' },
            },
          });
        }
        if (url.endsWith('/tokens/cards')) {
          return jsonResponse({ data: { id: 'tok' } });
        }
        if (url.endsWith('/transactions') && method === 'POST') {
          return jsonResponse({
            data: { id: 'd1', status: 'DECLINED', payment_method: {} },
          });
        }
        throw new Error('unexpected');
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new SandboxPaymentProvider(
      {
        apiUrl: 'https://api-sandbox.example.com/v1',
        publicKey: 'pub',
        privateKey: 'prv',
        integrityKey: 'int',
        maxStatusPolls: 0,
      },
      async () => undefined,
    );

    const result = await provider.charge(chargeInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('DECLINED');
    }
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}
