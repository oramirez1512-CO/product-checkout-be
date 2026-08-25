import { createHash } from 'node:crypto';

/** Wompi integrity signature: SHA256(reference + amount_in_cents + currency + integrity_key) */
export function buildIntegritySignature(input: {
  reference: string;
  amountInCents: number;
  currency: string;
  integrityKey: string;
}): string {
  const payload = `${input.reference}${input.amountInCents}${input.currency}${input.integrityKey}`;
  return createHash('sha256').update(payload).digest('hex');
}
