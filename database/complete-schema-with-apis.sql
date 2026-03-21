-- ====================================================================================
-- REMQUIP NEXUS - COMPLETE DATABASE SCHEMA WITH API INTEGRATION GUIDE
-- ====================================================================================
-- This file contains the complete database schema for the Remquip Nexus admin system
-- with detailed API endpoint documentation for each table.
--
-- Database: PostgreSQL 14+
-- Created: 2026-03-18
-- Version: 1.0
-- ====================================================================================


-- ====================================================================================
-- 1. CORE USERS & AUTHENTICATION
-- ====================================================================================
-- Stores all admin users with roles and authentication details
--
-- API ENDPOINTS NEEDED:
--   POST   /api/users                  - Create new user
--   GET    /api/users                  - List all users (with pagination, filtering, sorting)
--   GET    /api/users/:id              - Get single user details
--   PATCH  /api/users/:id              - Update user (email, full_name, role, status, phone)
--   DELETE /api/users/:id              - Delete user (soft delete recommended)
--   PATCH  /api/users/:id/password     - Change password (hash with bcrypt)
--   PATCH  /api/users/:id/role         - Update user role (admin only)
--   PATCH  /api/users/:id/status       - Update user status (active/inactive/suspended)
--   POST   /api/auth/login             - Login user (returns JWT token)
--   POST   /api/auth/logout            - Logout user (invalidate token)
--   GET    /api/users/me               - Get current logged-in user
--   PUT    /api/users/:id/avatar       - Upload/update user avatar
--
-- AUTHENTICATION:
--   - All endpoints require Bearer token (except /login)
--   - Password must be hashed with bcrypt (min 12 rounds)
--   - Store only hashed passwords, never store plaintext
--   - Last login timestamp should update on successful login
--
-- VALIDATION:
--   - Email must be unique and valid email format
--   - Full name required, min 2 characters
--   - Role must be one of: admin, manager, user
--   - Status must be one of: active, inactive, suspended
--   - Phone optional but must be valid format if provided

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
CREATE INDEX idx_users_created_at ON users(created_at);


-- ====================================================================================
-- 2. ACCESS CONTROL & PAGE PERMISSIONS
-- ====================================================================================
-- Manages which users can access which admin pages
--
-- API ENDPOINTS NEEDED:
--   POST   /api/pages                           - Create new page (admin only)
--   GET    /api/pages                           - List all pages
--   GET    /api/pages/:id                       - Get page details
--   PATCH  /api/pages/:id                       - Update page
--   DELETE /api/pages/:id                       - Delete page
--
--   POST   /api/access/assign                   - Assign user to page with permissions
--   GET    /api/access                          - Get all access assignments
--   GET    /api/access/user/:userId             - Get all pages user can access
--   GET    /api/access/page/:pageId             - Get all users with access to page
--   POST   /api/access/bulk-assign              - Assign multiple users to multiple pages
--   PATCH  /api/access/:accessId                - Update access permissions
--   DELETE /api/access/:accessId                - Remove user access to page
--   GET    /api/access/check/:userId/:pageId   - Check if user can access page
--
-- FEATURES:
--   - Three permission levels: can_view, can_edit, can_delete
--   - Bulk assignment: assign 100 users to 10 pages in one request
--   - Copy permissions: copy one user's access to another user
--   - Matrix view support: get all user x page combinations
--   - Filter by user role, page status
--
-- VALIDATION:
--   - User must exist in users table
--   - Page must exist in pages table
--   - user_id + page_id must be unique (one access record per user-page pair)
--   - Permissions must be boolean values

CREATE TABLE pages (
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

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_is_active ON pages(is_active);
CREATE INDEX idx_user_page_access_user ON user_page_access(user_id);
CREATE INDEX idx_user_page_access_page ON user_page_access(page_id);


-- ====================================================================================
-- 3. CUSTOMERS & CRM
-- ====================================================================================
-- Stores customer information with order tracking
--
-- API ENDPOINTS NEEDED:
--   POST   /api/customers                   - Create new customer
--   GET    /api/customers                   - List customers (with search, filter, pagination)
--   GET    /api/customers/:id               - Get customer details with order history
--   PATCH  /api/customers/:id               - Update customer information
--   DELETE /api/customers/:id               - Delete customer (soft delete)
--   GET    /api/customers/search            - Search customers by name, email, company
--   GET    /api/customers/type/:type        - Get customers by type (Fleet, Wholesale, Distributor)
--   GET    /api/customers/:id/orders        - Get all orders for a customer
--   GET    /api/customers/:id/notes         - Get customer notes/history
--   POST   /api/customers/:id/notes         - Add note to customer
--   PATCH  /api/customers/:id/status        - Update customer status
--
-- FEATURES:
--   - Track total_orders and total_spent (aggregate from orders table)
--   - Created_by tracks which admin created the customer
--   - Search functionality on company_name, contact_name, email
--   - Filter by customer_type and status
--   - Add notes for internal use
--
-- VALIDATION:
--   - Email must be valid email format
--   - Company_name and contact_name required
--   - Customer type must be: Fleet, Wholesale, or Distributor
--   - Status must be: active, inactive, or blocked
--   - total_spent must be calculated from order data
--
-- DATA SYNC:
--   - When order is created/updated, increment/update customer total_orders and total_spent
--   - When customer is deleted, decide what to do with existing orders (cascade or restrict)

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
CREATE INDEX idx_customers_created_at ON customers(created_at);


-- ====================================================================================
-- 4. PRODUCT CATEGORIES & SUBCATEGORIES
-- ====================================================================================
-- Hierarchical product categories with self-referencing parent relationship
--
-- API ENDPOINTS NEEDED:
--   POST   /api/categories                     - Create new category
--   GET    /api/categories                     - List categories (with hierarchy support)
--   GET    /api/categories/:id                 - Get category with subcategories
--   PATCH  /api/categories/:id                 - Update category
--   DELETE /api/categories/:id                 - Delete category (check for products first)
--   GET    /api/categories/:id/products        - Get all products in category
--   GET    /api/categories/parent/:parentId    - Get all subcategories
--   PUT    /api/categories/:id/image           - Upload category image
--
-- HIERARCHY:
--   - Parent categories have parent_category_id = NULL
--   - Subcategories have parent_category_id pointing to parent category
--   - Support unlimited nesting levels
--   - When deleting parent, handle cascading
--
-- VALIDATION:
--   - Name and slug must be unique
--   - Slug must be URL-friendly (lowercase, hyphens only)
--   - Parent must exist if parent_category_id provided
--   - Cannot set a category as its own parent (prevent circular reference)

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
-- Main products table with pricing for different customer types
--
-- API ENDPOINTS NEEDED:
--   POST   /api/products                      - Create new product
--   GET    /api/products                      - List products (with filters, search, pagination)
--   GET    /api/products/:id                  - Get product with images, variants, stock
--   PATCH  /api/products/:id                  - Update product details
--   DELETE /api/products/:id                  - Delete product (soft delete)
--   POST   /api/products/:id/images           - Upload product images
--   GET    /api/products/:id/images           - Get product images
--   DELETE /api/products/:id/images/:imageId  - Delete product image
--   POST   /api/products/:id/variants         - Create variant
--   GET    /api/products/:id/variants         - Get all variants
--   PATCH  /api/products/:id/variants/:varId  - Update variant
--   DELETE /api/products/:id/variants/:varId  - Delete variant
--   GET    /api/products/search               - Full-text search on name/description/sku
--   PATCH  /api/products/:id/stock            - Update stock quantity
--   GET    /api/products/featured             - Get featured products
--
-- PRICING:
--   - price: Default retail price
--   - wholesale_price: Discounted price for Wholesale customers
--   - distributor_price: Lowest price for Distributor customers
--   - Apply appropriate price based on customer_type when creating orders
--
-- INVENTORY:
--   - stock_quantity: Total available units
--   - low_stock_threshold: Alert when below this
--   - Create inventory_logs entry when stock changes
--
-- VALIDATION:
--   - SKU must be unique
--   - Name required, min 3 characters
--   - Category must exist
--   - Prices must be positive
--   - Stock quantity must be >= 0
--   - Status must be: active, draft, or archived
--   - Only active products show on frontend

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
CREATE INDEX idx_products_featured ON products(is_featured);


-- ====================================================================================
-- 6. PRODUCT IMAGES
-- ====================================================================================
-- Store product images with primary image designation and ordering
--
-- API ENDPOINTS NEEDED (see products endpoints above for image operations):
--   - Images are uploaded/deleted through /api/products/:id/images endpoints
--   - Support multiple images per product
--   - One primary image per product
--   - Order images by display_order
--
-- FEATURES:
--   - is_primary: Only one image per product should be primary (enforce in API)
--   - display_order: For ordering multiple images
--   - alt_text: For accessibility and SEO
--   - created_by: Track which user uploaded the image
--
-- STORAGE:
--   - Store image_url as full URL path
--   - Use CDN or cloud storage (AWS S3, Vercel Blob, etc.)
--   - Implement image deletion when product image is deleted
--   - Consider generating thumbnails

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
-- 7. PRODUCT VARIANTS
-- ====================================================================================
-- Handle product variations like size, color, etc.
--
-- API ENDPOINTS (see products endpoints above):
--   - Create, update, delete variants via /api/products/:id/variants
--   - Each variant can have different price and stock
--   - Variant SKU must be unique (e.g., product-sku-red-lg)
--
-- USE CASES:
--   - Different sizes: Small, Medium, Large
--   - Different colors: Red, Blue, Green
--   - Different materials
--   - Any customizable aspect of the product
--
-- VALIDATION:
--   - variant_name required (e.g., "Red - Large")
--   - variant_sku should follow pattern: parent_sku-variant
--   - variant_price optional (inherits parent if null)
--   - stock_quantity independent per variant

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name VARCHAR(255) NOT NULL, -- e.g., "Red - Large", "Blue - Medium"
  variant_sku VARCHAR(100) UNIQUE,
  variant_price DECIMAL(10, 2),
  stock_quantity INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(variant_sku);


-- ====================================================================================
-- 8. INVENTORY TRACKING & LOGS
-- ====================================================================================
-- Complete audit trail of all inventory movements
--
-- API ENDPOINTS NEEDED:
--   GET   /api/inventory/logs                     - List all inventory logs (with filters)
--   GET   /api/inventory/logs/product/:productId  - Get logs for specific product
--   POST  /api/inventory/adjust                   - Manual stock adjustment
--   GET   /api/inventory/low-stock                - Get all products below threshold
--   GET   /api/inventory/report                   - Generate inventory report
--
-- ACTIONS:
--   - stock_in: Received new inventory
--   - stock_out: Sold/shipped inventory
--   - adjustment: Manual correction
--   - return: Customer return
--   - damage: Damaged goods
--   - exchange: Swapped for different variant
--
-- TRACKING:
--   - previous_quantity: Stock before action
--   - new_quantity: Stock after action
--   - reference_id: Link to orders, returns, etc.
--   - reason: Why the adjustment was made
--
-- ANALYSIS:
--   - Use for inventory forecasting
--   - Identify slow-moving products
--   - Track wastage/damage
--   - Audit inventory accuracy

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
CREATE INDEX idx_inventory_logs_reference ON inventory_logs(reference_id);


-- ====================================================================================
-- 9. ORDERS
-- ====================================================================================
-- Main orders table tracking customer purchases
--
-- API ENDPOINTS NEEDED:
--   POST   /api/orders                          - Create new order
--   GET    /api/orders                          - List orders (with filters, pagination, sorting)
--   GET    /api/orders/:id                      - Get full order details with items
--   PATCH  /api/orders/:id                      - Update order
--   PATCH  /api/orders/:id/status               - Update order status
--   PATCH  /api/orders/:id/payment              - Update payment status
--   PATCH  /api/orders/:id/shipping             - Update shipping info
--   DELETE /api/orders/:id                      - Cancel order (soft delete)
--   GET    /api/orders/customer/:customerId     - Get all orders for customer
--   GET    /api/orders/search                   - Search orders by order number, customer
--   POST   /api/orders/:id/notes                - Add note to order
--   GET    /api/orders/:id/notes                - Get order notes
--   POST   /api/orders/:id/refund               - Process refund
--   PUT    /api/orders/:id/print                - Generate printable order
--
-- STATUS FLOW:
--   pending -> processing -> shipped -> completed
--   Any status can go to cancelled or refunded
--
-- PAYMENT STATUS:
--   - pending: Awaiting payment
--   - paid: Payment received
--   - failed: Payment failed
--
-- PRICING:
--   - Calculate prices based on customer type:
--     * Fleet: Use wholesale_price if available
--     * Wholesale: Use wholesale_price
--     * Distributor: Use distributor_price
--   - Store actual unit_price paid (in case prices change)
--   - tax: Calculate based on shipping address
--   - shipping_cost: Based on carrier and weight
--
-- SHIPPING:
--   - Support multiple carriers: Purolator, Canada Post, UPS, FedEx
--   - tracking_number: For customer tracking
--   - shipped_date and delivered_date for timeline
--
-- VALIDATION:
--   - Customer must exist
--   - Order must have at least one item
--   - Total must equal sum of items + tax + shipping
--   - Order number must be unique
--   - Cannot delete/cancel completed orders without refund

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
-- Individual items in an order
--
-- API ENDPOINTS:
--   - Managed through /api/orders endpoints
--   - Create items when creating order
--   - Cannot modify items after order is confirmed (create new order instead)
--
-- STOCK UPDATES:
--   - When order is created with status 'processing':
--     * Create inventory_log entry for stock_out
--     * Reduce product stock_quantity
--   - If order is cancelled:
--     * Reverse inventory
--     * Create inventory_log entry for return
--
-- PRICING:
--   - unit_price: Price paid for this item (may differ from current product price)
--   - line_total: unit_price × quantity
--   - Store actual prices to preserve price history

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
-- Internal notes for order tracking and customer communication
--
-- API ENDPOINTS:
--   - POST /api/orders/:id/notes - Add note
--   - GET /api/orders/:id/notes - Get all notes
--   - DELETE /api/orders/:id/notes/:noteId - Delete note (admin only)
--
-- USE CASES:
--   - Internal: "Waiting for payment confirmation"
--   - Customer communication: "Your order is on the way"
--   - Issues: "Customer requested custom packaging"
--   - Tracking: "Handed to carrier at 2 PM"

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
-- Flexible discount system supporting various types and targeting
--
-- API ENDPOINTS NEEDED:
--   POST   /api/discounts                    - Create discount code
--   GET    /api/discounts                    - List all discounts
--   GET    /api/discounts/:id                - Get discount details
--   PATCH  /api/discounts/:id                - Update discount
--   DELETE /api/discounts/:id                - Delete discount
--   GET    /api/discounts/code/:code         - Validate discount code
--   POST   /api/discounts/:id/apply          - Apply discount to order (calculate savings)
--
-- DISCOUNT TYPES:
--   - percentage: Discount as percentage (e.g., 10% off)
--   - fixed_amount: Fixed dollar amount off (e.g., $5 off)
--
-- TARGETING:
--   - all_products: Apply to entire order
--   - specific_category: Only to items in category
--   - specific_product: Only to specific product
--   - customer_type: Only for Fleet/Wholesale/Distributor
--
-- CONSTRAINTS:
--   - minimum_order_value: Only apply if order > value
--   - maximum_uses: Max times code can be used (NULL = unlimited)
--   - usage_per_customer: Max times per customer (NULL = unlimited)
--   - start_date/end_date: Time-limited promotions
--
-- VALIDATION:
--   - Code must be unique
--   - Value must be positive
--   - end_date must be after start_date
--   - Cannot create expired discounts
--   - Check usage limits before applying

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
CREATE INDEX idx_discounts_dates ON discounts(start_date, end_date);


-- ====================================================================================
-- 13. CMS PAGES & CONTENT
-- ====================================================================================
-- Content management system for marketing pages, blog posts, etc.
--
-- API ENDPOINTS NEEDED:
--   POST   /api/cms/pages                    - Create new page
--   GET    /api/cms/pages                    - List pages (with pagination)
--   GET    /api/cms/pages/:slug              - Get page by slug
--   GET    /api/cms/pages/:id                - Get page details
--   PATCH  /api/cms/pages/:id                - Update page
--   DELETE /api/cms/pages/:id                - Delete page (soft delete)
--   PATCH  /api/cms/pages/:id/publish        - Publish page
--   PATCH  /api/cms/pages/:id/schedule       - Schedule publication
--   PUT    /api/cms/pages/:id/featured       - Upload featured image
--   GET    /api/cms/pages/:id/views          - Get view analytics
--   POST   /api/cms/pages/:id/sections       - Add section to page
--   PATCH  /api/cms/pages/:id/sections/:secId - Update section
--   DELETE /api/cms/pages/:id/sections/:secId - Delete section
--
-- STATUS VALUES:
--   - draft: Not yet published
--   - published: Live on website
--   - scheduled: Will publish at scheduled_publish_date
--   - archived: Hidden but kept for history
--
-- CONTENT MANAGEMENT:
--   - Support block-based editing (hero, features, testimonials, etc.)
--   - Meta tags for SEO
--   - Featured image for social sharing
--   - Track view counts and last viewed date
--
-- VALIDATION:
--   - Title required, min 3 characters
--   - Slug must be unique and URL-friendly
--   - Slug auto-generated from title if not provided
--   - Scheduled date must be in future
--   - Published date auto-set on publish

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
-- 14. CMS SECTIONS (Block-based content)
-- ====================================================================================
-- Individual content blocks within CMS pages
--
-- SECTION TYPES:
--   - hero: Large banner with image and CTA
--   - features: Feature list with icons
--   - testimonials: Customer quotes
--   - faq: Frequently asked questions
--   - text: Rich text content
--   - image: Full-width image
--   - video: Embedded video
--   - form: Contact or signup form
--
-- SETTINGS:
--   - Store section-specific settings as JSON
--   - Hero: background_image, heading, subheading, cta_text, cta_link
--   - Features: items array with title, description, icon
--   - Video: video_url, caption, autoplay flag
--
-- API ENDPOINTS (see CMS pages above for section operations)

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
-- Complete audit trail of all administrative actions
--
-- API ENDPOINTS NEEDED:
--   GET  /api/audit/logs                        - List audit logs (with filters)
--   GET  /api/audit/logs/user/:userId           - Get logs for specific user
--   GET  /api/audit/logs/entity/:type/:id       - Get logs for specific entity
--
-- FEATURES:
--   - Track every create, update, delete action
--   - Store old_values and new_values as JSON for comparison
--   - Capture IP address and user agent for security
--   - Generate compliance reports
--   - Cannot be edited or deleted (immutable)
--
-- ACTIONS:
--   - create: New entity created
--   - update: Existing entity modified
--   - delete: Entity deleted
--   - publish: Content published
--   - approve: Item approved by admin
--   - reject: Item rejected
--
-- USE CASES:
--   - Compliance auditing
--   - Investigate issues ("who changed this customer?")
--   - Track admin activity
--   - Revert changes if needed

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
-- Daily aggregated analytics for dashboard reporting
--
-- API ENDPOINTS NEEDED:
--   GET  /api/analytics/daily                    - Get daily metrics
--   GET  /api/analytics/daily/:date              - Get metrics for specific date
--   GET  /api/analytics/range                    - Get metrics for date range
--   GET  /api/analytics/summary                  - Get summary statistics
--   GET  /api/analytics/top-products             - Top selling products
--   GET  /api/analytics/top-customers            - Top customers by revenue
--
-- METRICS:
--   - total_orders: Orders placed
--   - total_revenue: Total sales
--   - average_order_value: Revenue / orders
--   - total_customers: Unique customers
--   - new_customers: First-time customers
--   - total_page_views: Website page views
--   - total_visits: Unique visitor sessions
--
-- DATA AGGREGATION:
--   - Run daily job to aggregate metrics
--   - Calculate from orders, customers, analytics tables
--   - Store for quick dashboard queries instead of computing real-time
--
-- OPTIONAL EXPANSIONS:
--   - Hourly metrics for real-time dashboard
--   - Metrics by product category
--   - Metrics by customer type
--   - Conversion tracking
--   - Traffic source attribution

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

INSERT INTO pages (name, slug, description, icon, display_order) VALUES
('Overview', 'overview', 'Dashboard overview and statistics', 'LayoutDashboard', 0),
('Products', 'products', 'Product catalog and inventory management', 'Package', 1),
('Inventory', 'inventory', 'Stock levels and warehouse management', 'Warehouse', 2),
('Orders', 'orders', 'Order management and fulfillment', 'ShoppingBag', 3),
('Customers', 'customers', 'Customer CRM and account management', 'Users', 4),
('Discounts', 'discounts', 'Discount and promotion codes', 'Tag', 5),
('CMS', 'cms', 'Content management system', 'FileText', 6),
('Analytics', 'analytics', 'Sales and traffic analytics', 'BarChart3', 7),
('Users', 'users', 'Admin user management', 'Users', 8),
('Access Control', 'access', 'User permissions and page access', 'Shield', 9),
('Settings', 'settings', 'System configuration and settings', 'Settings', 10)
ON CONFLICT (slug) DO NOTHING;


-- ====================================================================================
-- 17. CUSTOMER ACCOUNTS & AUTHENTICATION
-- ====================================================================================
-- Stores customer/client accounts for the public side of the application
--
-- API ENDPOINTS NEEDED:
--   POST   /api/auth/register              - Register new customer account
--   POST   /api/auth/login                 - Login customer (returns JWT token)
--   POST   /api/auth/logout                - Logout customer
--   POST   /api/auth/refresh-token         - Refresh JWT token
--   POST   /api/auth/forgot-password       - Send password reset email
--   POST   /api/auth/reset-password        - Reset password with token
--   GET    /api/customers/me               - Get current customer profile
--   PATCH  /api/customers/me               - Update current customer profile
--   PUT    /api/customers/me/avatar        - Upload/update avatar
--   PATCH  /api/customers/me/password      - Change password (old password required)
--   DELETE /api/customers/me               - Delete account (soft delete)
--
-- VALIDATION:
--   - Email must be unique and valid format
--   - Password min 8 characters, must contain uppercase, lowercase, number
--   - First name and last name required, min 2 characters
--   - Phone optional but must be valid format
--   - Company optional but max 255 characters
--

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, suspended
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_email_verified ON customers(email_verified);


-- ====================================================================================
-- 18. CUSTOMER ADDRESSES
-- ====================================================================================
-- Stores delivery and billing addresses for customers
--
-- API ENDPOINTS NEEDED:
--   POST   /api/customers/addresses        - Create new address
--   GET    /api/customers/addresses        - List customer addresses
--   GET    /api/customers/addresses/:id    - Get single address
--   PATCH  /api/customers/addresses/:id    - Update address
--   DELETE /api/customers/addresses/:id    - Delete address
--   POST   /api/customers/addresses/:id/default - Set as default address
--
-- VALIDATION:
--   - Street address required, max 255 characters
--   - City required, max 100 characters
--   - Province/state required, max 100 characters
--   - Postal/zip code required, format validation by country
--   - Country required
--   - Customers should have at least one address on first order
--

CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(50), -- e.g., "Home", "Work", "Warehouse"
  street_address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  province_state VARCHAR(100) NOT NULL,
  postal_zip_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Canada',
  is_default BOOLEAN DEFAULT false,
  is_billing BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_is_default ON customer_addresses(is_default);
CREATE UNIQUE INDEX idx_customer_default_address ON customer_addresses(customer_id) WHERE is_default = true;


-- ====================================================================================
-- 19. CUSTOMER ORDERS (Link to orders table)
-- ====================================================================================
-- Customer order history with personalized information
-- Links to the main orders table but includes customer-specific context
--
-- API ENDPOINTS NEEDED:
--   GET    /api/customers/orders           - Get customer order history (paginated)
--   GET    /api/customers/orders/:orderId  - Get single order details
--   GET    /api/customers/orders/:orderId/tracking - Get tracking info
--   POST   /api/customers/orders/:orderId/cancel - Request order cancellation
--   GET    /api/customers/orders/:orderId/invoice - Download invoice
--   GET    /api/customers/orders/:orderId/shipment - Get shipment details
--
-- FEATURES:
--   - View all personal orders
--   - Track order status in real-time
--   - See estimated delivery dates
--   - Download invoices
--   - See order history and repeat orders
--

-- The customer_orders view is created from the orders table:
CREATE VIEW customer_orders AS
SELECT 
  o.id,
  o.customer_id,
  o.order_number,
  o.status,
  o.total_amount,
  o.tax_amount,
  o.shipping_cost,
  o.subtotal,
  o.created_at,
  o.updated_at,
  o.tracking_number,
  o.carrier,
  o.estimated_delivery,
  o.notes,
  COUNT(oi.id) as items_count,
  SUM(oi.quantity) as total_quantity
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;


-- ====================================================================================
-- 20. CUSTOMER ACCOUNT PREFERENCES
-- ====================================================================================
-- Stores customer preferences like newsletter subscription, notifications, etc.
--
-- API ENDPOINTS NEEDED:
--   GET    /api/customers/preferences      - Get customer preferences
--   PATCH  /api/customers/preferences      - Update preferences
--
-- FEATURES:
--   - Email notifications (orders, promotions, newsletter)
--   - Language preference
--   - Currency preference
--   - Privacy settings
--

CREATE TABLE customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  newsletter_subscribed BOOLEAN DEFAULT false,
  order_updates BOOLEAN DEFAULT true,
  promotional_emails BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  preferred_language VARCHAR(10) DEFAULT 'en', -- en, fr
  preferred_currency VARCHAR(10) DEFAULT 'CAD', -- CAD, USD
  two_factor_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_preferences_customer_id ON customer_preferences(customer_id);


-- ====================================================================================
-- 21. CUSTOMER ORDER TRACKING
-- ====================================================================================
-- Detailed tracking history for orders
--
-- API ENDPOINTS NEEDED:
--   GET    /api/customers/orders/:orderId/timeline - Get order timeline
--   GET    /api/customers/orders/:orderId/events   - Get tracking events
--
-- FEATURES:
--   - Track order from pending to delivered
--   - See timestamp of each status change
--   - Get carrier tracking info
--   - Receive notifications on status changes
--

CREATE TABLE order_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(255),
  carrier_tracking_number VARCHAR(100)
);

CREATE INDEX idx_order_tracking_order_id ON order_tracking_events(order_id);
CREATE INDEX idx_order_tracking_timestamp ON order_tracking_events(timestamp);


-- ====================================================================================
-- 22. PASSWORD RESET TOKENS
-- ====================================================================================
-- Temporary tokens for password reset functionality
--
-- API ENDPOINTS NEEDED:
--   POST   /api/auth/forgot-password       - Generate reset token
--   POST   /api/auth/reset-password        - Reset password with token
--   DELETE /api/auth/reset-tokens/:token   - Invalidate token (used or expired)
--

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_customer_id ON password_reset_tokens(customer_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);


-- ====================================================================================
-- 23. EMAIL VERIFICATION TOKENS
-- ====================================================================================
-- Tokens for email verification on registration
--
-- API ENDPOINTS NEEDED:
--   POST   /api/auth/verify-email         - Verify email with token
--   POST   /api/auth/resend-verification  - Resend verification email
--

CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_verification_customer_id ON email_verification_tokens(customer_id);
CREATE INDEX idx_email_verification_token ON email_verification_tokens(token);


-- ====================================================================================
-- 24. CUSTOMER WISHLIST/SAVED PRODUCTS
-- ====================================================================================
-- Allows customers to save favorite products
--
-- API ENDPOINTS NEEDED:
--   GET    /api/customers/wishlist        - Get customer wishlist
--   POST   /api/customers/wishlist        - Add product to wishlist
--   DELETE /api/customers/wishlist/:productId - Remove from wishlist
--   GET    /api/customers/wishlist/count  - Get wishlist count
--

CREATE TABLE customer_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, product_id)
);

CREATE INDEX idx_customer_wishlist_customer_id ON customer_wishlist(customer_id);
CREATE INDEX idx_customer_wishlist_product_id ON customer_wishlist(product_id);


-- ====================================================================================
-- 25. CUSTOMER SESSION TOKENS
-- ====================================================================================
-- JWT tokens for customer sessions (optional - can use standard JWT)
--
-- API ENDPOINTS NEEDED:
--   POST   /api/auth/login                - Create session token
--   DELETE /api/auth/logout               - Invalidate session token
--   POST   /api/auth/refresh-token        - Refresh token
--

CREATE TABLE customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  refresh_token VARCHAR(500),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT
);

CREATE INDEX idx_customer_sessions_customer_id ON customer_sessions(customer_id);
CREATE INDEX idx_customer_sessions_token ON customer_sessions(token);
CREATE INDEX idx_customer_sessions_expires ON customer_sessions(expires_at);


-- ====================================================================================
-- END OF DATABASE SCHEMA
-- ====================================================================================
-- 
-- NOTES FOR BACKEND IMPLEMENTATION:
--
-- 1. AUTHENTICATION & SECURITY:
--    - All API endpoints require Bearer token authentication (except /login)
--    - Hash passwords with bcrypt (min 12 rounds)
--    - Implement rate limiting on authentication endpoints
--    - CORS configuration for frontend domain
--
-- 2. DATABASE OPERATIONS:
--    - Use prepared statements to prevent SQL injection
--    - Implement connection pooling
--    - Add query timeouts
--    - Regular backups (daily minimum)
--
-- 3. API RESPONSE FORMAT:
--    - Consistent response structure: { data, error, message, pagination }
--    - Proper HTTP status codes: 200, 201, 400, 401, 403, 404, 500
--    - Validation errors with field-specific messages
--
-- 4. PAGINATION:
--    - Default page size: 50
--    - Max page size: 500
--    - Include total_count for UI pagination
--
-- 5. FILTERING & SEARCH:
--    - Support date range filters
--    - Full-text search on searchable fields
--    - Multiple filter combinations
--
-- 6. TRANSACTIONS:
--    - Use transactions for order creation (update inventory atomically)
--    - Use transactions for customer deletion (handle cascade)
--
-- 7. PERFORMANCE:
--    - Add database connection pooling
--    - Implement caching for frequently accessed data
--    - Use indexes efficiently
--    - Monitor slow queries
--
-- 8. DATA VALIDATION:
--    - Validate all inputs on both frontend and backend
--    - Check business logic constraints
--    - Prevent invalid status transitions
--
-- 9. ERROR HANDLING:
--    - Log all errors with context
--    - Return user-friendly error messages
--    - Never expose sensitive info in errors
--
-- 10. TESTING:
--     - Unit tests for business logic
--     - Integration tests for API endpoints
--     - Database tests for data integrity
--     - Performance/load testing
--
-- ====================================================================================
