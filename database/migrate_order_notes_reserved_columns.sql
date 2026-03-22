-- Optional patch for older DBs if order note queries fail (MySQL reserved words user / text / date).
-- New installs: remquip_full_schema.sql already defines these columns with backticks.
SET NAMES utf8mb4;

ALTER TABLE remquip_order_notes
  MODIFY COLUMN `user` VARCHAR(128) NULL,
  MODIFY COLUMN `text` TEXT NOT NULL,
  MODIFY COLUMN `date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
