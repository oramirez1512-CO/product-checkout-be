import { createHash } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import { buildIntegritySignature } from './integrity';

describe('buildIntegritySignature', () => {
  it('matches SHA256 of reference + cents + currency + integrity key', () => {
    const signature = buildIntegritySignature({
      reference: 'chk_abc',
      amountInCents: 150000,
      currency: 'COP',
      integrityKey: 'test_integrity',
    });

    const expected = createHash('sha256')
      .update('chk_abc150000COPtest_integrity')
      .digest('hex');

    expect(signature).toBe(expected);
  });
});
