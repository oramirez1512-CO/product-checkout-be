-- Manual migration for Supabase SQL Editor
-- Run once against the project database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE transaction_status AS ENUM (
  'PENDING',
  'APPROVED',
  'DECLINED',
  'ERROR'
);

CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL,
  price       numeric(12, 2) NOT NULL CHECK (price >= 0),
  stock       integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  full_name   text NOT NULL,
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_email_unique UNIQUE (email)
);

CREATE TABLE deliveries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES customers (id),
  address      text NOT NULL,
  city         text NOT NULL,
  region       text NOT NULL,
  postal_code  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference               text NOT NULL,
  status                  transaction_status NOT NULL DEFAULT 'PENDING',
  product_id              uuid NOT NULL REFERENCES products (id),
  customer_id             uuid NOT NULL REFERENCES customers (id),
  delivery_id             uuid NOT NULL REFERENCES deliveries (id),
  quantity                integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount                  numeric(12, 2) NOT NULL CHECK (amount >= 0),
  base_fee                numeric(12, 2) NOT NULL CHECK (base_fee >= 0),
  delivery_fee            numeric(12, 2) NOT NULL CHECK (delivery_fee >= 0),
  total                   numeric(12, 2) NOT NULL CHECK (total >= 0),
  currency                text NOT NULL DEFAULT 'COP',
  provider_transaction_id text,
  provider_status         text,
  card_brand              text,
  card_last_four          text,
  raw_response            jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_reference_unique UNIQUE (reference)
);

CREATE INDEX idx_deliveries_customer_id ON deliveries (customer_id);
CREATE INDEX idx_transactions_product_id ON transactions (product_id);
CREATE INDEX idx_transactions_customer_id ON transactions (customer_id);
CREATE INDEX idx_transactions_status ON transactions (status);
