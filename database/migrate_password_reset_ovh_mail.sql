-- Run once on existing databases (new installs: merged into remquip_full_schema.sql).
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;

INSERT IGNORE INTO remquip_settings (id, setting_key, setting_value, data_type, description, is_public) VALUES
('s0000001-0000-4000-8000-000000000015', 'notif_order_status', '1', 'string', 'Email: order status update (non-shipped)', 0);
