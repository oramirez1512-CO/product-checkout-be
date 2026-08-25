import { Controller, Get, Param } from '@nestjs/common';
import {
  GetProductUseCase,
  ListProductsUseCase,
} from '../../application/use-cases/products.use-cases';
import { toProductResponse } from '../dto';
import { unwrapResult } from '../http/map-result';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Get()
  async list() {
    return unwrapResult(await this.listProducts.execute()).map(
      toProductResponse,
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return toProductResponse(unwrapResult(await this.getProduct.execute(id)));
  }
}
