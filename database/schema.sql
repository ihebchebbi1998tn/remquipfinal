-- ====================================================================================
-- REMQUIP NEXUS DATABASE SCHEMA
-- ====================================================================================
-- Complete database schema for all admin features including Products, Orders, 
-- Customers, CMS, Discounts, Inventory, Users, and Access Control
-- ====================================================================================

-- ====================================================================================
-- 1. CORE USERS & AUTHENTICATION
-- ====================================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, manager, user
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, suspended
  avatar_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'user')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ====================================================================================
-- 2. ACCESS CONTROL & PAGE PERMISSIONS
-- ====================================================================================

CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_page_access (
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

CREATE INDEX idx_user_page_access_user ON user_page_access(user_id);
CREATE INDEX idx_user_page_access_page ON user_page_access(page_id);

-- ====================================================================================
-- 3. CUSTOMERS & CRM
-- ====================================================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  customer_type VARCHAR(50) NOT NULL, -- Fleet, Wholesale, Distributor
  tax_id VARCHAR(50),
  street_address VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Canada',
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, blocked
  notes TEXT,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  CONSTRAINT valid_customer_type CHECK (customer_type IN ('Fleet', 'Wholesale', 'Distributor')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'blocked'))
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_company ON customers(company_name);
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_by ON customers(created_by);

-- ====================================================================================
-- 4. PRODUCT CATEGORIES & SUBCATEGORIES
-- ====================================================================================

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON product_categories(slug);
CREATE INDEX idx_categories_parent ON product_categories(parent_category_id);
CREATE INDEX idx_categories_active ON product_categories(is_active);

-- ====================================================================================
-- 5. PRODUCTS & VARIANTS
-- ====================================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  price DECIMAL(10, 2) NOT NULL,
  wholesale_price DECIMAL(10, 2),
  distributor_price DECIMAL(10, 2),
  stock_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, draft, archived
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  CONSTRAINT valid_product_status CHECK (status IN ('active', 'draft', 'archived')),
  CONSTRAINT price_check CHECK (price > 0),
  CONSTRAINT stock_check CHECK (stock_quantity >= 0)
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_stock ON products(stock_quantity);

-- ====================================================================================
-- 6. PRODUCT IMAGES
-- ====================================================================================

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary);

-- ====================================================================================
-- 7. PRODUCT VARIANTS (For different sizes, colors, etc.)
-- ====================================================================================

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name VARCHAR(255) NOT NULL, -- e.g., "Red - Large", "Blue - Medium"
  variant_sku VARCHAR(100) UNIQUE,
  variant_price DECIMAL(10, 2),
  stock_quantity INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(variant_sku);

-- ====================================================================================
-- 8. INVENTORY TRACKING
-- ====================================================================================

CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- stock_in, stock_out, adjustment, return, damage
  quantity_change INT NOT NULL,
  previous_quantity INT,
  new_quantity INT,
  reason TEXT,
  reference_id VARCHAR(100), -- order_id, return_id, etc.
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_date ON inventory_logs(created_at);
CREATE INDEX idx_inventory_logs_action ON inventory_logs(action);

-- ====================================================================================
-- 9. ORDERS & ORDER ITEMS
-- ====================================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE, -- RMQ-001234
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, shipped, completed, cancelled, refunded
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Pricing
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  
  -- Payment
  payment_method VARCHAR(50), -- credit_card, invoice, bank_transfer, cash
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed
  
  -- Shipping
  shipping_address_street VARCHAR(255),
  shipping_address_city VARCHAR(100),
  shipping_address_province VARCHAR(50),
  shipping_address_postal VARCHAR(20),
  shipping_address_country VARCHAR(100),
  
  -- Tracking
  tracking_number VARCHAR(100),
  carrier VARCHAR(100), -- Purolator, Canada Post, UPS, FedEx, etc.
  shipped_date TIMESTAMP,
  delivered_date TIMESTAMP,
  
  notes TEXT,
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed')),
  CONSTRAINT total_check CHECK (total >= 0)
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- ====================================================================================
-- 10. ORDER ITEMS
-- ====================================================================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quantity_check CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ====================================================================================
-- 11. ORDER NOTES & TIMELINE
-- ====================================================================================

CREATE TABLE order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_notes_order ON order_notes(order_id);

-- ====================================================================================
-- 12. DISCOUNTS & PROMOTIONS
-- ====================================================================================

CREATE TABLE discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  discount_type VARCHAR(50) NOT NULL, -- percentage, fixed_amount
  discount_value DECIMAL(10, 2) NOT NULL,
  applicable_to VARCHAR(50), -- all_products, specific_category, specific_product, customer_type
  applicable_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  applicable_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  applicable_customer_type VARCHAR(50), -- Fleet, Wholesale, Distributor, all
  
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

CREATE INDEX idx_discounts_code ON discounts(code);
CREATE INDEX idx_discounts_active ON discounts(is_active);
CREATE INDEX idx_discounts_category ON discounts(applicable_category_id);
CREATE INDEX idx_discounts_product ON discounts(applicable_product_id);

-- ====================================================================================
-- 13. CMS PAGES & CONTENT
-- ====================================================================================

CREATE TABLE cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT,
  meta_description VARCHAR(255),
  meta_keywords VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, published, scheduled, archived
  featured_image_url TEXT,
  
  view_count INT DEFAULT 0,
  last_viewed TIMESTAMP,
  
  published_date TIMESTAMP,
  scheduled_publish_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  CONSTRAINT valid_cms_status CHECK (status IN ('draft', 'published', 'scheduled', 'archived'))
);

CREATE INDEX idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX idx_cms_pages_status ON cms_pages(status);
CREATE INDEX idx_cms_pages_created_by ON cms_pages(created_by);

-- ====================================================================================
-- 14. CMS SECTIONS (For block-based editing)
-- ====================================================================================

CREATE TABLE cms_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL, -- hero, features, testimonials, faq, text, image, video, form
  title VARCHAR(255),
  content TEXT,
  display_order INT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  settings JSON, -- Flexible settings for different section types
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_sections_page ON cms_sections(page_id);
CREATE INDEX idx_cms_sections_order ON cms_sections(page_id, display_order);

-- ====================================================================================
-- 15. AUDIT LOGS
-- ====================================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100) NOT NULL, -- products, orders, customers, users, discounts, cms_pages
  entity_id VARCHAR(100),
  action VARCHAR(50) NOT NULL, -- create, update, delete, publish, approve, reject
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- ====================================================================================
-- 16. ANALYTICS & METRICS
-- ====================================================================================

CREATE TABLE analytics_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  total_customers INT DEFAULT 0,
  new_customers INT DEFAULT 0,
  total_page_views INT DEFAULT 0,
  total_visits INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_date)
);

CREATE INDEX idx_analytics_date ON analytics_daily_metrics(metric_date);

-- ====================================================================================
-- SEED DATA - Default Pages for Access Control
-- ====================================================================================

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
ON CONFLICT DO NOTHING;

-- ====================================================================================
-- END OF SCHEMA
-- ====================================================================================
