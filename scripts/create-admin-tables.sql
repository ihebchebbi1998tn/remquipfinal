-- ============================================================
-- REMQUIP Admin & Permissions Tables
-- Database Migration: Add missing admin tables
-- ============================================================

-- ============================================================
-- 1. Admin Permissions Table
-- Stores granular permissions for each admin user
-- ============================================================
CREATE TABLE IF NOT EXISTS remquip_admin_permissions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
  -- Dashboard Permissions
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
  can_delete_data BOOLEAN DEFAULT false,
  can_edit_settings BOOLEAN DEFAULT false,
  
  -- Metadata
  granted_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES remquip_users(id),
  UNIQUE KEY unique_user_permissions (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Audit Logs Table
-- Tracks all admin actions for security & compliance
-- ============================================================
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
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  
  KEY idx_user_id (user_id),
  KEY idx_action (action),
  KEY idx_resource (resource_type, resource_id),
  KEY idx_created_at (created_at),
  KEY idx_user_action (user_id, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. User Settings Table
-- Stores individual user preferences & settings
-- ============================================================
CREATE TABLE IF NOT EXISTS remquip_user_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  order_notifications BOOLEAN DEFAULT true,
  promotional_emails BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  
  -- Display Preferences
  theme VARCHAR(20) DEFAULT 'light',
  locale VARCHAR(10) DEFAULT 'en-CA',
  timezone VARCHAR(50),
  items_per_page INT DEFAULT 25,
  
  -- Privacy
  show_profile_public BOOLEAN DEFAULT false,
  newsletter_subscribed BOOLEAN DEFAULT false,
  
  -- Other Preferences
  default_currency VARCHAR(3) DEFAULT 'CAD',
  two_factor_enabled BOOLEAN DEFAULT false,
  session_timeout_minutes INT DEFAULT 30,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Admin Roles Table (Optional - for custom roles in future)
-- ============================================================
CREATE TABLE IF NOT EXISTS remquip_admin_roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  
  -- Permissions as JSON for flexibility
  permissions_json JSON,
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES remquip_users(id),
  
  KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. User Sessions Table (for tracking active sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS remquip_user_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  
  -- Session Details
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Session Validity
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES remquip_users(id) ON DELETE CASCADE,
  
  KEY idx_user_id (user_id),
  KEY idx_is_active (is_active),
  KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Update existing remquip_users table with additional fields
-- ============================================================

-- Add missing security fields to remquip_users (if not exists)
ALTER TABLE remquip_users 
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45),
  ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sso_id VARCHAR(255);

-- ============================================================
-- Create Indexes for Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_user_created 
  ON remquip_audit_logs(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_resource 
  ON remquip_audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
  ON remquip_user_sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_settings_user 
  ON remquip_user_settings(user_id);

-- ============================================================
-- Sample Data: Create default role permissions for super_admin
-- ============================================================

-- This SQL is for reference only - execute separately or via script
-- INSERT INTO remquip_admin_permissions (
--   id, user_id, 
--   can_view_dashboard, can_manage_products, can_manage_orders,
--   can_manage_customers, can_manage_inventory, can_manage_discounts,
--   can_manage_users, can_view_analytics, can_manage_cms,
--   can_view_audit_logs, can_delete_data, can_edit_settings,
--   created_at
-- ) VALUES (
--   UUID(), '(admin_user_id)',
--   1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
--   NOW()
-- );

-- ============================================================
-- Migration Status
-- ============================================================
-- Created tables:
-- ✓ remquip_admin_permissions
-- ✓ remquip_audit_logs
-- ✓ remquip_user_settings
-- ✓ remquip_admin_roles
-- ✓ remquip_user_sessions
--
-- Updated tables:
-- ✓ remquip_users (added security fields)
--
-- This completes the missing database schema for:
-- - Admin role & permission management
-- - Audit logging
-- - User preferences
-- - Session management
-- ============================================================
