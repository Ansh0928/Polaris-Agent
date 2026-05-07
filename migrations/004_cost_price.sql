-- Add cost_price_aud to products for margin intelligence
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price_aud NUMERIC(10, 2) DEFAULT NULL;
