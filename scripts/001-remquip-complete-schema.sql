-- ============================================================================
-- REMQUIP Complete Database Schema
-- Comprehensive migration with all tables, indexes, and relationships
-- Version: 1.0 | Date: 2026-03-21
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE (Core user storage - extends basic auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
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
-- 2. ADMIN CONTACTS TABLE (Contact info for admins visible to customers)
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
  specialization VARCHAR(100), -- e.g., "Sales", "Support", "Technical"
  bio TEXT,
  photo_url VARCHAR(500),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_admin_contact (user_id),
  INDEX idx_department (department),
  INDEX idx_specialization (specialization)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. USER SESSIONS TABLE (Token-based session management)
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
-- 4. ADMIN PERMISSIONS TABLE (Granular role-based permissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_admin_permissions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
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
  
  -- Audit & Settings
  can_view_audit_logs BOOLEAN DEFAULT false,
  can_manage_audit_logs BOOLEAN DEFAULT false,
  can_delete_data BOOLEAN DEFAULT false,
  can_edit_settings BOOLEAN DEFAULT false,
  
  -- Metadata
  granted_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES remquip_users(id),
  UNIQUE KEY unique_user_permissions (user_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. AUDIT LOGS TABLE (Complete action tracking for compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36),
  resource_name VARCHAR(255),
  
  -- Change Tracking
  old_values JSON,
  new_values JSON,
  
  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. CATEGORIES TABLE (Product categories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  parent_id VARCHAR(36),
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES remquip_categories(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. PRODUCTS TABLE (Product inventory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category_id VARCHAR(36),
  
  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  
  -- Inventory
  stock_quantity INT DEFAULT 0,
  reorder_level INT DEFAULT 10,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES remquip_categories(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_sku (sku),
  INDEX idx_category (category_id),
  INDEX idx_active (is_active),
  INDEX idx_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. PRODUCT IMAGES TABLE (Multi-image support per product)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_product_images (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. CUSTOMER ADDRESSES TABLE (Multiple addresses per customer)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_customer_addresses (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
  -- Address Details
  type ENUM('billing', 'shipping', 'business') DEFAULT 'shipping',
  name VARCHAR(100),
  company VARCHAR(100),
  street_address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'Canada',
  phone VARCHAR(20),
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. ORDERS TABLE (Customer orders)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  user_id VARCHAR(36) NOT NULL,
  
  -- Shipping & Billing
  shipping_address_id VARCHAR(36),
  billing_address_id VARCHAR(36),
  
  -- Order Status
  status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
  
  -- Pricing
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Additional Info
  notes TEXT,
  tracking_number VARCHAR(100),
  estimated_delivery_date DATE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  FOREIGN KEY (shipping_address_id) REFERENCES remquip_customer_addresses(id),
  FOREIGN KEY (billing_address_id) REFERENCES remquip_customer_addresses(id),
  INDEX idx_order_number (order_number),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. ORDER ITEMS TABLE (Line items for each order)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  
  -- Item Details
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES remquip_products(id),
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. ORDER TRACKING TABLE (Delivery status updates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_order_tracking (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  
  -- Tracking Details
  status VARCHAR(50) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. ORDER NOTES TABLE (Communication history on orders)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_order_notes (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  
  -- Note Details
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_internal (is_internal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. DISCOUNTS TABLE (Discount codes and promotions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_discounts (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  
  -- Discount Type
  type ENUM('percentage', 'fixed') DEFAULT 'percentage',
  value DECIMAL(10, 2) NOT NULL,
  
  -- Limits
  max_uses INT,
  current_uses INT DEFAULT 0,
  min_purchase_amount DECIMAL(10, 2),
  
  -- Validity
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES remquip_users(id),
  INDEX idx_code (code),
  INDEX idx_active (is_active),
  INDEX idx_valid_from (valid_from),
  INDEX idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. INVENTORY TRANSACTIONS TABLE (Audit trail for stock changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS remquip_inventory_transactions (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  
  -- Transaction Details
  transaction_type ENUM('purchase', 'sale', 'adjustment', 'return', 'damage') DEFAULT 'adjustment',
  quantity_change INT NOT NULL,
  reason TEXT,
  
  -- Related Reference
  order_id VARCHAR(36),
  reference_number VARCHAR(100),
  
  -- Metadata
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES remquip_users(id),
  INDEX idx_product_id (product_id),
  INDEX idx_type (transaction_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA (Optional - Default admin and permissions)
-- ============================================================================

-- Create super admin user (Update password hash in production!)
INSERT IGNORE INTO remquip_users (id, email, password_hash, first_name, last_name, role, status, email_verified, email_verified_at)
VALUES (
  'admin-001',
  'admin@remquip.ca',
  '$2b$10$KIXxPfxQJxM8V9N5eZXj3uh8j5xGh8j5xGh8j5xGh8j5xGh8j5xGh', -- Change this!
  'Super',
  'Admin',
  'super_admin',
  'active',
  true,
  NOW()
);

-- Grant all permissions to super admin
INSERT IGNORE INTO remquip_admin_permissions (id, user_id, granted_by, can_view_dashboard, can_manage_products, can_view_products, can_create_products, can_edit_products, can_delete_products, can_manage_orders, can_view_orders, can_edit_orders, can_update_order_status, can_delete_orders, can_manage_customers, can_view_customers, can_edit_customers, can_delete_customers, can_manage_inventory, can_view_inventory, can_adjust_inventory, can_manage_discounts, can_view_discounts, can_create_discounts, can_delete_discounts, can_manage_users, can_view_users, can_create_users, can_edit_users, can_delete_users, can_view_analytics, can_export_analytics, can_manage_cms, can_view_cms_pages, can_edit_cms_pages, can_view_audit_logs, can_manage_audit_logs, can_delete_data, can_edit_settings)
VALUES (
  'perm-admin-001',
  'admin-001',
  'admin-001',
  true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_orders_status_date ON remquip_orders(status, created_at);
CREATE INDEX idx_order_items_product ON remquip_order_items(product_id, order_id);
CREATE INDEX idx_product_active_featured ON remquip_products(is_active, is_featured);
CREATE INDEX idx_users_email_status ON remquip_users(email, status);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
