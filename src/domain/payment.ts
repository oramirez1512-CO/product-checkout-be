export type CardPaymentInput = {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
  installments?: number;
};

export type ChargeInput = {
  amountInCents: number;
  currency: string;
  customerEmail: string;
  reference: string;
  card: CardPaymentInput;
};

export type ProviderChargeStatus =
  | 'APPROVED'
  | 'DECLINED'
  | 'ERROR'
  | 'PENDING';

export type ChargeResult = {
  providerTransactionId: string;
  status: ProviderChargeStatus;
  statusMessage: string | null;
  cardBrand: string | null;
  cardLastFour: string | null;
  rawResponse: unknown;
};
