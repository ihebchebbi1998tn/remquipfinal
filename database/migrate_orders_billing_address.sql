-- Add billing_address column to remquip_orders
ALTER TABLE remquip_orders
  ADD COLUMN IF NOT EXISTS billing_address TEXT NULL AFTER shipping_address;
