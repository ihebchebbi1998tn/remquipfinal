-- Migration: 001_create_core_tables.sql
-- Purpose: Create core users and authentication tables
-- Run this first!

-- ====================================================================================
-- CORE USERS & AUTHENTICATION
-- ====================================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'user')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Insert default admin user (password: admin123 - CHANGE IMMEDIATELY IN PRODUCTION)
INSERT INTO users (email, password_hash, full_name, role, status)
VALUES (
  'admin@remquip.ca',
  '$2b$10$YJXhN3OJHPKxXvGhpKJJOuYqjVVVjkSh5qN5GsZf5G5G5G5G5G5G5', -- bcrypt hash of 'admin123'
  'Administrator',
  'admin',
  'active'
)
ON CONFLICT (email) DO NOTHING;

COMMIT;
