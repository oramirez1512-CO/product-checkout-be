import { ChargeInput, ChargeResult } from '../../domain/payment';
import { PaymentProvider } from '../../domain/ports';
import { DomainError, err, ok, Result } from '../../domain/result';

/**
 * In-memory provider for unit tests / local wiring without sandbox HTTP.
 * APPROVED by default; cardHolder containing "DECLINED" → DECLINED.
 */
export class FakePaymentProvider implements PaymentProvider {
  async charge(input: ChargeInput): Promise<Result<ChargeResult>> {
    if (!input.reference || input.amountInCents < 1) {
      return err(DomainError.validation('invalid charge input'));
    }

    const digits = input.card.number.replace(/\D/g, '');
    const lastFour = digits.slice(-4) || null;
    const declined = /declined/i.test(input.card.cardHolder);
    const status = declined ? 'DECLINED' : 'APPROVED';

    return ok({
      providerTransactionId: `fake_${input.reference}`,
      status,
      statusMessage: declined ? 'Declined by fake provider' : null,
      cardBrand: digits.startsWith('4') ? 'VISA' : 'MASTERCARD',
      cardLastFour: lastFour,
      rawResponse: { fake: true, reference: input.reference, status },
    });
  }
}
