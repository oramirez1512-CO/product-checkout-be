export type DomainErrorCode = 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT';

export class DomainError {
  constructor(
    public readonly code: DomainErrorCode,
    public readonly message: string,
  ) {}

  static notFound(message: string): DomainError {
    return new DomainError('NOT_FOUND', message);
  }

  static validation(message: string): DomainError {
    return new DomainError('VALIDATION', message);
  }

  static conflict(message: string): DomainError {
    return new DomainError('CONFLICT', message);
  }
}

export type Result<T, E = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = DomainError>(error: E): Result<never, E> {
  return { ok: false, error };
}
