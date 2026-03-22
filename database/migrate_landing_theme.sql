-- Landing page design tokens (CSS variables, fonts, sizes, custom CSS)
-- GET /landing-theme (public) | PUT /landing-theme (admin)

CREATE TABLE IF NOT EXISTS remquip_landing_theme (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  theme JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO remquip_landing_theme (id, theme) VALUES (
  'lt000000-0000-4000-8000-000000000001',
  '{"css_variables":{},"font_heading_stack":"","font_body_stack":"","google_fonts_url":null,"font_sizes":{},"custom_css":null}'
);
