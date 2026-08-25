export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

export type Customer = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
};

export type Delivery = {
  id: string;
  customerId: string;
  address: string;
  city: string;
  region: string;
  postalCode: string | null;
};

export type TransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'ERROR';

export type Transaction = {
  id: string;
  reference: string;
  status: TransactionStatus;
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
