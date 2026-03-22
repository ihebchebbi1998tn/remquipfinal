-- Idempotent migration: contact page map (Leaflet) — singleton row
-- Run against existing DBs that were created before remquip_contact_map existed.

CREATE TABLE IF NOT EXISTS remquip_contact_map (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(11,7) NOT NULL,
  zoom INT NOT NULL DEFAULT 13,
  marker_title VARCHAR(255) NULL,
  address_line TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default: Montréal, QC, Canada (editable in Admin → CMS)
INSERT IGNORE INTO remquip_contact_map (id, latitude, longitude, zoom, marker_title, address_line)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  45.5017000,
  -73.5673000,
  13,
  'REMQUIP',
  '1000 Rue de la Gauchetière O, Montréal, QC H3B 4W5, Canada'
);
