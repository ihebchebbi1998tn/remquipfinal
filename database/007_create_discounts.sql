-- Migration: 007_create_discounts.sql
-- Purpose: Create discount and promotion tables

CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  discount_type VARCHAR(50) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  applicable_to VARCHAR(50),
  applicable_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  applicable_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  applicable_customer_type VARCHAR(50),
  
  minimum_order_value DECIMAL(10, 2),
  maximum_uses INT,
  current_uses INT DEFAULT 0,
  usage_per_customer INT,
  
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed_amount')),
  CONSTRAINT valid_applicable_to CHECK (applicable_to IN ('all_products', 'specific_category', 'specific_product', 'customer_type')),
  CONSTRAINT value_check CHECK (discount_value > 0)
);

CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_category ON discounts(applicable_category_id);
CREATE INDEX IF NOT EXISTS idx_discounts_product ON discounts(applicable_product_id);

COMMIT;
