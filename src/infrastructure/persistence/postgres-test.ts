import { afterEach, describe, expect, it } from '@jest/globals';
import { createPgPool } from './postgres';

describe('createPgPool', () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = original;
    }
  });

  it('throws when DATABASE_URL missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => createPgPool()).toThrow(/DATABASE_URL/);
  });

  it('creates pool with connection string', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const pool = createPgPool();
    expect(pool).toBeDefined();
    void pool.end();
  });
});
