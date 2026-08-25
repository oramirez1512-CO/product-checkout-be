import {
  Customer,
  Delivery,
  Product,
  Transaction,
} from './entities';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
export const DELIVERY_REPOSITORY = Symbol('DELIVERY_REPOSITORY');
export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  list(): Promise<Product[]>;
}

export type UpsertCustomerInput = {
  email: string;
  fullName: string;
  phone: string | null;
};

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  upsertByEmail(input: UpsertCustomerInput): Promise<Customer>;
}

export type CreateDeliveryInput = {
  customerId: string;
  address: string;
  city: string;
  region: string;
  postalCode: string | null;
};

export interface DeliveryRepository {
  findById(id: string): Promise<Delivery | null>;
  create(input: CreateDeliveryInput): Promise<Delivery>;
}

export type CreatePendingTransactionInput = {
  reference: string;
  productId: string;
  customerId: string;
  deliveryId: string;
  quantity: number;
  amount: number;
  baseFee: number;
  deliveryFee: number;
  total: number;
  currency: string;
};

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  createPending(input: CreatePendingTransactionInput): Promise<Transaction>;
}
