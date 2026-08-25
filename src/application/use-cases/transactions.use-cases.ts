import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Transaction } from '../../domain/entities';
import { roundMoney } from '../../domain/money';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
  DELIVERY_REPOSITORY,
  DeliveryRepository,
  PRODUCT_REPOSITORY,
  ProductRepository,
  TRANSACTION_REPOSITORY,
  TransactionRepository,
} from '../../domain/ports';
import { DomainError, err, ok, Result } from '../../domain/result';
import { FEES_CONFIG, FeesConfig } from '../../infrastructure/config/fees';
import { requireUuid } from '../validation';

export type CreatePendingTransactionCommand = {
  productId: string;
  customerId: string;
  deliveryId: string;
  quantity: number;
};

@Injectable()
export class CreatePendingTransactionUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepository,
    @Inject(DELIVERY_REPOSITORY)
    private readonly deliveries: DeliveryRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: TransactionRepository,
    @Inject(FEES_CONFIG)
    private readonly fees: FeesConfig,
  ) {}

  async execute(
    command: CreatePendingTransactionCommand,
  ): Promise<Result<Transaction>> {
    const productIdResult = requireUuid(command.productId, 'productId');
    if (!productIdResult.ok) {
      return productIdResult;
    }
    const customerIdResult = requireUuid(command.customerId, 'customerId');
    if (!customerIdResult.ok) {
      return customerIdResult;
    }
    const deliveryIdResult = requireUuid(command.deliveryId, 'deliveryId');
    if (!deliveryIdResult.ok) {
      return deliveryIdResult;
    }

    const quantity = Number(command.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return err(DomainError.validation('quantity must be a positive integer'));
    }

    const product = await this.products.findById(productIdResult.value);
    if (!product) {
      return err(DomainError.notFound('product not found'));
    }
    if (product.stock < quantity) {
      return err(
        DomainError.conflict(
          `insufficient stock: available ${product.stock}, requested ${quantity}`,
        ),
      );
    }

    const customer = await this.customers.findById(customerIdResult.value);
    if (!customer) {
      return err(DomainError.notFound('customer not found'));
    }

    const delivery = await this.deliveries.findById(deliveryIdResult.value);
    if (!delivery) {
      return err(DomainError.notFound('delivery not found'));
    }
    if (delivery.customerId !== customerIdResult.value) {
      return err(
        DomainError.validation('delivery does not belong to customer'),
      );
    }

    const amount = roundMoney(product.price * quantity);
    const baseFee = this.fees.baseFee;
    const deliveryFee = this.fees.deliveryFee;
    const total = roundMoney(amount + baseFee + deliveryFee);

    const transaction = await this.transactions.createPending({
      reference: `chk_${randomUUID()}`,
      productId: product.id,
      customerId: customer.id,
      deliveryId: delivery.id,
      quantity,
      amount,
      baseFee,
      deliveryFee,
      total,
      currency: this.fees.currency,
    });

    return ok(transaction);
  }
}

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: TransactionRepository,
  ) {}

  async execute(id: string): Promise<Result<Transaction>> {
    const idResult = requireUuid(id, 'transaction id');
    if (!idResult.ok) {
      return idResult;
    }

    const transaction = await this.transactions.findById(idResult.value);
    if (!transaction) {
      return err(DomainError.notFound('transaction not found'));
    }

    return ok(transaction);
  }
}
