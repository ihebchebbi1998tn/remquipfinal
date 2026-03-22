-- ============================================================================
-- REMQUIP COMPLETE DATABASE SCHEMA
-- Single comprehensive migration file with ALL tables needed
-- All APIs, Frontend requirements, User Dashboard, Admin System
-- Date: 2026-03-22 | Version: 2.0
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

-- ============================================================================
-- 1. USERS TABLE - Core user storage with roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  
  -- Role: customer, admin, manager, super_admin
  role ENUM('customer', 'admin', 'manager', 'super_admin') DEFAULT 'customer',
  
  -- Account Status
  status ENUM('active', 'inactive', 'suspended', 'pending_verification') DEFAULT 'pending_verification',
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP NULL,
  
  -- Metadata
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. USER SESSIONS TABLE - Token-based session management
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_user_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
  -- Token Management
  access_token VARCHAR(500),
  refresh_token VARCHAR(500),
  token_expires_at TIMESTAMP NOT NULL,
  
  -- Session Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_name VARCHAR(100),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token_expires (token_expires_at),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. USER ADDRESSES TABLE - Customer shipping/billing addresses
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_user_addresses (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
  -- Address Details
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) NOT NULL,
  
  -- Address Type
  address_type ENUM('billing', 'shipping', 'both') DEFAULT 'shipping',
  is_default BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_address_type (address_type),
  INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. ADMIN CONTACTS TABLE - Contact info for admins visible to customers
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_admin_contacts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
  -- Contact Details
  position VARCHAR(100),
  department VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  available BOOLEAN DEFAULT true,
  
  -- Specialization
  specialization VARCHAR(100),
  bio TEXT,
  photo_url VARCHAR(500),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_admin_contact (user_id),
  INDEX idx_department (department),
  INDEX idx_specialization (specialization),
  INDEX idx_available (available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. ADMIN PERMISSIONS TABLE - Granular role-based permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_admin_permissions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  
  -- Dashboard
  can_view_dashboard BOOLEAN DEFAULT true,
  
  -- Product Management
  can_manage_products BOOLEAN DEFAULT false,
  can_view_products BOOLEAN DEFAULT false,
  can_create_products BOOLEAN DEFAULT false,
  can_edit_products BOOLEAN DEFAULT false,
  can_delete_products BOOLEAN DEFAULT false,
  
  -- Order Management
  can_manage_orders BOOLEAN DEFAULT false,
  can_view_orders BOOLEAN DEFAULT false,
  can_edit_orders BOOLEAN DEFAULT false,
  can_update_order_status BOOLEAN DEFAULT false,
  can_delete_orders BOOLEAN DEFAULT false,
  
  -- Customer Management
  can_manage_customers BOOLEAN DEFAULT false,
  can_view_customers BOOLEAN DEFAULT false,
  can_edit_customers BOOLEAN DEFAULT false,
  can_delete_customers BOOLEAN DEFAULT false,
  
  -- Inventory Management
  can_manage_inventory BOOLEAN DEFAULT false,
  can_view_inventory BOOLEAN DEFAULT false,
  can_adjust_inventory BOOLEAN DEFAULT false,
  
  -- Discount Management
  can_manage_discounts BOOLEAN DEFAULT false,
  can_view_discounts BOOLEAN DEFAULT false,
  can_create_discounts BOOLEAN DEFAULT false,
  can_delete_discounts BOOLEAN DEFAULT false,
  
  -- User Management
  can_manage_users BOOLEAN DEFAULT false,
  can_view_users BOOLEAN DEFAULT false,
  can_create_users BOOLEAN DEFAULT false,
  can_edit_users BOOLEAN DEFAULT false,
  can_delete_users BOOLEAN DEFAULT false,
  
  -- Analytics
  can_view_analytics BOOLEAN DEFAULT false,
  can_export_analytics BOOLEAN DEFAULT false,
  
  -- CMS
  can_manage_cms BOOLEAN DEFAULT false,
  can_view_cms_pages BOOLEAN DEFAULT false,
  can_edit_cms_pages BOOLEAN DEFAULT false,
  
  -- Audit
  can_view_audit_logs BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. CATEGORIES TABLE - Product categories with hierarchy
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  
  -- Hierarchy
  parent_category_id VARCHAR(36),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  
  FOREIGN KEY (parent_category_id) REFERENCES remquip_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES remquip_users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_slug (slug),
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active),
  INDEX idx_parent_category_id (parent_category_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. PRODUCTS TABLE - Core product information
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_products (
  id VARCHAR(36) PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Pricing
  price DECIMAL(12, 2) NOT NULL,
  wholesale_price DECIMAL(12, 2),
  distributor_price DECIMAL(12, 2),
  
  -- Category
  category_id VARCHAR(36) NOT NULL,
  
  -- Inventory
  stock_quantity INT DEFAULT 0,
  reorder_level INT DEFAULT 10,
  
  -- Status
  is_featured BOOLEAN DEFAULT false,
  status ENUM('active', 'draft', 'archived', 'discontinued') DEFAULT 'active',
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords VARCHAR(500),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  
  FOREIGN KEY (category_id) REFERENCES remquip_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES remquip_users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_sku (sku),
  INDEX idx_sku (sku),
  INDEX idx_category_id (category_id),
  INDEX idx_status (status),
  INDEX idx_is_featured (is_featured),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. PRODUCT IMAGES TABLE - Product images with ordering
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_product_images (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  
  -- Image Info
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  
  -- Ordering
  is_primary BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  
  -- Metadata
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by VARCHAR(36),
  
  FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES remquip_users(id) ON DELETE SET NULL,
  INDEX idx_product_id (product_id),
  INDEX idx_is_primary (is_primary),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. PRODUCT VARIANTS TABLE - Product variants/options
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_product_variants (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  
  -- Variant Info
  variant_name VARCHAR(255) NOT NULL,
  variant_sku VARCHAR(100),
  variant_price DECIMAL(12, 2),
  
  -- Inventory
  stock_quantity INT DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. DISCOUNTS TABLE - Discount codes and promotions
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_discounts (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  
  -- Discount Type
  discount_type ENUM('percentage', 'fixed_amount', 'free_shipping') DEFAULT 'percentage',
  discount_value DECIMAL(12, 2) NOT NULL,
  
  -- Constraints
  min_purchase_amount DECIMAL(12, 2),
  max_usage_count INT,
  current_usage_count INT DEFAULT 0,
  
  -- Validity
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  
  FOREIGN KEY (created_by) REFERENCES remquip_users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_code (code),
  INDEX idx_code (code),
  INDEX idx_is_active (is_active),
  INDEX idx_valid_from (valid_from),
  INDEX idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. ORDERS TABLE - Customer orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Customer Info
  customer_id VARCHAR(36) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  
  -- Dates
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Status
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded') DEFAULT 'pending',
  
  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  shipping_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  
  -- Payment Info
  payment_method VARCHAR(100),
  
  -- Shipping Info
  shipping_address_id VARCHAR(36),
  billing_address_id VARCHAR(36),
  
  -- Notes
  notes TEXT,
  admin_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES remquip_users(id) ON DELETE RESTRICT,
  FOREIGN KEY (shipping_address_id) REFERENCES remquip_user_addresses(id) ON DELETE SET NULL,
  FOREIGN KEY (billing_address_id) REFERENCES remquip_user_addresses(id) ON DELETE SET NULL,
  UNIQUE KEY unique_order_number (order_number),
  INDEX idx_order_number (order_number),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_order_date (order_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. ORDER ITEMS TABLE - Individual items in orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  
  -- Product Info
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  
  -- Order Item Details
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE RESTRICT,
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. ORDER NOTES TABLE - Order communication/notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_order_notes (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  
  -- Note Info
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  note_type ENUM('system', 'admin', 'customer', 'system_auto') DEFAULT 'admin',
  
  -- Metadata
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES remquip_users(id) ON DELETE SET NULL,
  INDEX idx_order_id (order_id),
  INDEX idx_is_internal (is_internal),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. ORDER TRACKING TABLE - Delivery tracking information
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_order_tracking (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL UNIQUE,
  
  -- Tracking Info
  tracking_number VARCHAR(100),
  carrier VARCHAR(100),
  shipping_method VARCHAR(100),
  
  -- Dates
  shipped_at TIMESTAMP NULL,
  estimated_delivery_date DATE,
  delivered_at TIMESTAMP NULL,
  
  -- Status
  status ENUM('pending', 'picked', 'packed', 'shipped', 'in_transit', 'delivered', 'returned') DEFAULT 'pending',
  
  -- Location
  last_location VARCHAR(255),
  last_update_at TIMESTAMP NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE CASCADE,
  UNIQUE KEY unique_order_tracking (order_id),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_status (status),
  INDEX idx_estimated_delivery_date (estimated_delivery_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. INVENTORY LOGS TABLE - Product inventory transaction log
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_inventory_logs (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  
  -- Transaction Info
  transaction_type ENUM('purchase', 'sale', 'adjustment', 'return', 'damage', 'recount') DEFAULT 'adjustment',
  quantity_change INT NOT NULL,
  quantity_before INT,
  quantity_after INT,
  
  -- Reference
  reference_id VARCHAR(36), -- Order ID or Adjustment ID
  reference_type VARCHAR(100), -- 'order', 'manual_adjustment', etc.
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES remquip_users(id) ON DELETE SET NULL,
  INDEX idx_product_id (product_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_reference_id (reference_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 16. AUDIT LOGS TABLE - Admin action tracking and compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  
  -- Action Info
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(36),
  
  -- Change Details
  old_values JSON,
  new_values JSON,
  
  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity_type (entity_type),
  INDEX idx_entity_id (entity_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 17. CMS PAGES TABLE - Content management system pages
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_cms_pages (
  id VARCHAR(36) PRIMARY KEY,
  
  -- Page Info
  page_name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255),
  description TEXT,
  
  -- Content
  content LONGTEXT,
  
  -- Status
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords VARCHAR(500),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  published_by VARCHAR(36),
  published_at TIMESTAMP NULL,
  
  FOREIGN KEY (created_by) REFERENCES remquip_users(id) ON DELETE SET NULL,
  FOREIGN KEY (published_by) REFERENCES remquip_users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_slug (slug),
  INDEX idx_slug (slug),
  INDEX idx_is_published (is_published),
  INDEX idx_page_name (page_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 18. CMS SECTIONS TABLE - Content sections within pages
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_cms_sections (
  id VARCHAR(36) PRIMARY KEY,
  page_id VARCHAR(36) NOT NULL,
  
  -- Section Info
  section_key VARCHAR(255) NOT NULL,
  section_title VARCHAR(255),
  section_content LONGTEXT,
  
  -- Ordering
  display_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (page_id) REFERENCES remquip_cms_pages(id) ON DELETE CASCADE,
  UNIQUE KEY unique_section (page_id, section_key),
  INDEX idx_page_id (page_id),
  INDEX idx_section_key (section_key),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 19. CUSTOMER SETTINGS TABLE - User preferences and settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_customer_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  
  -- Notifications
  email_notifications BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  
  -- Preferences
  preferred_language VARCHAR(10) DEFAULT 'en',
  preferred_currency VARCHAR(10) DEFAULT 'CAD',
  newsletter_subscribed BOOLEAN DEFAULT false,
  
  -- Privacy
  data_sharing_consent BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_settings (user_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 20. ANALYTICS DATA TABLE - Dashboard analytics snapshots
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_analytics (
  id VARCHAR(36) PRIMARY KEY,
  
  -- Date Info
  analytics_date DATE NOT NULL,
  
  -- Metrics
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  total_customers INT DEFAULT 0,
  new_customers INT DEFAULT 0,
  
  -- Product Metrics
  products_sold INT DEFAULT 0,
  top_product_id VARCHAR(36),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (top_product_id) REFERENCES remquip_products(id) ON DELETE SET NULL,
  UNIQUE KEY unique_analytics_date (analytics_date),
  INDEX idx_analytics_date (analytics_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- FINAL SETUP
-- ============================================================================
SET FOREIGN_KEY_CHECKS=1;

-- Create indexes for performance
CREATE INDEX idx_orders_customer_created ON remquip_orders(customer_id, created_at);
CREATE INDEX idx_order_items_product ON remquip_order_items(product_id);
CREATE INDEX idx_products_category_featured ON remquip_products(category_id, is_featured, status);
CREATE INDEX idx_inventory_logs_product_type ON remquip_inventory_logs(product_id, transaction_type);

-- ============================================================================
-- SEED DATA (OPTIONAL - Comment out if not needed)
-- ============================================================================

-- Insert default category if needed
-- INSERT INTO remquip_categories (id, name, slug, is_active, display_order) 
-- VALUES (UUID(), 'Truck Parts', 'truck-parts', true, 1);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
