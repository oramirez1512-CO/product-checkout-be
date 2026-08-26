import { describe, expect, it, jest } from '@jest/globals';
import { Customer, Delivery } from '../../domain/entities';
import {
  CustomerRepository,
  DeliveryRepository,
  UpsertCustomerInput,
} from '../../domain/ports';
import { DomainError } from '../../domain/result';
import {
  CreateDeliveryUseCase,
  UpsertCustomerUseCase,
} from './checkout.use-cases';

describe('UpsertCustomerUseCase', () => {
  const saved: Customer = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'buyer@example.com',
    fullName: 'Ada Buyer',
    phone: null,
  };

  function build() {
    const repo = {
      findById: jest.fn(async (): Promise<Customer | null> => null),
      upsertByEmail: jest.fn(async (input: UpsertCustomerInput) => ({
        id: saved.id,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
      })),
    } satisfies CustomerRepository;

    return { useCase: new UpsertCustomerUseCase(repo), repo };
  }

  it('upserts with normalized email (happy path)', async () => {
    // Arrange
    const { useCase, repo } = build();

    // Act
    const result = await useCase.execute({
      email: '  Buyer@Example.com ',
      fullName: ' Ada Buyer ',
      phone: ' 300 ',
    });

    // Assert
    expect(result.ok).toBe(true);
    expect(repo.upsertByEmail).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      fullName: 'Ada Buyer',
      phone: '300',
    });
  });

  it('rejects invalid email', async () => {
    // Arrange
    const { useCase } = build();

    // Act
    const result = await useCase.execute({ email: 'bad', fullName: 'Ada' });

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(
        DomainError.validation('a valid email is required'),
      );
    }
  });

  it('rejects empty fullName', async () => {
    // Arrange
    const { useCase } = build();

    // Act
    const result = await useCase.execute({
      email: 'a@b.co',
      fullName: '   ',
    });

    // Assert
    expect(result.ok).toBe(false);
  });
});

describe('CreateDeliveryUseCase', () => {
  const customerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const customer: Customer = {
    id: customerId,
    email: 'buyer@example.com',
    fullName: 'Ada',
    phone: null,
  };
  const delivery: Delivery = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    customerId,
    address: 'Calle 1',
    city: 'Bogota',
    region: 'Cundinamarca',
    postalCode: '110111',
  };

  function build(overrides?: { customer?: Customer | null }) {
    const customers = {
      findById: jest.fn(async () =>
        overrides && 'customer' in overrides ? overrides.customer! : customer,
      ),
      upsertByEmail: jest.fn(async () => customer),
    } satisfies CustomerRepository;
    const deliveries = {
      findById: jest.fn(async (): Promise<Delivery | null> => null),
      create: jest.fn(async () => delivery),
    } satisfies DeliveryRepository;

    return {
      useCase: new CreateDeliveryUseCase(customers, deliveries),
      deliveries,
    };
  }

  it('creates delivery when customer exists', async () => {
    // Arrange
    const { useCase, deliveries } = build();

    // Act
    const result = await useCase.execute({
      customerId,
      address: ' Calle 1 ',
      city: ' Bogota ',
      region: ' Cundinamarca ',
      postalCode: ' 110111 ',
    });

    // Assert
    expect(result.ok).toBe(true);
    expect(deliveries.create).toHaveBeenCalledWith({
      customerId,
      address: 'Calle 1',
      city: 'Bogota',
      region: 'Cundinamarca',
      postalCode: '110111',
    });
  });

  it('returns NOT_FOUND when customer missing', async () => {
    // Arrange
    const { useCase } = build({ customer: null });

    // Act
    const result = await useCase.execute({
      customerId,
      address: 'Calle 1',
      city: 'Bogota',
      region: 'Cundinamarca',
    });

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it.each([
    ['customerId', { customerId: 'bad' }],
    ['address', { address: '' }],
    ['city', { city: '  ' }],
    ['region', { region: undefined }],
  ])('rejects invalid %s', async (_label, override) => {
    // Arrange
    const { useCase } = build();
    const command = {
      customerId,
      address: 'Calle 1',
      city: 'Bogota',
      region: 'Cundinamarca',
      ...override,
    };

    // Act
    const result = await useCase.execute(command as never);

    // Assert
    expect(result.ok).toBe(false);
  });
});
