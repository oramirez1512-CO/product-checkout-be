import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { isFinalTransactionStatus, Transaction } from '../../domain/entities';
import { CardPaymentInput } from '../../domain/payment';
import { toCents, roundMoney } from '../../domain/money';
import {
  CUSTOMER_REPOSITORY,
  CustomerRepository,
  DELIVERY_REPOSITORY,
  DeliveryRepository,
  PAYMENT_PROVIDER,
  PaymentProvider,
  PRODUCT_REPOSITORY,
  ProductRepository,
  TRANSACTION_REPOSITORY,
  TransactionRepository,
} from '../../domain/ports';
import { DomainError, err, ok, Result } from '../../domain/result';
import { FEES_CONFIG, FeesConfig } from '../../infrastructure/config/fees';
import { requireCardPayment, requireUuid } from '../validation';

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

export type PayTransactionCommand = {
  transactionId: string;
  card: CardPaymentInput;
};

@Injectable()
export class PayTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: TransactionRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: CustomerRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
    @Inject(PAYMENT_PROVIDER)
    private readonly payments: PaymentProvider,
  ) {}

  async execute(command: PayTransactionCommand): Promise<Result<Transaction>> {
    const idResult = requireUuid(command.transactionId, 'transaction id');
    if (!idResult.ok) {
      return idResult;
    }

    const cardResult = requireCardPayment(command.card);
    if (!cardResult.ok) {
      return cardResult;
    }

    const transaction = await this.transactions.findById(idResult.value);
    if (!transaction) {
      return err(DomainError.notFound('transaction not found'));
    }

    if (isFinalTransactionStatus(transaction.status)) {
      return ok(transaction);
    }

    if (transaction.status !== 'PENDING') {
      return err(
        DomainError.conflict(
          `transaction cannot be paid while status is ${transaction.status}`,
        ),
      );
    }

    const customer = await this.customers.findById(transaction.customerId);
    if (!customer) {
      return err(DomainError.notFound('customer not found'));
    }

    const product = await this.products.findById(transaction.productId);
    if (!product) {
      return err(DomainError.notFound('product not found'));
    }
    if (product.stock < transaction.quantity) {
      return err(
        DomainError.conflict(
          `insufficient stock: available ${product.stock}, requested ${transaction.quantity}`,
        ),
      );
    }

    const chargeResult = await this.payments.charge({
      amountInCents: toCents(transaction.total),
      currency: transaction.currency,
      customerEmail: customer.email,
      reference: transaction.reference,
      card: cardResult.value,
    });

    if (!chargeResult.ok) {
      return chargeResult;
    }

    const charge = chargeResult.value;

    try {
      const finalized = await this.transactions.finalizePayment({
        transactionId: transaction.id,
        status: charge.status,
        providerTransactionId: charge.providerTransactionId,
        providerStatus: charge.status,
        cardBrand: charge.cardBrand,
        cardLastFour: charge.cardLastFour,
        rawResponse: charge.rawResponse,
      });

      if (finalized) {
        return ok(finalized);
      }

      const latest = await this.transactions.findById(transaction.id);
      if (latest) {
        return ok(latest);
      }

      return err(DomainError.notFound('transaction not found'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'payment finalization failed';
      return err(DomainError.conflict(message));
    }
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
