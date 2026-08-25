-- Optional seed. Run after 001_init_schema.sql.

INSERT INTO products (name, description, price, stock, image_url)
VALUES (
  'Aurora Wireless Headphones',
  'Over-ear Bluetooth headphones with 30h battery life and noise isolation.',
  249900.00,
  12,
  NULL
);
