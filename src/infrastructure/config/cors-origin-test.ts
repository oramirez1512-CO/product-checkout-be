import { describe, expect, it } from '@jest/globals';
import {
  createCorsOriginDelegate,
  isCorsOriginAllowed,
  originPatternToRegExp,
  parseCorsOriginPatterns,
} from './cors-origin';

describe('cors-origin', () => {
  it('defaults to localhost when env empty', () => {
    const patterns = parseCorsOriginPatterns(undefined);
    expect(isCorsOriginAllowed('http://localhost:5173', patterns)).toBe(true);
    expect(isCorsOriginAllowed('https://evil.example', patterns)).toBe(false);
  });

  it('matches exact origins in a comma-separated list', () => {
    const patterns = parseCorsOriginPatterns(
      'http://localhost:5173, https://app.example.com',
    );
    expect(isCorsOriginAllowed('http://localhost:5173', patterns)).toBe(true);
    expect(isCorsOriginAllowed('https://app.example.com', patterns)).toBe(true);
    expect(isCorsOriginAllowed('https://other.example.com', patterns)).toBe(
      false,
    );
  });

  it('matches Vercel hosts that start with product-checkout-fe', () => {
    const patterns = parseCorsOriginPatterns(
      'http://localhost:5173,https://product-checkout-fe*.vercel.app',
    );
    expect(
      isCorsOriginAllowed(
        'https://product-checkout-fe-git-feature-abc-team.vercel.app',
        patterns,
      ),
    ).toBe(true);
    expect(
      isCorsOriginAllowed('https://product-checkout-fe.vercel.app', patterns),
    ).toBe(true);
    expect(
      isCorsOriginAllowed('https://other-project.vercel.app', patterns),
    ).toBe(false);
    expect(isCorsOriginAllowed('https://evil.com', patterns)).toBe(false);
    expect(
      isCorsOriginAllowed('https://product-checkout-fe.vercel.app.evil.com', patterns),
    ).toBe(false);
  });

  it('is case-insensitive on scheme/host', () => {
    const pattern = originPatternToRegExp('https://*.Vercel.App');
    expect(pattern.test('https://foo.vercel.app')).toBe(true);
  });

  it('allows missing Origin (non-browser)', () => {
    const patterns = parseCorsOriginPatterns('https://app.example.com');
    expect(isCorsOriginAllowed(undefined, patterns)).toBe(true);
  });

  it('createCorsOriginDelegate reports allow/deny via callback', () => {
    const check = createCorsOriginDelegate(
      'http://localhost:5173,https://product-checkout-fe*.vercel.app',
    );
    const allowed: boolean[] = [];
    check('https://product-checkout-fe-preview-123.vercel.app', (_err, allow) => {
      allowed.push(Boolean(allow));
    });
    check('https://random-app.vercel.app', (_err, allow) => {
      allowed.push(Boolean(allow));
    });
    expect(allowed).toEqual([true, false]);
  });
});
