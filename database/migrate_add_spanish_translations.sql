-- =============================================================================
-- ADD SPANISH (es) TRANSLATIONS — Categories, CMS Pages, Banners, Settings
-- Run after remquip_full_schema.sql on MySQL 8.0+
-- =============================================================================

SET NAMES utf8mb4;

-- 1. Update supported_locales to include Spanish
UPDATE remquip_settings
SET setting_value = '["en","fr","es"]'
WHERE setting_key = 'supported_locales';

-- 2. Spanish category translations (FK-safe: match existing category IDs by slug)
INSERT IGNORE INTO remquip_category_translations (id, category_id, locale, name, description)
SELECT UUID(), c.id, 'es', x.name, x.description
FROM (
  SELECT 'air-suspension' AS slug, 'Suspensión neumática' AS name, 'Resortes neumáticos, fuelles y componentes de suspensión' AS description
  UNION ALL SELECT 'brake-shoes-pads', 'Zapatas y pastillas de freno', 'Zapatas, pastillas y kits de herrajes de freno'
  UNION ALL SELECT 'brake-chambers', 'Cámaras de freno', 'Cámaras de freno de resorte y de servicio'
  UNION ALL SELECT 'brake-drums', 'Tambores de freno', 'Tambores de freno para servicio pesado'
) x
JOIN remquip_categories c ON c.slug = x.slug;

-- 3. Spanish CMS homepage translation
INSERT IGNORE INTO remquip_cms_page_translations (id, page_id, locale, title, excerpt, content) VALUES
('b1000002-0000-4000-8000-000000000020', 'b1000001-0000-4000-8000-000000000001', 'es', 'Inicio', 'REMQUIP — piezas para camiones y remolques pesados.',
 '{"sections":{"hero":{"title":"Piezas de grado industrial para flotas en Norteamérica","description":"Más de 500 referencias en stock. Entrega en 48 horas. Confianza de operadores de flotas en Norteamérica durante más de 15 años.","image_url":"","content":"{\\"cta_primary_label\\":\\"Explorar catálogo\\",\\"cta_primary_link\\":\\"/products\\",\\"cta_secondary_label\\":\\"Programa mayorista\\",\\"cta_secondary_link\\":\\"/register\\"}"},"stats":{"title":"","description":"","image_url":"","content":"[{\\"value\\":\\"500+\\",\\"label\\":\\"Refs. en stock\\"},{\\"value\\":\\"48h\\",\\"label\\":\\"Entrega prom.\\"},{\\"value\\":\\"15+\\",\\"label\\":\\"Años de experiencia\\"}]"},"value_props":{"title":"","description":"","image_url":"","content":"[{\\"icon\\":\\"Shield\\",\\"text\\":\\"Certificado y probado\\"},{\\"icon\\":\\"Truck\\",\\"text\\":\\"Entrega rápida\\"},{\\"icon\\":\\"Wrench\\",\\"text\\":\\"Soporte experto\\"},{\\"icon\\":\\"CheckCircle\\",\\"text\\":\\"En stock\\"}]"},"categories_intro":{"title":"Explorar soluciones","description":"Categorías de productos","image_url":"","content":""},"featured_intro":{"title":"Alta demanda","description":"Productos populares","image_url":"","content":""},"why_remquip":{"title":"¿Por qué REMQUIP?","description":"Diseñado para operaciones de flota","image_url":"","content":"{\\"subtitle\\":\\"Nos especializamos en piezas de calidad, precios competitivos y un servicio al cliente que mantiene su flota en funcionamiento.\\",\\"cards\\":[{\\"icon\\":\\"Package\\",\\"title\\":\\"Inventario extenso\\",\\"desc\\":\\"Más de 500 referencias listas para enviar. La mayoría en stock para entrega inmediata a flotas en Norteamérica.\\"},{\\"icon\\":\\"Users\\",\\"title\\":\\"Soporte dedicado\\",\\"desc\\":\\"Equipo de expertos a su disposición. Asesoría técnica, cotizaciones a granel y servicio personalizado.\\"},{\\"icon\\":\\"BarChart3\\",\\"title\\":\\"Trayectoria comprobada\\",\\"desc\\":\\"Más de 15 años sirviendo a operadores de flotas. Confianza en fiabilidad y precios competitivos.\\"}]}"},"wholesale_cta":{"title":"Soluciones para flotas","description":"Programas mayoristas para operadores de flotas","image_url":"","content":"{\\"body\\":\\"Precios competitivos al por mayor, soporte dedicado y pedidos simplificados para su flota.\\",\\"cta_primary_label\\":\\"Unirse al programa\\",\\"cta_primary_link\\":\\"/register\\",\\"cta_secondary_label\\":\\"Contactar ventas\\",\\"cta_secondary_link\\":\\"/contact\\"}"}}}');

-- 4. Spanish CMS contact page translation
INSERT IGNORE INTO remquip_cms_page_translations (id, page_id, locale, title, excerpt, content) VALUES
('b1000004-0000-4000-8000-000000000002', 'b1000003-0000-4000-8000-000000000001', 'es', 'Contacto', 'Página de contacto',
 '{"sections":{"intro":{"title":"Escríbanos","description":"Contáctenos","image_url":"","content":"¿Tiene preguntas sobre nuestros productos o programas mayoristas? Escríbanos y responderemos en 24 horas."},"form_labels":{"title":"","description":"","image_url":"","content":"{\\"name\\":\\"Su nombre\\",\\"email\\":\\"Correo electrónico\\",\\"subject\\":\\"Asunto\\",\\"message\\":\\"Mensaje\\",\\"send\\":\\"Enviar mensaje\\"}"},"sidebar":{"title":"","description":"","image_url":"","content":"{\\"address_label\\":\\"Dirección\\",\\"phone_label\\":\\"Teléfono\\",\\"phone\\":\\"+1 (418) 555-0199\\",\\"email_label\\":\\"Correo\\",\\"email\\":\\"info@remquip.ca\\",\\"hours_label\\":\\"Horario\\",\\"hours\\":\\"Lun - Vie: 8:00 AM - 5:00 PM EST\\"}"},"map":{"title":"Encuéntrenos","description":"La ubicación y dirección se configuran en Admin - CMS (mapa de contacto).","image_url":"","content":""}}}');

-- 5. Spanish banner translation
INSERT IGNORE INTO remquip_banner_translations (id, banner_id, locale, title, description) VALUES
('b2000002-0000-4000-8000-000000000002', 'b2000001-0000-4000-8000-000000000001', 'es', 'Precios para flotas disponibles', 'Consulte sobre programas de volumen');
