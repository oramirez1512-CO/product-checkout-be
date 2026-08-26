import { describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  GetProductUseCase,
  ListProductsUseCase,
} from '../../application/use-cases/products.use-cases';
import { ok } from '../../domain/result';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  const product = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Aurora',
    description: 'Headphones',
    price: 249900,
    stock: 12,
    imageUrl: null,
  };

  it('lists products', async () => {
    // Arrange
    const listProducts = { execute: jest.fn(async () => ok([product])) };
    const getProduct = { execute: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ListProductsUseCase, useValue: listProducts },
        { provide: GetProductUseCase, useValue: getProduct },
      ],
    }).compile();
    const controller = moduleRef.get(ProductsController);

    // Act
    const result = await controller.list();

    // Assert
    expect(result).toEqual([
      expect.objectContaining({ id: product.id, name: 'Aurora' }),
    ]);
  });

  it('gets product by id', async () => {
    // Arrange
    const listProducts = { execute: jest.fn() };
    const getProduct = { execute: jest.fn(async () => ok(product)) };
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ListProductsUseCase, useValue: listProducts },
        { provide: GetProductUseCase, useValue: getProduct },
      ],
    }).compile();
    const controller = moduleRef.get(ProductsController);

    // Act
    const result = await controller.getById(product.id);

    // Assert
    expect(result).toEqual(expect.objectContaining({ id: product.id }));
  });
});
