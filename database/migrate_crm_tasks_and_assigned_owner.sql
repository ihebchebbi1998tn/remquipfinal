-- =============================================================================
-- CRM EXTENSIONS (idempotent)
-- - Add `assigned_contact_id` to remquip_customers
-- - Create `remquip_crm_tasks` for follow-ups / SLA
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Add assigned owner column to customers (if missing)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'remquip_customers'
    AND COLUMN_NAME = 'assigned_contact_id'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE remquip_customers ADD COLUMN assigned_contact_id CHAR(36) NULL AFTER primary_contact_phone',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create tasks table (if missing)
SET @tasks_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'remquip_crm_tasks'
);

SET @sql := IF(
  @tasks_exists = 0,
  '
  CREATE TABLE remquip_crm_tasks (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    customer_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_at TIMESTAMP NULL,
    status ENUM(''open'',''done'',''cancelled'') NOT NULL DEFAULT ''open'',
    assigned_to CHAR(36) NULL,
    created_by CHAR(36) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_tasks_customer (customer_id),
    KEY idx_tasks_status (status),
    KEY idx_tasks_due (due_at),
    KEY idx_tasks_assigned (assigned_to),

    CONSTRAINT fk_tasks_customer FOREIGN KEY (customer_id) REFERENCES remquip_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

