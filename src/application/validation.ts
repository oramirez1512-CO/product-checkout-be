const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
