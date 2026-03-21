-- Migration: 002_create_access_control.sql
-- Purpose: Create access control and page permission tables

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_user_page_access_user ON user_page_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_page_access_page ON user_page_access(page_id);

-- Seed pages for access control
INSERT INTO pages (name, slug, description, icon) VALUES
('Overview', 'overview', 'Dashboard overview', 'LayoutDashboard'),
('Products', 'products', 'Product management', 'Package'),
('Inventory', 'inventory', 'Stock management', 'Warehouse'),
('Orders', 'orders', 'Order management', 'ShoppingBag'),
('Customers', 'customers', 'Customer management', 'Users'),
('Discounts', 'discounts', 'Discount management', 'Tag'),
('CMS', 'cms', 'Content management', 'FileText'),
('Analytics', 'analytics', 'Analytics dashboard', 'BarChart3'),
('Users', 'users', 'User management', 'Users'),
('Access Control', 'access', 'Access control', 'Shield'),
('Settings', 'settings', 'System settings', 'Settings')
ON CONFLICT (name) DO NOTHING;

COMMIT;
