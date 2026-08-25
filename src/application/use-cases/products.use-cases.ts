import { Inject, Injectable } from '@nestjs/common';
import { Product } from '../../domain/entities';
import { DomainError, err, ok, Result } from '../../domain/result';
import {
  PRODUCT_REPOSITORY,
  ProductRepository,
} from '../../domain/ports';
import { isUuid } from '../validation';

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(): Promise<Result<Product[]>> {
    return ok(await this.products.list());
  }
}

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(id: string): Promise<Result<Product>> {
    if (!isUuid(id)) {
      return err(DomainError.validation('product id must be a valid UUID'));
    }

    const product = await this.products.findById(id);
    if (!product) {
      return err(DomainError.notFound('product not found'));
    }

    return ok(product);
  }
}
