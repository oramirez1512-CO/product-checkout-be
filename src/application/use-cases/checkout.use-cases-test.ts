import { describe, expect, it, jest } from '@jest/globals';
import { Customer } from '../../domain/entities';
import {
  CustomerRepository,
  UpsertCustomerInput,
} from '../../domain/ports';
import { DomainError } from '../../domain/result';
import { UpsertCustomerUseCase } from './checkout.use-cases';

describe('UpsertCustomerUseCase', () => {
  const saved: Customer = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'buyer@example.com',
    fullName: 'Ada Buyer',
    phone: null,
  };

  const repo = {
    findById: jest.fn(async (_id: string): Promise<Customer | null> => null),
    upsertByEmail: jest.fn(async (input: UpsertCustomerInput) => ({
      id: saved.id,
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
    })),
  } satisfies CustomerRepository;

  const useCase = new UpsertCustomerUseCase(repo);

  it('upserts with normalized email', async () => {
    const result = await useCase.execute({
      email: '  Buyer@Example.com ',
      fullName: ' Ada Buyer ',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('buyer@example.com');
      expect(result.value.fullName).toBe('Ada Buyer');
    }
    expect(repo.upsertByEmail).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      fullName: 'Ada Buyer',
      phone: null,
    });
  });

  it('rejects invalid email', async () => {
    const result = await useCase.execute({
      email: 'bad',
      fullName: 'Ada',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(
        DomainError.validation('a valid email is required'),
      );
    }
  });
});
