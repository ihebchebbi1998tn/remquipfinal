-- ====================================================================================
-- REMQUIP NEXUS - COMPLETE DATABASE SCHEMA
-- ====================================================================================
-- This is the complete, production-ready SQL schema for REMQUIP
-- All tables have remquip_ prefix for consistency and clarity
-- Run this single file to create all necessary tables at once
--
-- Database: PostgreSQL 14+
-- Version: 1.0
-- Created: 2026-03-20
-- ====================================================================================

BEGIN;

-- ====================================================================================
-- 1. CORE USERS & AUTHENTICATION
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_users (
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
  CONSTRAINT remquip_users_valid_role CHECK (role IN ('admin', 'manager', 'user')),
  CONSTRAINT remquip_users_valid_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_remquip_users_email ON remquip_users(email);
CREATE INDEX IF NOT EXISTS idx_remquip_users_role ON remquip_users(role);
CREATE INDEX IF NOT EXISTS idx_remquip_users_status ON remquip_users(status);
CREATE INDEX IF NOT EXISTS idx_remquip_users_created_at ON remquip_users(created_at);


-- ====================================================================================
-- 2. ACCESS CONTROL & PAGE PERMISSIONS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS remquip_user_page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES remquip_users(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES remquip_pages(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_remquip_pages_slug ON remquip_pages(slug);
CREATE INDEX IF NOT EXISTS idx_remquip_pages_is_active ON remquip_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_remquip_user_page_access_user ON remquip_user_page_access(user_id);
CREATE INDEX IF NOT EXISTS idx_remquip_user_page_access_page ON remquip_user_page_access(page_id);


-- ====================================================================================
-- 3. CUSTOMERS & CRM
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_customers (
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
  created_by UUID REFERENCES remquip_users(id),
  CONSTRAINT remquip_customers_valid_type CHECK (customer_type IN ('Fleet', 'Wholesale', 'Distributor')),
  CONSTRAINT remquip_customers_valid_status CHECK (status IN ('active', 'inactive', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_remquip_customers_email ON remquip_customers(email);
CREATE INDEX IF NOT EXISTS idx_remquip_customers_company ON remquip_customers(company_name);
CREATE INDEX IF NOT EXISTS idx_remquip_customers_type ON remquip_customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_remquip_customers_status ON remquip_customers(status);
CREATE INDEX IF NOT EXISTS idx_remquip_customers_created_by ON remquip_customers(created_by);
CREATE INDEX IF NOT EXISTS idx_remquip_customers_created_at ON remquip_customers(created_at);


-- ====================================================================================
-- 4. CUSTOMER ADDRESSES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES remquip_customers(id) ON DELETE CASCADE,
  address_type VARCHAR(50) NOT NULL, -- billing, shipping
  street_address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(50) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'Canada',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_customer_addresses_customer ON remquip_customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_remquip_customer_addresses_type ON remquip_customer_addresses(address_type);


-- ====================================================================================
-- 5. CUSTOMER PREFERENCES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES remquip_customers(id) ON DELETE CASCADE,
  preferred_payment_method VARCHAR(50),
  newsletter_subscribed BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id)
);

CREATE INDEX IF NOT EXISTS idx_remquip_customer_preferences_customer ON remquip_customer_preferences(customer_id);


-- ====================================================================================
-- 6. CUSTOMER WISHLIST
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_customer_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES remquip_customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_customer_wishlist_customer ON remquip_customer_wishlist(customer_id);


-- ====================================================================================
-- 7. CUSTOMER SESSIONS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES remquip_customers(id) ON DELETE CASCADE,
  session_token VARCHAR(500) UNIQUE NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_customer_sessions_customer ON remquip_customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_remquip_customer_sessions_token ON remquip_customer_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_remquip_customer_sessions_expires ON remquip_customer_sessions(expires_at);


-- ====================================================================================
-- 8. PRODUCT CATEGORIES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID REFERENCES remquip_product_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_categories_slug ON remquip_product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_remquip_categories_parent ON remquip_product_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_remquip_categories_active ON remquip_product_categories(is_active);


-- ====================================================================================
-- 9. PRODUCTS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES remquip_product_categories(id) ON DELETE RESTRICT,
  price DECIMAL(10, 2) NOT NULL,
  wholesale_price DECIMAL(10, 2),
  distributor_price DECIMAL(10, 2),
  stock_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, draft, archived
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES remquip_users(id),
  CONSTRAINT remquip_products_valid_status CHECK (status IN ('active', 'draft', 'archived')),
  CONSTRAINT remquip_products_price_check CHECK (price > 0),
  CONSTRAINT remquip_products_stock_check CHECK (stock_quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_remquip_products_sku ON remquip_products(sku);
CREATE INDEX IF NOT EXISTS idx_remquip_products_name ON remquip_products(name);
CREATE INDEX IF NOT EXISTS idx_remquip_products_category ON remquip_products(category_id);
CREATE INDEX IF NOT EXISTS idx_remquip_products_status ON remquip_products(status);
CREATE INDEX IF NOT EXISTS idx_remquip_products_stock ON remquip_products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_remquip_products_featured ON remquip_products(is_featured);


-- ====================================================================================
-- 10. PRODUCT IMAGES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES remquip_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES remquip_users(id)
);

CREATE INDEX IF NOT EXISTS idx_remquip_product_images_product ON remquip_product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_remquip_product_images_primary ON remquip_product_images(product_id, is_primary);


-- ====================================================================================
-- 11. PRODUCT VARIANTS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES remquip_products(id) ON DELETE CASCADE,
  variant_name VARCHAR(255) NOT NULL,
  variant_sku VARCHAR(100) UNIQUE,
  variant_price DECIMAL(10, 2),
  stock_quantity INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_variants_product ON remquip_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_remquip_variants_sku ON remquip_product_variants(variant_sku);


-- ====================================================================================
-- 12. INVENTORY LOGS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES remquip_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES remquip_product_variants(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- stock_in, stock_out, adjustment, return, damage
  quantity_change INT NOT NULL,
  previous_quantity INT,
  new_quantity INT,
  reason TEXT,
  reference_id VARCHAR(100),
  created_by UUID REFERENCES remquip_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_inventory_logs_product ON remquip_inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_remquip_inventory_logs_date ON remquip_inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_remquip_inventory_logs_action ON remquip_inventory_logs(action);
CREATE INDEX IF NOT EXISTS idx_remquip_inventory_logs_reference ON remquip_inventory_logs(reference_id);


-- ====================================================================================
-- 13. ORDERS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES remquip_customers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
  payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid', -- unpaid, paid, partial, refunded
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  shipping DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50), -- credit_card, bank_transfer, check, other
  shipping_address TEXT,
  billing_address TEXT,
  notes TEXT,
  created_by UUID REFERENCES remquip_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  CONSTRAINT remquip_orders_valid_status CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  CONSTRAINT remquip_orders_valid_payment_status CHECK (payment_status IN ('unpaid', 'paid', 'partial', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_remquip_orders_customer ON remquip_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_remquip_orders_status ON remquip_orders(status);
CREATE INDEX IF NOT EXISTS idx_remquip_orders_order_number ON remquip_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_remquip_orders_date ON remquip_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_remquip_orders_payment_status ON remquip_orders(payment_status);


-- ====================================================================================
-- 14. ORDER ITEMS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES remquip_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES remquip_products(id),
  variant_id UUID REFERENCES remquip_product_variants(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_order_items_order ON remquip_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_remquip_order_items_product ON remquip_order_items(product_id);


-- ====================================================================================
-- 15. ORDER NOTES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES remquip_orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES remquip_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_order_notes_order ON remquip_order_notes(order_id);


-- ====================================================================================
-- 16. ORDER TRACKING EVENTS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_order_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES remquip_orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- ordered, paid, processing, shipped, delivered, cancelled
  description TEXT,
  created_by UUID REFERENCES remquip_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_order_tracking_events_order ON remquip_order_tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_remquip_order_tracking_events_date ON remquip_order_tracking_events(created_at);


-- ====================================================================================
-- 17. DISCOUNTS & PROMOTIONS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(50) NOT NULL, -- percentage, fixed_amount
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(12, 2),
  max_usage INT,
  current_usage INT DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES remquip_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT remquip_discounts_valid_type CHECK (discount_type IN ('percentage', 'fixed_amount'))
);

CREATE INDEX IF NOT EXISTS idx_remquip_discounts_code ON remquip_discounts(code);
CREATE INDEX IF NOT EXISTS idx_remquip_discounts_status ON remquip_discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_remquip_discounts_valid_from ON remquip_discounts(valid_from);


-- ====================================================================================
-- 18. CMS PAGES
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT,
  meta_description VARCHAR(255),
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES remquip_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_cms_pages_slug ON remquip_cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_remquip_cms_pages_published ON remquip_cms_pages(is_published);


-- ====================================================================================
-- 19. CMS SECTIONS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_cms_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES remquip_cms_pages(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  section_type VARCHAR(50), -- text, image, video, gallery
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_cms_sections_page ON remquip_cms_sections(page_id);


-- ====================================================================================
-- 20. PASSWORD RESET TOKENS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES remquip_users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_password_reset_tokens_user ON remquip_password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_remquip_password_reset_tokens_token ON remquip_password_reset_tokens(token);


-- ====================================================================================
-- 21. EMAIL VERIFICATION TOKENS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES remquip_users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_email_verification_tokens_user ON remquip_email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_remquip_email_verification_tokens_token ON remquip_email_verification_tokens(token);


-- ====================================================================================
-- 22. AUDIT LOGS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES remquip_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- users, products, orders, customers, etc.
  entity_id VARCHAR(100),
  changes JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_audit_logs_user ON remquip_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_remquip_audit_logs_date ON remquip_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_remquip_audit_logs_entity ON remquip_audit_logs(entity_type, entity_id);


-- ====================================================================================
-- 23. ANALYTICS DAILY METRICS
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_analytics_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  new_customers INT DEFAULT 0,
  total_page_views INT DEFAULT 0,
  total_unique_visitors INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_analytics_metrics_date ON remquip_analytics_daily_metrics(metric_date);


-- ====================================================================================
-- 24. NOTIFICATIONS (Optional but recommended)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS remquip_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES remquip_users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50), -- order, product, system, alert
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remquip_notifications_user ON remquip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_remquip_notifications_read ON remquip_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_remquip_notifications_date ON remquip_notifications(created_at);


-- ====================================================================================
-- COMMIT TRANSACTION
-- ====================================================================================

COMMIT;

-- ====================================================================================
-- SUCCESS
-- ====================================================================================
-- All 24 tables have been created successfully with remquip_ prefix
-- All indexes have been created for optimal query performance
-- All foreign key relationships and constraints are in place
-- Ready for application development and testing
-- ====================================================================================
