import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreatePendingTransactionUseCase,
  GetTransactionUseCase,
} from '../../application/use-cases/transactions.use-cases';
import {
  CreateTransactionBodyDto,
  toTransactionResponse,
} from '../dto';
import { unwrapResult } from '../http/map-result';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createPending: CreatePendingTransactionUseCase,
    private readonly getTransaction: GetTransactionUseCase,
  ) {}

  @Post()
  async create(@Body() body: CreateTransactionBodyDto) {
    return toTransactionResponse(
      unwrapResult(
        await this.createPending.execute({
          productId: body?.productId,
          customerId: body?.customerId,
          deliveryId: body?.deliveryId,
          quantity: body?.quantity,
        }),
      ),
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return toTransactionResponse(
      unwrapResult(await this.getTransaction.execute(id)),
    );
  }
}
