/**
 * Parses CORS_ORIGIN into matchers.
 * Supports comma-separated exact origins and `*` wildcards.
 *
 * Example for local + Vercel Preview of this FE:
 * `http://localhost:5173,https://product-checkout-fe*.vercel.app`
 *
 * That requires the host to start with `product-checkout-fe` and end with
 * `.vercel.app` (CORS Origin is scheme+host+port — no URL path).
 */
export function parseCorsOriginPatterns(
  raw: string | undefined,
  fallback = 'http://localhost:5173',
): RegExp[] {
  const value = (raw ?? fallback).trim() || fallback;
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(originPatternToRegExp);
}

export function originPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  patterns: RegExp[],
): boolean {
  // Non-browser clients (curl, server-to-server) send no Origin.
  if (!origin) {
    return true;
  }
  return patterns.some((pattern) => pattern.test(origin));
}

export type CorsOriginCallback = (
  err: Error | null,
  allow?: boolean,
) => void;

/** Nest / Express `origin` callback for `enableCors`. */
export function createCorsOriginDelegate(
  rawEnv: string | undefined = process.env.CORS_ORIGIN,
): (origin: string | undefined, callback: CorsOriginCallback) => void {
  const patterns = parseCorsOriginPatterns(rawEnv);
  return (origin, callback) => {
    callback(null, isCorsOriginAllowed(origin, patterns));
  };
}
