import { describe, expect, it } from '@jest/globals';
import { parseMoney, roundMoney, toCents } from './money';

describe('money helpers', () => {
  it('roundMoney rounds to 2 decimals', () => {
    expect(roundMoney(10.126)).toBe(10.13);
    expect(roundMoney(10)).toBe(10);
  });

  it('parseMoney accepts string and number', () => {
    expect(parseMoney('12.34')).toBe(12.34);
    expect(parseMoney(12.3)).toBe(12.3);
  });

  it('toCents converts major units', () => {
    expect(toCents(263400)).toBe(26340000);
    expect(toCents(0.01)).toBe(1);
  });
});
