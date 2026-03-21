-- Migration: 008_create_cms.sql
-- Purpose: Create CMS and content management tables

CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT,
  meta_description VARCHAR(255),
  meta_keywords VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
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

CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_cms_pages_created_by ON cms_pages(created_by);

-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  content TEXT,
  display_order INT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cms_sections_page ON cms_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_cms_sections_order ON cms_sections(page_id, display_order);

COMMIT;
