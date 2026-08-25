import {
  Customer,
  Delivery,
  Product,
  Transaction,
} from '../domain/entities';

export type UpsertCustomerBodyDto = {
  email: string;
  fullName: string;
  phone?: string | null;
};

export type CreateDeliveryBodyDto = {
  customerId: string;
  address: string;
  city: string;
  region: string;
  postalCode?: string | null;
};

export type CreateTransactionBodyDto = {
  productId: string;
  customerId: string;
  deliveryId: string;
  quantity: number;
};

export function toProductResponse(product: Product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl,
  };
}

export function toCustomerResponse(customer: Customer) {
  return {
    id: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    phone: customer.phone,
  };
}

export function toDeliveryResponse(delivery: Delivery) {
  return {
    id: delivery.id,
    customerId: delivery.customerId,
    address: delivery.address,
    city: delivery.city,
    region: delivery.region,
    postalCode: delivery.postalCode,
  };
}

export function toTransactionResponse(transaction: Transaction) {
  return {
    id: transaction.id,
    reference: transaction.reference,
    status: transaction.status,
    productId: transaction.productId,
    customerId: transaction.customerId,
    deliveryId: transaction.deliveryId,
    quantity: transaction.quantity,
    amount: transaction.amount,
    baseFee: transaction.baseFee,
    deliveryFee: transaction.deliveryFee,
    total: transaction.total,
    currency: transaction.currency,
  };
}
