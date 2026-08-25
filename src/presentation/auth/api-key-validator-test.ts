import { afterEach, describe, expect, it } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyValidator, API_KEY_HEADER } from './api-key-validator';

function mockContext(path: string, apiKey?: string): ExecutionContext {
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) {
    headers[API_KEY_HEADER] = apiKey;
  }

  return {
    switchToHttp: () => ({
      getRequest: () => ({
        path,
        url: path,
        header: (name: string) => headers[name.toLowerCase()],
      }),
    }),
  } as ExecutionContext;
}

describe('ApiKeyValidator', () => {
  const validator = new ApiKeyValidator();
  const original = process.env.API_KEY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.API_KEY;
    } else {
      process.env.API_KEY = original;
    }
  });

  it('allows /health without API key', () => {
    process.env.API_KEY = 'secret-key';
    expect(validator.canActivate(mockContext('/health'))).toBe(true);
  });

  it('rejects missing API key on protected routes', () => {
    process.env.API_KEY = 'secret-key';
    expect(() => validator.canActivate(mockContext('/products'))).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts matching API key', () => {
    process.env.API_KEY = 'secret-key';
    expect(
      validator.canActivate(mockContext('/products', 'secret-key')),
    ).toBe(true);
  });
});
