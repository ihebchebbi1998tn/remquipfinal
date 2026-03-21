-- ==================================================================================
-- REMQUIP NEXUS - COMPLETE DATABASE SCHEMA
-- ==================================================================================
-- Database: MySQL 8.0+
-- Version: 1.0
-- ==================================================================================

-- ==================================================================================
-- 1. USERS & AUTHENTICATION
-- ==================================================================================

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'user') DEFAULT 'user',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  avatar_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- ==================================================================================
-- 2. ACCESS CONTROL & PAGE PERMISSIONS
-- ==================================================================================

CREATE TABLE IF NOT EXISTS pages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active),
  INDEX idx_display_order (display_order)
);

CREATE TABLE IF NOT EXISTS user_page_access (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  page_id CHAR(36) NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_page (user_id, page_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_page_id (page_id)
);

-- ==================================================================================
-- 3. PRODUCTS, VARIANTS & CATEGORIES
-- ==================================================================================

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active)
);

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  category_id CHAR(36) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  details JSON,
  base_price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_sku (sku),
  INDEX idx_category_id (category_id),
  INDEX idx_is_active (is_active)
);

CREATE TABLE IF NOT EXISTS product_images (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_is_primary (is_primary)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  variant_name VARCHAR(255) NOT NULL,
  variant_value VARCHAR(255) NOT NULL,
  sku_suffix VARCHAR(50),
  price_modifier DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id)
);

-- ==================================================================================
-- 4. INVENTORY & STOCK
-- ==================================================================================

CREATE TABLE IF NOT EXISTS inventory (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  quantity_on_hand INT DEFAULT 0,
  quantity_reserved INT DEFAULT 0,
  quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  reorder_level INT DEFAULT 10,
  reorder_quantity INT DEFAULT 50,
  warehouse_location VARCHAR(100),
  last_stock_count TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_product (product_id),
  INDEX idx_quantity_available (quantity_available)
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  action VARCHAR(50) NOT NULL,
  quantity_change INT NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  old_quantity INT,
  new_quantity INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_product_id (product_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
);

-- ==================================================================================
-- 5. CUSTOMERS & CRM
-- ==================================================================================

CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  customer_type ENUM('Fleet', 'Wholesale', 'Distributor') DEFAULT 'Wholesale',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  tax_number VARCHAR(50),
  payment_terms VARCHAR(50),
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  credit_limit DECIMAL(12, 2),
  primary_contact_name VARCHAR(255),
  primary_contact_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_customer_type (customer_type),
  INDEX idx_status (status),
  INDEX idx_company_name (company_name)
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  user_id CHAR(36),
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_customer_id (customer_id),
  INDEX idx_created_at (created_at)
);

-- ==================================================================================
-- 6. ORDERS & ORDER ITEMS
-- ==================================================================================

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  shipping DECIMAL(12, 2) DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'CAD',
  payment_status ENUM('pending', 'paid', 'partial', 'failed') DEFAULT 'pending',
  shipping_address TEXT,
  notes TEXT,
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_customer_id (customer_id),
  INDEX idx_order_number (order_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  variant_id CHAR(36),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id)
);

-- ==================================================================================
-- 7. DISCOUNTS & PROMOTIONS
-- ==================================================================================

CREATE TABLE IF NOT EXISTS discounts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type ENUM('percentage', 'fixed_amount') DEFAULT 'percentage',
  discount_value DECIMAL(10, 2) NOT NULL,
  max_uses INT,
  current_uses INT DEFAULT 0,
  min_order_amount DECIMAL(12, 2),
  customer_type ENUM('Fleet', 'Wholesale', 'Distributor', 'All') DEFAULT 'All',
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_is_active (is_active),
  INDEX idx_valid_from (valid_from)
);

-- ==================================================================================
-- 8. CMS - CONTENT MANAGEMENT
-- ==================================================================================

CREATE TABLE IF NOT EXISTS cms_pages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT,
  meta_description VARCHAR(255),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_slug (slug),
  INDEX idx_is_published (is_published)
);

CREATE TABLE IF NOT EXISTS banners (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_is_active (is_active)
);

-- ==================================================================================
-- 9. ANALYTICS & TRACKING
-- ==================================================================================

CREATE TABLE IF NOT EXISTS analytics (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  event_type VARCHAR(100) NOT NULL,
  customer_id CHAR(36),
  user_id CHAR(36),
  data JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at),
  INDEX idx_customer_id (customer_id)
);

-- ==================================================================================
-- 10. SYSTEM SETTINGS & CONFIGURATION
-- ==================================================================================

CREATE TABLE IF NOT EXISTS settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value LONGTEXT,
  data_type VARCHAR(50),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- ==================================================================================
-- 11. FILE UPLOADS
-- ==================================================================================

CREATE TABLE IF NOT EXISTS file_uploads (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  upload_type VARCHAR(50),
  user_id CHAR(36),
  related_entity_type VARCHAR(100),
  related_entity_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_upload_type (upload_type),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- ==================================================================================
-- ==================================================================================
-- 11. CUSTOMER DOCUMENTS (Contracts, Files)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS customer_documents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'contract',
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  uploaded_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_customer_id (customer_id),
  INDEX idx_document_type (document_type),
  INDEX idx_created_at (created_at)
);

-- =====================================================================
-- 12. ORDER NOTES
-- =====================================================================

CREATE TABLE IF NOT EXISTS order_notes (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  user CHAR(36),
  text TEXT NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_date (date)
);

-- =====================================================================
-- 13. INSERT DEFAULT PAGES FOR ACCESS CONTROL
-- =====================================================================

INSERT IGNORE INTO pages (id, name, slug, description, icon) VALUES
('page_001', 'Dashboard', 'dashboard', 'Main dashboard overview', 'LayoutDashboard'),
('page_002', 'Products', 'products', 'Manage product catalog', 'Package'),
('page_003', 'Inventory', 'inventory', 'Stock management', 'Package2'),
('page_004', 'Orders', 'orders', 'Order management', 'ShoppingCart'),
('page_005', 'Customers', 'customers', 'Customer management', 'Users'),
('page_006', 'Discounts', 'discounts', 'Discount management', 'Tag'),
('page_007', 'Users', 'users', 'User management', 'UsersCog'),
('page_008', 'Access Control', 'access-control', 'Access permissions', 'Lock'),
('page_009', 'CMS', 'cms', 'Content management', 'FileText'),
('page_010', 'Analytics', 'analytics', 'Analytics dashboard', 'BarChart3'),
('page_011', 'Settings', 'settings', 'System settings', 'Settings'),
('page_012', 'Logs', 'logs', 'System logs', 'Activity');
