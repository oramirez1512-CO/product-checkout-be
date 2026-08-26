import { describe, expect, it } from '@jest/globals';
import {
  isUuid,
  isValidEmail,
  normalizeEmail,
  optionalTrim,
  requireCardPayment,
  requireNonEmpty,
  requireUuid,
} from './validation';

describe('validation helpers', () => {
  describe('isUuid / requireUuid', () => {
    it('accepts a valid UUID', () => {
      // Arrange
      const value = '11111111-1111-4111-8111-111111111111';

      // Act
      const result = requireUuid(value, 'id');

      // Assert
      expect(isUuid(value)).toBe(true);
      expect(result).toEqual({ ok: true, value });
    });

    it.each([
      ['empty', ''],
      ['undefined', undefined],
      ['not a uuid', 'not-a-uuid'],
      ['wrong version nibble', '11111111-1111-6111-8111-111111111111'],
    ])('rejects %s', (_label, value) => {
      // Arrange / Act
      const result = requireUuid(value as string | undefined, 'id');

      // Assert
      expect(result.ok).toBe(false);
    });
  });

  describe('email', () => {
    it('normalizes email', () => {
      // Arrange / Act / Assert
      expect(normalizeEmail('  Buyer@Example.COM ')).toBe('buyer@example.com');
    });

    it.each([
      ['valid', 'a@b.co', true],
      ['missing @', 'bad', false],
      ['empty', '', false],
      ['spaces only local', ' @x.com', false],
    ])('isValidEmail %s', (_label, email, expected) => {
      expect(isValidEmail(email)).toBe(expected);
    });
  });

  describe('optionalTrim / requireNonEmpty', () => {
    it.each([
      ['undefined', undefined, null],
      ['empty', '   ', null],
      ['value', '  hi ', 'hi'],
    ])('optionalTrim %s', (_label, input, expected) => {
      expect(optionalTrim(input)).toBe(expected);
    });

    it('requireNonEmpty accepts trimmed value', () => {
      expect(requireNonEmpty('  name ', 'fullName')).toEqual({
        ok: true,
        value: 'name',
      });
    });

    it.each([['empty', ''], ['spaces', '   '], ['undefined', undefined]])(
      'requireNonEmpty rejects %s',
      (_label, value) => {
        const result = requireNonEmpty(value as string | undefined, 'fullName');
        expect(result.ok).toBe(false);
      },
    );
  });

  describe('requireCardPayment (boundary / min-max)', () => {
    const base = {
      number: '4242424242424242',
      cvc: '123',
      expMonth: '12',
      expYear: '29',
      cardHolder: 'Ada Buyer',
    };

    it('accepts min-length PAN (13 digits) and CVC (3)', () => {
      // Arrange
      const card = {
        ...base,
        number: '4242424242424', // 13
        cvc: '123',
      };

      // Act
      const result = requireCardPayment(card);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('accepts max-length PAN (19 digits) and CVC (4)', () => {
      // Arrange
      const card = {
        ...base,
        number: '4242424242424242424', // 19
        cvc: '1234',
      };

      // Act
      const result = requireCardPayment(card);

      // Assert
      expect(result.ok).toBe(true);
    });

    it.each([
      ['below min PAN (12)', { number: '424242424242' }],
      ['above max PAN (20)', { number: '42424242424242424242' }],
      ['below min CVC (2)', { cvc: '12' }],
      ['above max CVC (5)', { cvc: '12345' }],
      ['month below min (0)', { expMonth: '0' }],
      ['month above max (13)', { expMonth: '13' }],
      ['year length 1', { expYear: '2' }],
      ['year length 3', { expYear: '202' }],
      ['installments below min (0)', { installments: 0 }],
      ['installments negative', { installments: -1 }],
    ])('rejects %s', (_label, override) => {
      // Arrange
      const card = { ...base, ...override };

      // Act
      const result = requireCardPayment(card);

      // Assert
      expect(result.ok).toBe(false);
    });

    it('accepts month boundary 1 and year 4 digits', () => {
      // Arrange
      const card = { ...base, expMonth: '1', expYear: '2029', installments: 1 };

      // Act
      const result = requireCardPayment(card);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.expMonth).toBe('01');
        expect(result.value.expYear).toBe('2029');
        expect(result.value.installments).toBe(1);
      }
    });

    it('rejects missing cardHolder', () => {
      const result = requireCardPayment({ ...base, cardHolder: '  ' });
      expect(result.ok).toBe(false);
    });

    it('rejects undefined card object', () => {
      expect(requireCardPayment(undefined).ok).toBe(false);
    });
  });
});
