-- Migration: 006_create_inventory.sql
-- Purpose: Create inventory tracking tables

CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  quantity_change INT NOT NULL,
  previous_quantity INT,
  new_quantity INT,
  reason TEXT,
  reference_id VARCHAR(100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_action ON inventory_logs(action);

COMMIT;
