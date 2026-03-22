-- =============================================================================
-- REMQUIP NEXUS — SINGLE FILE: ALL TABLES + SEED DATA (MySQL 8.0+)
-- =============================================================================
-- One file contains the entire schema. No migrations needed.
-- Physical table names use prefix remquip_ (e.g. remquip_users, remquip_orders).
-- HTTP API paths are unchanged (/auth/login, /products, /orders, …); the React app
-- (src/lib/api-endpoints.ts) talks to those resources — only PHP/SQL uses remquip_*.
--
-- Import:
--   mysql -u USER -p DB_NAME < database/remquip_full_schema.sql
--
-- After import, before going live:
--   • Set DB_HOST / DB_USER / DB_PASS / DB_NAME in Backend/config.php for your MySQL.
--   • Match API_URL in config.php with src/config/constants.ts → API_BASE_URL.
--   • Map the web server so requests to …/remquip/api/* hit Backend/index.php (see Backend/.htaccess if Apache).
--   • chmod Backend/uploads (and logs) writable by PHP; test GET /health then /auth/login.
-- Charset: utf8mb4.
--
-- After import (defaults):
--   • Logins (password for both: "password"):
--       admin@remquip.local  — admin
--       user@remquip.local   — portal user; linked customer → user dashboard orders
--   • Catalog: 4 categories + 4 products + inventory (one low-stock line)
--   • Admin matrix: pages + full access for the seeded admin user
--   • CMS: published slug "home"; banners; admin_contacts; sample discounts WELCOME10 / SAVE5
--   • Settings: public keys + tax/shipping (GET /settings/storefront) + notification toggles
--   • Placeholder images: Backend/uploads/images/placeholder-*.svg (commit with repo)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------- 1. USERS
CREATE TABLE IF NOT EXISTS remquip_users (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  avatar_url TEXT NULL,
  phone VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_status (status),
  KEY idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_password_reset_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_prt_user (user_id),
  UNIQUE KEY uq_prt_hash (token_hash),
  KEY idx_prt_expires (expires_at),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 2. ACCESS CONTROL
-- VARCHAR avoids CHAR(36) trailing-space padding when using short string IDs in seeds.
CREATE TABLE IF NOT EXISTS remquip_pages (
  id VARCHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pages_name (name),
  UNIQUE KEY uq_pages_slug (slug),
  KEY idx_pages_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_user_page_access (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  page_id VARCHAR(36) NOT NULL,
  can_view TINYINT(1) NOT NULL DEFAULT 1,
  can_edit TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_page (user_id, page_id),
  KEY idx_upa_user (user_id),
  KEY idx_upa_page (page_id),
  CONSTRAINT fk_upa_user FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_upa_page FOREIGN KEY (page_id) REFERENCES remquip_pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 3. CATALOG
CREATE TABLE IF NOT EXISTS remquip_categories (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_categories_name (name),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Localized category labels (en + fr). Display: COALESCE(locale row, base remquip_categories.name/description).
CREATE TABLE IF NOT EXISTS remquip_category_translations (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  category_id CHAR(36) NOT NULL,
  locale VARCHAR(5) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_category_locale (category_id, locale),
  KEY idx_cat_tr_category (category_id),
  CONSTRAINT fk_cat_tr_category FOREIGN KEY (category_id) REFERENCES remquip_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_products (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  category_id CHAR(36) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  details JSON NULL,
  base_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_category (category_id),
  KEY idx_products_active (is_active),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES remquip_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_product_images (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  file_url TEXT NULL,
  alt_text VARCHAR(255) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pi_product (product_id),
  KEY idx_pi_primary (is_primary),
  CONSTRAINT fk_pi_product FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_product_variants (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  variant_name VARCHAR(255) NOT NULL,
  variant_value VARCHAR(255) NOT NULL,
  sku_suffix VARCHAR(50) NULL,
  price_modifier DECIMAL(10,2) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pv_product (product_id),
  CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 4. INVENTORY
CREATE TABLE IF NOT EXISTS remquip_inventory (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  quantity_on_hand INT NOT NULL DEFAULT 0,
  quantity_reserved INT NOT NULL DEFAULT 0,
  quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  reorder_level INT NOT NULL DEFAULT 10,
  reorder_quantity INT NOT NULL DEFAULT 50,
  warehouse_location VARCHAR(100) NULL,
  last_stock_count TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventory_product (product_id),
  KEY idx_inventory_available (quantity_available),
  CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_inventory_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  action VARCHAR(50) NOT NULL,
  quantity_change INT NOT NULL,
  reason VARCHAR(255) NULL,
  notes TEXT NULL,
  old_quantity INT NULL,
  new_quantity INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_il_product (product_id),
  KEY idx_il_created (created_at),
  CONSTRAINT fk_il_product FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_il_user FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 5. CUSTOMERS
CREATE TABLE IF NOT EXISTS remquip_customers (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  customer_type ENUM('Fleet','Wholesale','Distributor') NOT NULL DEFAULT 'Wholesale',
  status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  address TEXT NULL,
  city VARCHAR(100) NULL,
  province VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,
  country VARCHAR(100) NULL,
  tax_number VARCHAR(50) NULL,
  payment_terms VARCHAR(50) NULL,
  total_orders INT NOT NULL DEFAULT 0,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(12,2) NULL,
  primary_contact_name VARCHAR(255) NULL,
  primary_contact_phone VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_customers_email (email),
  KEY idx_customers_type (customer_type),
  KEY idx_customers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_customer_notes (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  note TEXT NOT NULL,
  is_internal TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cn_customer (customer_id),
  CONSTRAINT fk_cn_customer FOREIGN KEY (customer_id) REFERENCES remquip_customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cn_user FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_customer_documents (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'contract',
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT NULL,
  uploaded_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  KEY idx_cd_customer (customer_id),
  CONSTRAINT fk_cd_customer FOREIGN KEY (customer_id) REFERENCES remquip_customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cd_user FOREIGN KEY (uploaded_by) REFERENCES remquip_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 6. ORDERS
CREATE TABLE IF NOT EXISTS remquip_orders (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  customer_id CHAR(36) NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  status ENUM('pending','confirmed','processing','shipped','delivered','completed','cancelled') NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  payment_status ENUM('pending','paid','partial','failed','refunded') NOT NULL DEFAULT 'pending',
  shipping_address TEXT NULL,
  notes TEXT NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_customer (customer_id),
  KEY idx_orders_status (status),
  KEY idx_orders_created (created_at),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES remquip_customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_user FOREIGN KEY (created_by) REFERENCES remquip_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_order_items (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  variant_id CHAR(36) NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_oi_order (order_id),
  KEY idx_oi_product (product_id),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES remquip_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_variant FOREIGN KEY (variant_id) REFERENCES remquip_product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_order_notes (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  user CHAR(36) NULL,
  text TEXT NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_on_order (order_id),
  CONSTRAINT fk_on_order FOREIGN KEY (order_id) REFERENCES remquip_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 7. DISCOUNTS (columns aligned with Backend/routes/discounts.php)
CREATE TABLE IF NOT EXISTS remquip_discounts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NULL,
  discount_type ENUM('percentage','fixed_amount') NOT NULL DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_uses INT NULL,
  uses_count INT NOT NULL DEFAULT 0,
  customer_type ENUM('Fleet','Wholesale','Distributor','All') NOT NULL DEFAULT 'All',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  valid_from TIMESTAMP NULL,
  valid_until TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_discounts_code (code),
  KEY idx_discounts_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 8. CMS
CREATE TABLE IF NOT EXISTS remquip_cms_pages (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NULL,
  meta_description VARCHAR(255) NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY uq_cms_slug (slug),
  KEY idx_cms_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CMS page copy per locale (canonical English stays in remquip_cms_pages; fr overlays when requested).
CREATE TABLE IF NOT EXISTS remquip_cms_page_translations (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  page_id CHAR(36) NOT NULL,
  locale VARCHAR(5) NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cms_page_locale (page_id, locale),
  KEY idx_cms_tr_page (page_id),
  CONSTRAINT fk_cms_tr_page FOREIGN KEY (page_id) REFERENCES remquip_cms_pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_banners (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url TEXT NOT NULL,
  link_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  KEY idx_banners_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Banner copy per locale (title/description; image_url shared).
CREATE TABLE IF NOT EXISTS remquip_banner_translations (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  banner_id CHAR(36) NOT NULL,
  locale VARCHAR(5) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_banner_locale (banner_id, locale),
  KEY idx_ban_tr_banner (banner_id),
  CONSTRAINT fk_ban_tr_banner FOREIGN KEY (banner_id) REFERENCES remquip_banners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 9. ANALYTICS & AUDIT
CREATE TABLE IF NOT EXISTS remquip_analytics (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  event_type VARCHAR(100) NOT NULL,
  customer_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  data JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_analytics_event (event_type),
  KEY idx_analytics_created (created_at),
  CONSTRAINT fk_analytics_customer FOREIGN KEY (customer_id) REFERENCES remquip_customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_analytics_user FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(50) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_user (user_id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 10. SETTINGS & FILES
CREATE TABLE IF NOT EXISTS remquip_settings (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  setting_key VARCHAR(255) NOT NULL,
  setting_value LONGTEXT NULL,
  data_type VARCHAR(50) NULL,
  description TEXT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remquip_file_uploads (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT NULL,
  mime_type VARCHAR(100) NULL,
  upload_type VARCHAR(50) NULL,
  user_id CHAR(36) NULL,
  related_entity_type VARCHAR(100) NULL,
  related_entity_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fu_type (upload_type),
  KEY idx_fu_user (user_id),
  CONSTRAINT fk_fu_user FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 11. OPTIONAL: admin directory (extend later)
CREATE TABLE IF NOT EXISTS remquip_admin_contacts (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  department VARCHAR(100) NULL,
  specialization VARCHAR(100) NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ac_dept (department),
  KEY idx_ac_spec (specialization)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact page map (Leaflet pin location; single row, edited in Admin CMS)
CREATE TABLE IF NOT EXISTS remquip_contact_map (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(11,7) NOT NULL,
  zoom INT NOT NULL DEFAULT 13,
  marker_title VARCHAR(255) NULL,
  address_line TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Landing page theme (CSS variables, fonts, sizes, custom CSS) — GET/PUT /landing-theme
CREATE TABLE IF NOT EXISTS remquip_landing_theme (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  theme JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SEED DATA (idempotent: safe to re-run on empty DB; use fresh DB for cleanest import)
-- Default passwords (bcrypt): plaintext "password" for both seeded users (min 8 chars).
--   Admin:  admin@remquip.local  / password
--   Portal: user@remquip.local  / password  (customer row uses same email → B2B orders tab)
-- =============================================================================

SET @pwd := '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- Users
INSERT IGNORE INTO remquip_users (id, email, password_hash, full_name, role, status, phone) VALUES
('10000000-0000-4000-8000-000000000001', 'admin@remquip.local', @pwd, 'REMQUIP Administrator', 'admin', 'active', ''),
('20000000-0000-4000-8000-000000000002', 'user@remquip.local', @pwd, 'Demo Fleet Customer', 'user', 'active', '+1-555-0100');

-- Admin UI pages (Access Control matrix + GET /admin/permissions)
INSERT IGNORE INTO remquip_pages (id, name, slug, description, icon, display_order) VALUES
('p0000001-0000-4000-8000-000000000001', 'Dashboard', 'dashboard', 'Main dashboard overview', 'LayoutDashboard', 1),
('p0000001-0000-4000-8000-000000000002', 'Products', 'products', 'Manage product catalog', 'Package', 2),
('p0000001-0000-4000-8000-000000000003', 'Inventory', 'inventory', 'Stock management', 'Package2', 3),
('p0000001-0000-4000-8000-000000000004', 'Orders', 'orders', 'Order management', 'ShoppingCart', 4),
('p0000001-0000-4000-8000-000000000005', 'Customers', 'customers', 'Customer management', 'Users', 5),
('p0000001-0000-4000-8000-000000000006', 'Discounts', 'discounts', 'Discount management', 'Tag', 6),
('p0000001-0000-4000-8000-000000000007', 'Users', 'users', 'User management', 'UsersCog', 7),
('p0000001-0000-4000-8000-000000000008', 'Access Control', 'access-control', 'Access permissions', 'Lock', 8),
('p0000001-0000-4000-8000-000000000009', 'CMS', 'cms', 'Content management', 'FileText', 9),
('p0000001-0000-4000-8000-00000000000a', 'Analytics', 'analytics', 'Analytics dashboard', 'BarChart3', 10),
('p0000001-0000-4000-8000-00000000000b', 'Settings', 'settings', 'System settings', 'Settings', 11),
('p0000001-0000-4000-8000-00000000000c', 'Logs', 'logs', 'System logs', 'Activity', 12);

-- Full admin access for seeded admin user
INSERT IGNORE INTO remquip_user_page_access (user_id, page_id, can_view, can_edit, can_delete)
SELECT '10000000-0000-4000-8000-000000000001', id, 1, 1, 1 FROM remquip_pages WHERE id LIKE 'p0000001-%';

-- Categories (slugs align with src/config/products.ts fallbacks)
INSERT IGNORE INTO remquip_categories (id, name, slug, description, is_active, display_order) VALUES
('e4000001-0000-4000-8000-000000000001', 'Air Suspension', 'air-suspension', 'Air springs, bellows, and suspension components', 1, 1),
('e4000002-0000-4000-8000-000000000002', 'Brake Shoes & Pads', 'brake-shoes-pads', 'Brake shoes, pads, and hardware', 1, 2),
('e4000003-0000-4000-8000-000000000003', 'Brake Chambers', 'brake-chambers', 'Spring and service brake chambers', 1, 3),
('e4000004-0000-4000-8000-000000000004', 'Brake Drums', 'brake-drums', 'Heavy-duty brake drums', 1, 4);

INSERT IGNORE INTO remquip_category_translations (id, category_id, locale, name, description) VALUES
('ec000001-0000-4000-8000-000000000001', 'e4000001-0000-4000-8000-000000000001', 'en', 'Air Suspension', 'Air springs, bellows, and suspension components'),
('ec000001-0000-4000-8000-000000000002', 'e4000002-0000-4000-8000-000000000002', 'en', 'Brake Shoes & Pads', 'Brake shoes, pads, and hardware'),
('ec000001-0000-4000-8000-000000000003', 'e4000003-0000-4000-8000-000000000003', 'en', 'Brake Chambers', 'Spring and service brake chambers'),
('ec000001-0000-4000-8000-000000000004', 'e4000004-0000-4000-8000-000000000004', 'en', 'Brake Drums', 'Heavy-duty brake drums'),
('ec000002-0000-4000-8000-000000000005', 'e4000001-0000-4000-8000-000000000001', 'fr', 'Suspension pneumatique', 'Ressorts pneumatiques, soufflets et composants de suspension'),
('ec000002-0000-4000-8000-000000000006', 'e4000002-0000-4000-8000-000000000002', 'fr', 'Garnitures et plaquettes de frein', 'Garnitures, plaquettes et quincaillerie de freinage'),
('ec000002-0000-4000-8000-000000000007', 'e4000003-0000-4000-8000-000000000003', 'fr', 'Chambres de frein', 'Chambres à ressort et de service'),
('ec000002-0000-4000-8000-000000000008', 'e4000004-0000-4000-8000-000000000004', 'fr', 'Tambours de frein', 'Tambours de frein pour charges lourdes');

-- Products + primary images (featured / catalog API)
INSERT IGNORE INTO remquip_products (id, category_id, sku, name, description, base_price, cost_price, is_active) VALUES
('50000001-0000-4000-8000-000000000001', 'e4000001-0000-4000-8000-000000000001', '1T15ZR-6', 'Air Spring W01-358 9781', 'Premium air spring for heavy-duty truck and trailer suspension. OEM-style replacement.', 89.99, 55.00, 1),
('50000001-0000-4000-8000-000000000002', 'e4000002-0000-4000-8000-000000000002', 'RMQ-BP-4707', 'Heavy Duty Brake Pad Set 4707', 'Fleet-grade brake pad set for drum applications.', 124.50, 78.00, 1),
('50000001-0000-4000-8000-000000000003', 'e4000003-0000-4000-8000-000000000003', 'RMQ-T30-30', 'Type 30/30 Brake Chamber', 'Standard spring brake chamber assembly.', 67.25, 40.00, 1),
('50000001-0000-4000-8000-000000000004', 'e4000004-0000-4000-8000-000000000004', 'RMQ-DRUM-16.5', 'Brake Drum 16.5" Balanced', 'Machined and balanced brake drum.', 210.00, 130.00, 1);

INSERT IGNORE INTO remquip_product_images (id, product_id, image_url, alt_text, is_primary, display_order) VALUES
('60000001-0000-4000-8000-000000000001', '50000001-0000-4000-8000-000000000001', '/Backend/uploads/images/placeholder-product.svg', 'Air Spring W01-358 9781', 1, 0),
('60000001-0000-4000-8000-000000000002', '50000001-0000-4000-8000-000000000002', '/Backend/uploads/images/placeholder-product.svg', 'Brake Pad Set', 1, 0),
('60000001-0000-4000-8000-000000000003', '50000001-0000-4000-8000-000000000003', '/Backend/uploads/images/placeholder-product.svg', 'Brake Chamber', 1, 0),
('60000001-0000-4000-8000-000000000004', '50000001-0000-4000-8000-000000000004', '/Backend/uploads/images/placeholder-product.svg', 'Brake Drum', 1, 0);

-- Inventory (one low-stock row for admin dashboard widget)
INSERT IGNORE INTO remquip_inventory (id, product_id, quantity_on_hand, quantity_reserved, reorder_level, reorder_quantity, warehouse_location) VALUES
('70000001-0000-4000-8000-000000000001', '50000001-0000-4000-8000-000000000001', 145, 0, 25, 50, 'A-01'),
('70000001-0000-4000-8000-000000000002', '50000001-0000-4000-8000-000000000002', 88, 5, 20, 40, 'A-02'),
('70000001-0000-4000-8000-000000000003', '50000001-0000-4000-8000-000000000003', 8, 0, 15, 30, 'B-01'),
('70000001-0000-4000-8000-000000000004', '50000001-0000-4000-8000-000000000004', 42, 0, 10, 25, 'B-02');

-- B2B customer (email matches portal user → /user/dashboard/orders)
INSERT IGNORE INTO remquip_customers (id, company_name, contact_person, email, phone, customer_type, status, address, city, province, postal_code, country) VALUES
('30000000-0000-4000-8000-000000000003', 'Demo Fleet Logistics Inc.', 'Demo Fleet Customer', 'user@remquip.local', '+1-555-0100', 'Fleet', 'active', '100 Industrial Pkwy', 'Toronto', 'ON', 'M5H 2N2', 'Canada');

-- Sample order (optional demo data for admin Orders UI)
INSERT IGNORE INTO remquip_orders (id, customer_id, order_number, status, subtotal, tax, shipping, discount, total, payment_status, shipping_address, notes) VALUES
('80000001-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'RMQ-SEED-000001', 'processing', 214.75, 32.10, 25.00, 0, 271.85, 'paid', '{"company":"Demo Fleet Logistics Inc.","address_line1":"100 Industrial Pkwy","city":"Toronto","state":"ON","postal_code":"M5H 2N2","country":"Canada"}', 'Seed order for QA');

INSERT IGNORE INTO remquip_order_items (id, order_id, product_id, quantity, unit_price, line_total) VALUES
('80000002-0000-4000-8000-000000000001', '80000001-0000-4000-8000-000000000001', '50000001-0000-4000-8000-000000000001', 1, 89.99, 89.99),
('80000002-0000-4000-8000-000000000002', '80000001-0000-4000-8000-000000000001', '50000001-0000-4000-8000-000000000002', 1, 124.50, 124.50);

-- Discounts (validate route uppercases code → use WELCOME10)
INSERT IGNORE INTO remquip_discounts (id, code, name, description, discount_type, discount_value, min_order_value, max_uses, uses_count, customer_type, is_active, valid_from, valid_until) VALUES
('90000001-0000-4000-8000-000000000001', 'WELCOME10', 'Welcome 10%', '10% off first qualifying order', 'percentage', 10.00, 50.00, 1000, 0, 'All', 1, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 365 DAY)),
('90000001-0000-4000-8000-000000000002', 'SAVE5', 'Save $5', 'Fixed amount off', 'fixed_amount', 5.00, 25.00, NULL, 0, 'All', 1, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 180 DAY));

-- CMS: published home page with full landing sections (editable from Admin Landing)
INSERT IGNORE INTO remquip_cms_pages (id, slug, title, excerpt, content, is_published, published_at) VALUES
('b1000001-0000-4000-8000-000000000001', 'home', 'Homepage',
 'REMQUIP — heavy-duty truck and trailer parts.',
 '{"sections":{"hero":{"title":"Industrial-Grade Parts For North American Fleets","description":"500+ SKUs in stock. 48-hour delivery. Trusted by fleet operators across North America for 15+ years.","image_url":"","content":"{\\"cta_primary_label\\":\\"Browse Catalog\\",\\"cta_primary_link\\":\\"/products\\",\\"cta_secondary_label\\":\\"Wholesale Program\\",\\"cta_secondary_link\\":\\"/register\\"}"},"stats":{"title":"","description":"","image_url":"","content":"[{\\"value\\":\\"500+\\",\\"label\\":\\"SKUs in Stock\\"},{\\"value\\":\\"48h\\",\\"label\\":\\"Avg. Delivery\\"},{\\"value\\":\\"15+\\",\\"label\\":\\"Years Experience\\"}]"},"value_props":{"title":"","description":"","image_url":"","content":"[{\\"icon\\":\\"Shield\\",\\"text\\":\\"Certified & Tested\\"},{\\"icon\\":\\"Truck\\",\\"text\\":\\"Fast Delivery\\"},{\\"icon\\":\\"Wrench\\",\\"text\\":\\"Expert Support\\"},{\\"icon\\":\\"CheckCircle\\",\\"text\\":\\"In Stock\\"}]"},"categories_intro":{"title":"Browse Solutions","description":"Explore Product Categories","image_url":"","content":""},"featured_intro":{"title":"In High Demand","description":"Popular Products","image_url":"","content":""},"why_remquip":{"title":"Why Choose REMQUIP","description":"Built for Fleet Operations","image_url":"","content":"{\\"subtitle\\":\\"We specialize in quality parts, competitive pricing, and customer service that keeps your fleet running smoothly.\\",\\"cards\\":[{\\"icon\\":\\"Package\\",\\"title\\":\\"Extensive Inventory\\",\\"desc\\":\\"500+ SKUs ready to ship. Most items in stock for immediate delivery to fleets across North America.\\"},{\\"icon\\":\\"Users\\",\\"title\\":\\"Dedicated Support\\",\\"desc\\":\\"Expert team standing by. Get technical guidance, bulk quotes, and personalized service for your fleet needs.\\"},{\\"icon\\":\\"BarChart3\\",\\"title\\":\\"Proven Track Record\\",\\"desc\\":\\"15+ years serving trucking operations. Trusted by fleet managers for reliability and competitive pricing.\\"}]}"},"wholesale_cta":{"title":"Fleet Solutions","description":"Wholesale Programs for Fleet Operators","image_url":"","content":"{\\"body\\":\\"Get competitive bulk pricing, dedicated account support, and streamlined ordering for your fleet operation.\\",\\"cta_primary_label\\":\\"Join Wholesale\\",\\"cta_primary_link\\":\\"/register\\",\\"cta_secondary_label\\":\\"Contact Sales\\",\\"cta_secondary_link\\":\\"/contact\\"}"}}}',
 1, NOW());

INSERT IGNORE INTO remquip_cms_page_translations (id, page_id, locale, title, excerpt, content) VALUES
('b1000002-0000-4000-8000-000000000010', 'b1000001-0000-4000-8000-000000000001', 'fr', 'Accueil', 'REMQUIP — pièces pour poids lourds et remorques.',
 '{"sections":{"hero":{"title":"Pièces de qualité industrielle pour les flottes nord-américaines","description":"500+ références en stock. Livraison sous 48h. Fait confiance par les exploitants de flottes en Amérique du Nord depuis plus de 15 ans.","image_url":"","content":"{\\"cta_primary_label\\":\\"Parcourir le catalogue\\",\\"cta_primary_link\\":\\"/products\\",\\"cta_secondary_label\\":\\"Programme de gros\\",\\"cta_secondary_link\\":\\"/register\\"}"},"stats":{"title":"","description":"","image_url":"","content":"[{\\"value\\":\\"500+\\",\\"label\\":\\"Réf. en stock\\"},{\\"value\\":\\"48h\\",\\"label\\":\\"Livraison moy.\\"},{\\"value\\":\\"15+\\",\\"label\\":\\"Ans d''expérience\\"}]"},"value_props":{"title":"","description":"","image_url":"","content":"[{\\"icon\\":\\"Shield\\",\\"text\\":\\"Certifié et testé\\"},{\\"icon\\":\\"Truck\\",\\"text\\":\\"Livraison rapide\\"},{\\"icon\\":\\"Wrench\\",\\"text\\":\\"Support expert\\"},{\\"icon\\":\\"CheckCircle\\",\\"text\\":\\"En stock\\"}]"},"categories_intro":{"title":"Parcourir les solutions","description":"Explorer les catégories de produits","image_url":"","content":""},"featured_intro":{"title":"Très demandés","description":"Produits populaires","image_url":"","content":""},"why_remquip":{"title":"Pourquoi REMQUIP","description":"Conçu pour les opérations de flotte","image_url":"","content":"{\\"subtitle\\":\\"Nous sommes spécialisés dans les pièces de qualité, des prix compétitifs et un service client qui maintient votre flotte en bon état.\\",\\"cards\\":[{\\"icon\\":\\"Package\\",\\"title\\":\\"Inventaire étendu\\",\\"desc\\":\\"500+ références prêtes à expédier. La plupart en stock pour livraison immédiate aux flottes en Amérique du Nord.\\"},{\\"icon\\":\\"Users\\",\\"title\\":\\"Support dédié\\",\\"desc\\":\\"Équipe d''experts à votre disposition. Conseils techniques, devis en volume et service personnalisé.\\"},{\\"icon\\":\\"BarChart3\\",\\"title\\":\\"Réputation établie\\",\\"desc\\":\\"Plus de 15 ans au service des exploitants de flottes. Une fiabilité et des prix compétitifs reconnus.\\"}]}"},"wholesale_cta":{"title":"Solutions pour flottes","description":"Programmes de gros pour exploitants de flottes","image_url":"","content":"{\\"body\\":\\"Tarifs de gros compétitifs, support dédié et commandes simplifiées pour votre flotte.\\",\\"cta_primary_label\\":\\"Rejoindre le programme\\",\\"cta_primary_link\\":\\"/register\\",\\"cta_secondary_label\\":\\"Contacter les ventes\\",\\"cta_secondary_link\\":\\"/contact\\"}"}}}');

-- Homepage banner (GET /cms/banners)
INSERT IGNORE INTO remquip_banners (id, title, description, image_url, link_url, is_active, display_order) VALUES
('b2000001-0000-4000-8000-000000000001', 'Fleet pricing available', 'Ask about volume programs', '/Backend/uploads/images/placeholder-banner.svg', '/products', 1, 0);

INSERT IGNORE INTO remquip_banner_translations (id, banner_id, locale, title, description) VALUES
('b2000002-0000-4000-8000-000000000001', 'b2000001-0000-4000-8000-000000000001', 'fr', 'Tarifs flotte disponibles', 'Renseignez-vous sur les programmes volume');

-- User dashboard “Contact us” directory
INSERT IGNORE INTO remquip_admin_contacts (id, name, email, phone, department, specialization, is_available, display_order) VALUES
('ac000001-0000-4000-8000-000000000001', 'Alex Morgan', 'parts@remquip.local', '+1-555-0101', 'Parts', 'Brakes & suspension', 1, 1),
('ac000001-0000-4000-8000-000000000002', 'Jordan Lee', 'fleet@remquip.local', '+1-555-0102', 'Fleet Sales', 'Volume pricing', 1, 2);

-- App settings (GET /settings/public + admin PATCH /settings)
INSERT IGNORE INTO remquip_settings (id, setting_key, setting_value, data_type, description, is_public) VALUES
('s0000001-0000-4000-8000-000000000001', 'site_name', 'REMQUIP Nexus', 'string', 'Application title', 1),
('s0000001-0000-4000-8000-000000000002', 'default_currency', 'CAD', 'string', 'Default currency code', 1),
('s0000001-0000-4000-8000-000000000003', 'store_name', 'REMQUIP', 'string', 'Store display name', 1),
('s0000001-0000-4000-8000-000000000004', 'contact_email', 'info@remquip.ca', 'string', 'Public contact email', 1),
('s0000001-0000-4000-8000-000000000005', 'contact_phone', '+1 (418) 555-0199', 'string', 'Public phone', 1),
('s0000001-0000-4000-8000-000000000006', 'store_address', '1234 Boulevard Industriel, Québec, QC G1K 7P4', 'string', 'Store address', 1),
('s0000001-0000-4000-8000-000000000007', 'default_language', 'en', 'string', 'Default language code', 1),
('s0000001-0000-4000-8000-000000000008', 'tax_gst_rate', '5.0', 'string', 'GST %', 0),
('s0000001-0000-4000-8000-000000000009', 'tax_qst_rate', '9.975', 'string', 'QST %', 0),
('s0000001-0000-4000-8000-00000000000a', 'free_shipping_threshold', '500', 'string', 'Free shipping min CAD', 0),
('s0000001-0000-4000-8000-00000000000b', 'flat_shipping_rate', '25', 'string', 'Flat shipping CAD', 0),
('s0000001-0000-4000-8000-00000000000c', 'notif_new_order', '1', 'string', 'Email: new order', 0),
('s0000001-0000-4000-8000-00000000000d', 'notif_order_shipped', '1', 'string', 'Email: shipped', 0),
('s0000001-0000-4000-8000-00000000000e', 'notif_low_stock', '1', 'string', 'Email: low stock', 0),
('s0000001-0000-4000-8000-00000000000f', 'notif_new_customer', '0', 'string', 'Email: new customer', 0),
('s0000001-0000-4000-8000-000000000010', 'notif_weekly_summary', '0', 'string', 'Email: weekly summary', 0),
('s0000001-0000-4000-8000-000000000011', 'portal_email_notifications_default', '1', 'string', 'Default for user dashboard email toggle', 0),
('s0000001-0000-4000-8000-000000000012', 'notif_recipient_email', '', 'string', 'Admin notification inbox; empty uses contact_email', 0),
('s0000001-0000-4000-8000-000000000013', 'notif_from_email', '', 'string', 'From: for outbound mail; empty uses contact_email', 0),
('s0000001-0000-4000-8000-000000000014', 'supported_locales', '["en","fr"]', 'json', 'Enabled languages for CMS, categories, banners. Add codes like es, de for future languages.', 1),
('s0000001-0000-4000-8000-000000000015', 'notif_order_status', '1', 'string', 'Email: order status update (non-shipped)', 0);

-- Contact page map (GET /contact-map, PUT admin)
INSERT IGNORE INTO remquip_contact_map (id, latitude, longitude, zoom, marker_title, address_line) VALUES
('a0000000-0000-4000-8000-000000000001', 45.5017000, -73.5673000, 13, 'REMQUIP', '1000 Rue de la Gauchetière O, Montréal, QC H3B 4W5, Canada');

INSERT IGNORE INTO remquip_landing_theme (id, theme) VALUES (
  'lt000000-0000-4000-8000-000000000001',
  '{"css_variables":{},"font_heading_stack":"","font_body_stack":"","google_fonts_url":null,"font_sizes":{},"custom_css":null}'
);

-- Contact page copy (GET /cms/pages/contact/content?locale=) — EN canonical + FR translation
INSERT IGNORE INTO remquip_cms_pages (id, slug, title, excerpt, content, is_published, published_at) VALUES
(
  'b1000003-0000-4000-8000-000000000001',
  'contact',
  'Contact',
  'Contact page',
  '{"sections":{"intro":{"title":"Get in touch","description":"Contact Us","image_url":"","content":"Have questions about our products or wholesale programs? Reach out and we will respond within 24 hours."},"form_labels":{"title":"","description":"","image_url":"","content":"{\"name\":\"Your Name\",\"email\":\"Email Address\",\"subject\":\"Subject\",\"message\":\"Message\",\"send\":\"Send Message\"}"},"sidebar":{"title":"","description":"","image_url":"","content":"{\"address_label\":\"Address\",\"phone_label\":\"Phone\",\"phone\":\"+1 (418) 555-0199\",\"email_label\":\"Email\",\"email\":\"info@remquip.ca\",\"hours_label\":\"Hours\",\"hours\":\"Mon - Fri: 8:00 AM - 5:00 PM EST\"}"},"map":{"title":"Find us","description":"Pin and address are set in Admin - CMS (Contact map).","image_url":"","content":""}}}',
  1,
  NOW()
);

INSERT IGNORE INTO remquip_cms_page_translations (id, page_id, locale, title, excerpt, content) VALUES
(
  'b1000004-0000-4000-8000-000000000001',
  'b1000003-0000-4000-8000-000000000001',
  'fr',
  'Contact',
  'Page contact',
  '{"sections":{"intro":{"title":"Écrivez-nous","description":"Nous contacter","image_url":"","content":"Des questions sur nos produits ou nos programmes de gros? Écrivez-nous; nous répondons sous 24 h."},"form_labels":{"title":"","description":"","image_url":"","content":"{\"name\":\"Votre Nom\",\"email\":\"Adresse Courriel\",\"subject\":\"Sujet\",\"message\":\"Message\",\"send\":\"Envoyer le message\"}"},"sidebar":{"title":"","description":"","image_url":"","content":"{\"address_label\":\"Adresse\",\"phone_label\":\"Téléphone\",\"phone\":\"+1 (418) 555-0199\",\"email_label\":\"Courriel\",\"email\":\"info@remquip.ca\",\"hours_label\":\"Heures\",\"hours\":\"Lun - Ven: 8h00 - 17h00 HNE\"}"},"map":{"title":"Nous trouver","description":"La position et l''adresse se configurent dans Admin - CMS (carte Contact).","image_url":"","content":""}}}'
);

-- =============================================================================
-- END
-- =============================================================================
