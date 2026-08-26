import { describe, expect, it } from '@jest/globals';
import { isFinalTransactionStatus } from './entities';

describe('isFinalTransactionStatus', () => {
  it('marks APPROVED/DECLINED/ERROR as final', () => {
    expect(isFinalTransactionStatus('APPROVED')).toBe(true);
    expect(isFinalTransactionStatus('DECLINED')).toBe(true);
    expect(isFinalTransactionStatus('ERROR')).toBe(true);
  });

  it('marks PENDING as not final', () => {
    expect(isFinalTransactionStatus('PENDING')).toBe(false);
  });
});
