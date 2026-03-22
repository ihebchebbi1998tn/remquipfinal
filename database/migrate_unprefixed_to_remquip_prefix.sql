-- =============================================================================
-- ONE-TIME MIGRATION: unprefixed tables → remquip_* (matches remquip_full_schema.sql)
-- Backup the database before running. Do not run on a DB already using remquip_*.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

RENAME TABLE
  `users` TO `remquip_users`,
  `pages` TO `remquip_pages`,
  `user_page_access` TO `remquip_user_page_access`,
  `categories` TO `remquip_categories`,
  `products` TO `remquip_products`,
  `product_images` TO `remquip_product_images`,
  `product_variants` TO `remquip_product_variants`,
  `inventory` TO `remquip_inventory`,
  `inventory_logs` TO `remquip_inventory_logs`,
  `customers` TO `remquip_customers`,
  `customer_notes` TO `remquip_customer_notes`,
  `customer_documents` TO `remquip_customer_documents`,
  `orders` TO `remquip_orders`,
  `order_items` TO `remquip_order_items`,
  `order_notes` TO `remquip_order_notes`,
  `discounts` TO `remquip_discounts`,
  `cms_pages` TO `remquip_cms_pages`,
  `banners` TO `remquip_banners`,
  `analytics` TO `remquip_analytics`,
  `audit_logs` TO `remquip_audit_logs`,
  `settings` TO `remquip_settings`,
  `file_uploads` TO `remquip_file_uploads`,
  `admin_contacts` TO `remquip_admin_contacts`;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- END
-- =============================================================================
