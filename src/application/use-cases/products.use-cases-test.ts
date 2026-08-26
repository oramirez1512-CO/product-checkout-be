import { describe, expect, it, jest } from '@jest/globals';
import { Product } from '../../domain/entities';
import { ProductRepository } from '../../domain/ports';
import { DomainError } from '../../domain/result';
import {
  GetProductUseCase,
  ListProductsUseCase,
} from './products.use-cases';

describe('ListProductsUseCase', () => {
  it('returns product list', async () => {
    // Arrange
    const products: Product[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Aurora',
        description: 'Headphones',
        price: 249900,
        stock: 12,
        imageUrl: null,
      },
    ];
    const repo = {
      findById: jest.fn(async (): Promise<Product | null> => null),
      list: jest.fn(async () => products),
    } satisfies ProductRepository;
    const useCase = new ListProductsUseCase(repo);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result).toEqual({ ok: true, value: products });
  });
});

describe('GetProductUseCase', () => {
  const product: Product = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Aurora',
    description: 'Headphones',
    price: 249900,
    stock: 12,
    imageUrl: null,
  };

  const repo: ProductRepository = {
    findById: jest.fn(async (id: string) =>
      id === product.id ? product : null,
    ),
    list: jest.fn(async () => [product]),
  };

  const useCase = new GetProductUseCase(repo);

  it('returns product when found', async () => {
    // Arrange / Act
    const result = await useCase.execute(product.id);

    // Assert
    expect(result).toEqual({ ok: true, value: product });
  });

  it('returns NOT_FOUND when missing', async () => {
    // Arrange / Act
    const result = await useCase.execute(
      '22222222-2222-4222-8222-222222222222',
    );

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(DomainError.notFound('product not found'));
    }
  });

  it('returns VALIDATION for invalid uuid', async () => {
    // Arrange / Act
    const result = await useCase.execute('not-a-uuid');

    // Assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });
});
