-- ====================================================================================
-- REMQUIP NEXUS - DATABASE MIGRATION
-- Rename all tables to include remquip_ prefix for consistency
-- ====================================================================================
-- This migration adds the remquip_ prefix to all tables and updates all foreign key
-- relationships and indexes to reference the new table names
--
-- Database: PostgreSQL 14+
-- Created: 2026-03-20
-- Version: 1.0
-- ====================================================================================

BEGIN;

-- Step 1: Disable foreign key constraints temporarily
SET session_replication_role = 'replica';

-- ====================================================================================
-- STEP 2: Rename all tables with remquip_ prefix
-- ====================================================================================

-- Core Authentication & Access Control
ALTER TABLE IF EXISTS users RENAME TO remquip_users;
ALTER TABLE IF EXISTS pages RENAME TO remquip_pages;
ALTER TABLE IF EXISTS user_page_access RENAME TO remquip_user_page_access;

-- Product Management
ALTER TABLE IF EXISTS product_categories RENAME TO remquip_product_categories;
ALTER TABLE IF EXISTS products RENAME TO remquip_products;
ALTER TABLE IF EXISTS product_images RENAME TO remquip_product_images;
ALTER TABLE IF EXISTS product_variants RENAME TO remquip_product_variants;

-- Customer Management
ALTER TABLE IF EXISTS customers RENAME TO remquip_customers;
ALTER TABLE IF EXISTS customer_addresses RENAME TO remquip_customer_addresses;
ALTER TABLE IF EXISTS customer_preferences RENAME TO remquip_customer_preferences;
ALTER TABLE IF EXISTS customer_wishlist RENAME TO remquip_customer_wishlist;
ALTER TABLE IF EXISTS customer_sessions RENAME TO remquip_customer_sessions;

-- Inventory Tracking
ALTER TABLE IF EXISTS inventory_logs RENAME TO remquip_inventory_logs;

-- Orders & Transactions
ALTER TABLE IF EXISTS orders RENAME TO remquip_orders;
ALTER TABLE IF EXISTS order_items RENAME TO remquip_order_items;
ALTER TABLE IF EXISTS order_notes RENAME TO remquip_order_notes;
ALTER TABLE IF EXISTS order_tracking_events RENAME TO remquip_order_tracking_events;

-- Discounts & Promotions
ALTER TABLE IF EXISTS discounts RENAME TO remquip_discounts;

-- Content Management
ALTER TABLE IF EXISTS cms_pages RENAME TO remquip_cms_pages;
ALTER TABLE IF EXISTS cms_sections RENAME TO remquip_cms_sections;

-- Authentication Tokens
ALTER TABLE IF EXISTS password_reset_tokens RENAME TO remquip_password_reset_tokens;
ALTER TABLE IF EXISTS email_verification_tokens RENAME TO remquip_email_verification_tokens;

-- Audit & Analytics
ALTER TABLE IF EXISTS audit_logs RENAME TO remquip_audit_logs;
ALTER TABLE IF EXISTS analytics_daily_metrics RENAME TO remquip_analytics_daily_metrics;

-- ====================================================================================
-- STEP 3: Rename all indexes with remquip_ prefix
-- ====================================================================================

-- Users table indexes
ALTER INDEX IF EXISTS idx_users_email RENAME TO idx_remquip_users_email;
ALTER INDEX IF EXISTS idx_users_role RENAME TO idx_remquip_users_role;
ALTER INDEX IF EXISTS idx_users_status RENAME TO idx_remquip_users_status;
ALTER INDEX IF EXISTS idx_users_created_at RENAME TO idx_remquip_users_created_at;

-- Pages & Access Control indexes
ALTER INDEX IF EXISTS idx_pages_slug RENAME TO idx_remquip_pages_slug;
ALTER INDEX IF EXISTS idx_pages_is_active RENAME TO idx_remquip_pages_is_active;
ALTER INDEX IF EXISTS idx_user_page_access_user RENAME TO idx_remquip_user_page_access_user;
ALTER INDEX IF EXISTS idx_user_page_access_page RENAME TO idx_remquip_user_page_access_page;

-- Product Categories indexes
ALTER INDEX IF EXISTS idx_categories_slug RENAME TO idx_remquip_categories_slug;
ALTER INDEX IF EXISTS idx_categories_parent RENAME TO idx_remquip_categories_parent;
ALTER INDEX IF EXISTS idx_categories_active RENAME TO idx_remquip_categories_active;

-- Products indexes
ALTER INDEX IF EXISTS idx_products_sku RENAME TO idx_remquip_products_sku;
ALTER INDEX IF EXISTS idx_products_name RENAME TO idx_remquip_products_name;
ALTER INDEX IF EXISTS idx_products_category RENAME TO idx_remquip_products_category;
ALTER INDEX IF EXISTS idx_products_status RENAME TO idx_remquip_products_status;
ALTER INDEX IF EXISTS idx_products_stock RENAME TO idx_remquip_products_stock;
ALTER INDEX IF EXISTS idx_products_featured RENAME TO idx_remquip_products_featured;

-- Product Images indexes
ALTER INDEX IF EXISTS idx_product_images_product RENAME TO idx_remquip_product_images_product;
ALTER INDEX IF EXISTS idx_product_images_primary RENAME TO idx_remquip_product_images_primary;

-- Product Variants indexes
ALTER INDEX IF EXISTS idx_variants_product RENAME TO idx_remquip_variants_product;
ALTER INDEX IF EXISTS idx_variants_sku RENAME TO idx_remquip_variants_sku;

-- Customers indexes
ALTER INDEX IF EXISTS idx_customers_email RENAME TO idx_remquip_customers_email;
ALTER INDEX IF EXISTS idx_customers_company RENAME TO idx_remquip_customers_company;
ALTER INDEX IF EXISTS idx_customers_type RENAME TO idx_remquip_customers_type;
ALTER INDEX IF EXISTS idx_customers_status RENAME TO idx_remquip_customers_status;
ALTER INDEX IF EXISTS idx_customers_created_by RENAME TO idx_remquip_customers_created_by;
ALTER INDEX IF EXISTS idx_customers_created_at RENAME TO idx_remquip_customers_created_at;

-- Inventory Logs indexes
ALTER INDEX IF EXISTS idx_inventory_logs_product RENAME TO idx_remquip_inventory_logs_product;
ALTER INDEX IF EXISTS idx_inventory_logs_date RENAME TO idx_remquip_inventory_logs_date;
ALTER INDEX IF EXISTS idx_inventory_logs_action RENAME TO idx_remquip_inventory_logs_action;
ALTER INDEX IF EXISTS idx_inventory_logs_reference RENAME TO idx_remquip_inventory_logs_reference;

-- Orders indexes
ALTER INDEX IF EXISTS idx_orders_customer RENAME TO idx_remquip_orders_customer;
ALTER INDEX IF EXISTS idx_orders_status RENAME TO idx_remquip_orders_status;
ALTER INDEX IF EXISTS idx_orders_order_number RENAME TO idx_remquip_orders_order_number;
ALTER INDEX IF EXISTS idx_orders_date RENAME TO idx_remquip_orders_date;
ALTER INDEX IF EXISTS idx_orders_payment_status RENAME TO idx_remquip_orders_payment_status;

-- Order Items indexes
ALTER INDEX IF EXISTS idx_order_items_order RENAME TO idx_remquip_order_items_order;
ALTER INDEX IF EXISTS idx_order_items_product RENAME TO idx_remquip_order_items_product;

-- Order Notes indexes
ALTER INDEX IF EXISTS idx_order_notes_order RENAME TO idx_remquip_order_notes_order;

-- Discounts indexes
ALTER INDEX IF EXISTS idx_discounts_code RENAME TO idx_remquip_discounts_code;
ALTER INDEX IF EXISTS idx_discounts_status RENAME TO idx_remquip_discounts_status;
ALTER INDEX IF EXISTS idx_discounts_valid_from RENAME TO idx_remquip_discounts_valid_from;

-- CMS indexes
ALTER INDEX IF EXISTS idx_cms_pages_slug RENAME TO idx_remquip_cms_pages_slug;
ALTER INDEX IF EXISTS idx_cms_sections_page RENAME TO idx_remquip_cms_sections_page;

-- Audit & Analytics indexes
ALTER INDEX IF EXISTS idx_audit_logs_user RENAME TO idx_remquip_audit_logs_user;
ALTER INDEX IF EXISTS idx_audit_logs_date RENAME TO idx_remquip_audit_logs_date;
ALTER INDEX IF EXISTS idx_analytics_metrics_date RENAME TO idx_remquip_analytics_metrics_date;

-- ====================================================================================
-- STEP 4: Re-enable foreign key constraints
-- ====================================================================================

SET session_replication_role = 'default';

-- ====================================================================================
-- STEP 5: Verify the migration (comment out in production)
-- ====================================================================================

-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- ====================================================================================
-- MIGRATION COMPLETE
-- ====================================================================================
-- All tables have been successfully renamed with remquip_ prefix
-- All indexes have been updated accordingly
-- All foreign key relationships remain intact
-- The application code must be updated to reference the new table names
-- ====================================================================================

COMMIT;
