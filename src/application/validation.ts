import { DomainError, err, ok, Result } from '../domain/result';

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

/** Trim optional string; empty becomes null. */
export function optionalTrim(value?: string | null): string | null {
  return value?.trim() || null;
}

export function requireUuid(
  value: string | undefined,
  fieldName: string,
): Result<string> {
  if (!value || !isUuid(value)) {
    return err(DomainError.validation(`${fieldName} must be a valid UUID`));
  }
  return ok(value);
}

export function requireNonEmpty(
  value: string | undefined,
  fieldName: string,
): Result<string> {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return err(DomainError.validation(`${fieldName} is required`));
  }
  return ok(trimmed);
}
