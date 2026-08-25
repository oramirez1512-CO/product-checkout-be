import { describe, expect, it } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DomainError } from '../../domain/result';
import { mapDomainError, unwrapResult } from './map-result';

describe('map-result', () => {
  it('maps NOT_FOUND to NotFoundException', () => {
    const error = mapDomainError(DomainError.notFound('missing'));
    expect(error).toBeInstanceOf(NotFoundException);
  });

  it('maps VALIDATION to BadRequestException', () => {
    const error = mapDomainError(DomainError.validation('bad'));
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('unwraps ok results', () => {
    expect(unwrapResult({ ok: true, value: 42 })).toBe(42);
  });

  it('throws on err results', () => {
    expect(() =>
      unwrapResult({
        ok: false,
        error: DomainError.notFound('missing'),
      }),
    ).toThrow(NotFoundException);
  });
});
