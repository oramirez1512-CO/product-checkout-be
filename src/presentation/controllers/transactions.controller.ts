import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreatePendingTransactionUseCase,
  GetTransactionUseCase,
  PayTransactionUseCase,
} from '../../application/use-cases/transactions.use-cases';
import {
  CreateTransactionBodyDto,
  PayTransactionBodyDto,
  toTransactionResponse,
} from '../dto';
import { unwrapResult } from '../http/map-result';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createPending: CreatePendingTransactionUseCase,
    private readonly payTransaction: PayTransactionUseCase,
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

  @Post(':id/pay')
  async pay(@Param('id') id: string, @Body() body: PayTransactionBodyDto) {
    return toTransactionResponse(
      unwrapResult(
        await this.payTransaction.execute({
          transactionId: id,
          card: {
            number: body?.number,
            cvc: body?.cvc,
            expMonth: body?.expMonth,
            expYear: body?.expYear,
            cardHolder: body?.cardHolder,
            installments: body?.installments,
          },
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
