import { ChargeInput, ChargeResult, ProviderChargeStatus } from '../../domain/payment';
import { PaymentProvider } from '../../domain/ports';
import { DomainError, err, ok, Result } from '../../domain/result';
import { buildIntegritySignature } from './integrity';

export type SandboxPaymentConfig = {
  apiUrl: string;
  publicKey: string;
  privateKey: string;
  integrityKey: string;
  /** Max polls when provider returns PENDING (default 5). */
  maxStatusPolls?: number;
  pollDelayMs?: number;
};

type JsonRecord = Record<string, unknown>;

/**
 * Sandbox payment adapter:
 * 1) acceptance tokens from GET /merchants/:publicKey
 * 2) tokenize card POST /tokens/cards (simple body for sandbox)
 * 3) create transaction POST /transactions
 * 4) poll GET /transactions/:id until final status when needed
 */
export class SandboxPaymentProvider implements PaymentProvider {
  constructor(
    private readonly config: SandboxPaymentConfig,
    private readonly sleep: (ms: number) => Promise<void> = delay,
  ) {}

  async charge(input: ChargeInput): Promise<Result<ChargeResult>> {
    try {
      const acceptance = await this.fetchAcceptanceTokens();
      const token = await this.tokenizeCard(input);
      const created = await this.createTransaction(input, acceptance, token.id);
      const finalTx = await this.waitForFinalStatus(created);
      return ok(mapChargeResult(finalTx));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'payment provider error';
      return err(DomainError.conflict(message));
    }
  }

  private async fetchAcceptanceTokens(): Promise<{
    acceptanceToken: string;
    acceptPersonalAuth: string;
  }> {
    const body = await this.requestJson(
      'GET',
      `/merchants/${encodeURIComponent(this.config.publicKey)}`,
      { auth: 'public' },
    );
    const data = asRecord(body.data);
    const acceptanceToken = nestedString(
      data,
      'presigned_acceptance',
      'acceptance_token',
    );
    const acceptPersonalAuth = nestedString(
      data,
      'presigned_personal_data_auth',
      'acceptance_token',
    );
    if (!acceptanceToken || !acceptPersonalAuth) {
      throw new Error('missing acceptance tokens from merchant endpoint');
    }
    return { acceptanceToken, acceptPersonalAuth };
  }

  private async tokenizeCard(
    input: ChargeInput,
  ): Promise<{ id: string; brand: string | null; lastFour: string | null }> {
    const body = await this.requestJson('POST', '/tokens/cards', {
      auth: 'public',
      payload: {
        number: input.card.number.replace(/\s/g, ''),
        cvc: input.card.cvc,
        exp_month: input.card.expMonth.padStart(2, '0'),
        exp_year: normalizeExpYear(input.card.expYear),
        card_holder: input.card.cardHolder,
      },
    });
    const data = asRecord(body.data);
    const id = asString(data.id);
    if (!id) {
      throw new Error('card tokenization did not return a token id');
    }
    return {
      id,
      brand: asString(data.brand),
      lastFour: asString(data.last_four),
    };
  }

  private async createTransaction(
    input: ChargeInput,
    acceptance: { acceptanceToken: string; acceptPersonalAuth: string },
    cardToken: string,
  ): Promise<JsonRecord> {
    const signature = buildIntegritySignature({
      reference: input.reference,
      amountInCents: input.amountInCents,
      currency: input.currency,
      integrityKey: this.config.integrityKey,
    });

    const body = await this.requestJson('POST', '/transactions', {
      auth: 'private',
      payload: {
        acceptance_token: acceptance.acceptanceToken,
        accept_personal_auth: acceptance.acceptPersonalAuth,
        amount_in_cents: input.amountInCents,
        currency: input.currency,
        customer_email: input.customerEmail,
        reference: input.reference,
        signature,
        payment_method: {
          type: 'CARD',
          installments: input.card.installments ?? 1,
          token: cardToken,
        },
      },
    });

    const data = asRecord(body.data);
    if (!asString(data.id)) {
      throw new Error('transaction create did not return an id');
    }
    return data;
  }

  private async waitForFinalStatus(tx: JsonRecord): Promise<JsonRecord> {
    const maxPolls = this.config.maxStatusPolls ?? 5;
    const delayMs = this.config.pollDelayMs ?? 1000;
    let current = tx;

    for (let i = 0; i < maxPolls; i += 1) {
      const status = normalizeStatus(asString(current.status));
      if (status !== 'PENDING') {
        return current;
      }
      const id = asString(current.id);
      if (!id) {
        return current;
      }
      await this.sleep(delayMs);
      const body = await this.requestJson('GET', `/transactions/${id}`, {
        auth: 'public',
      });
      current = asRecord(body.data);
    }

    return current;
  }

  private async requestJson(
    method: 'GET' | 'POST',
    path: string,
    options: {
      auth: 'public' | 'private';
      payload?: unknown;
    },
  ): Promise<JsonRecord> {
    const base = this.config.apiUrl.replace(/\/$/, '');
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const key =
      options.auth === 'private'
        ? this.config.privateKey
        : this.config.publicKey;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body:
        options.payload === undefined
          ? undefined
          : JSON.stringify(options.payload),
    });

    const text = await response.text();
    let parsed: unknown = {};
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(
          `payment provider returned non-JSON (${response.status}): ${text.slice(0, 200)}`,
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        `payment provider ${method} ${path} failed (${response.status}): ${text.slice(0, 400)}`,
      );
    }

    return asRecord(parsed);
  }
}

function mapChargeResult(tx: JsonRecord): ChargeResult {
  const paymentMethod = asRecord(tx.payment_method);
  const extra = asRecord(paymentMethod.extra);

  return {
    providerTransactionId: asString(tx.id) ?? 'unknown',
    status: normalizeStatus(asString(tx.status)),
    statusMessage: asString(tx.status_message),
    cardBrand: asString(extra.brand) ?? asString(paymentMethod.type),
    cardLastFour: asString(extra.last_four),
    rawResponse: tx,
  };
}

function normalizeStatus(status: string | null): ProviderChargeStatus {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'APPROVED';
    case 'DECLINED':
    case 'VOIDED':
      return 'DECLINED';
    case 'PENDING':
      return 'PENDING';
    default:
      return 'ERROR';
  }
}

function normalizeExpYear(year: string): string {
  const trimmed = year.trim();
  return trimmed.length === 4 ? trimmed.slice(-2) : trimmed.padStart(2, '0');
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object'
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function nestedString(
  root: JsonRecord,
  midKey: string,
  leafKey: string,
): string | null {
  const mid = asRecord(root[midKey]);
  return asString(mid[leafKey]);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
