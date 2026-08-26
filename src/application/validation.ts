import { DomainError, err, ok, Result } from '../domain/result';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Trim optional string; empty becomes null. */
export function optionalTrim(value?: string | null): string | null {
  return value?.trim() || null;
}

export function requireUuid(
  value: string | undefined,
  fieldName: string,
): Result<string> {
  if (!value || !isUuid(value)) {
    return err(DomainError.validation(`${fieldName} must be a valid UUID`));
  }
  return ok(value);
}

export function requireNonEmpty(
  value: string | undefined,
  fieldName: string,
): Result<string> {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return err(DomainError.validation(`${fieldName} is required`));
  }
  return ok(trimmed);
}

export type CardPaymentFields = {
  number?: string;
  cvc?: string;
  expMonth?: string;
  expYear?: string;
  cardHolder?: string;
  installments?: number;
};

export function requireCardPayment(
  card: CardPaymentFields | undefined,
): Result<{
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
  installments?: number;
}> {
  const numberResult = requireNonEmpty(card?.number, 'card.number');
  if (!numberResult.ok) {
    return numberResult;
  }
  const digits = numberResult.value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) {
    return err(DomainError.validation('card.number is invalid'));
  }

  const cvcResult = requireNonEmpty(card?.cvc, 'card.cvc');
  if (!cvcResult.ok) {
    return cvcResult;
  }
  const cvc = cvcResult.value.replace(/\D/g, '');
  if (cvc.length < 3 || cvc.length > 4) {
    return err(DomainError.validation('card.cvc is invalid'));
  }

  const expMonthResult = requireNonEmpty(card?.expMonth, 'card.expMonth');
  if (!expMonthResult.ok) {
    return expMonthResult;
  }
  const month = Number(expMonthResult.value);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return err(DomainError.validation('card.expMonth must be between 1 and 12'));
  }

  const expYearResult = requireNonEmpty(card?.expYear, 'card.expYear');
  if (!expYearResult.ok) {
    return expYearResult;
  }
  const yearDigits = expYearResult.value.replace(/\D/g, '');
  if (yearDigits.length !== 2 && yearDigits.length !== 4) {
    return err(DomainError.validation('card.expYear is invalid'));
  }

  const cardHolderResult = requireNonEmpty(card?.cardHolder, 'card.cardHolder');
  if (!cardHolderResult.ok) {
    return cardHolderResult;
  }

  const installments = card?.installments;
  if (
    installments !== undefined &&
    (!Number.isInteger(installments) || installments < 1)
  ) {
    return err(
      DomainError.validation('card.installments must be a positive integer'),
    );
  }

  return ok({
    number: digits,
    cvc,
    expMonth: String(month).padStart(2, '0'),
    expYear: yearDigits,
    cardHolder: cardHolderResult.value,
    installments,
  });
}
