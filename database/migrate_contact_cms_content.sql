-- Contact page copy (EN + FR) — remquip_cms_pages + remquip_cms_page_translations
-- Run after base schema. Idempotent via INSERT IGNORE.

INSERT IGNORE INTO remquip_cms_pages (id, slug, title, excerpt, content, is_published, published_at) VALUES
(
  'b1000003-0000-4000-8000-000000000001',
  'contact',
  'Contact',
  'Contact page',
  '{"sections":{"intro":{"title":"Get in touch","description":"Contact Us","image_url":"","content":"Have questions about our products or wholesale programs? Reach out and we will respond within 24 hours."},"form_labels":{"title":"","description":"","image_url":"","content":"{\"name\":\"Your Name\",\"email\":\"Email Address\",\"subject\":\"Subject\",\"message\":\"Message\",\"send\":\"Send Message\"}"},"sidebar":{"title":"","description":"","image_url":"","content":"{\"address_label\":\"Address\",\"phone_label\":\"Phone\",\"phone\":\"+1 (418) 555-0199\",\"email_label\":\"Email\",\"email\":\"info@remquip.ca\",\"hours_label\":\"Hours\",\"hours\":\"Mon - Fri: 8:00 AM - 5:00 PM EST\"}"},"map":{"title":"Find us","description":"Pin and address are set in Admin - CMS (Contact map).","image_url":"","content":""}}}',
  1,
  NOW()
);

INSERT IGNORE INTO remquip_cms_page_translations (id, page_id, locale, title, excerpt, content) VALUES
(
  'b1000004-0000-4000-8000-000000000001',
  'b1000003-0000-4000-8000-000000000001',
  'fr',
  'Contact',
  'Page contact',
  '{"sections":{"intro":{"title":"Écrivez-nous","description":"Nous contacter","image_url":"","content":"Des questions sur nos produits ou nos programmes de gros? Écrivez-nous; nous répondons sous 24 h."},"form_labels":{"title":"","description":"","image_url":"","content":"{\"name\":\"Votre Nom\",\"email\":\"Adresse Courriel\",\"subject\":\"Sujet\",\"message\":\"Message\",\"send\":\"Envoyer le message\"}"},"sidebar":{"title":"","description":"","image_url":"","content":"{\"address_label\":\"Adresse\",\"phone_label\":\"Téléphone\",\"phone\":\"+1 (418) 555-0199\",\"email_label\":\"Courriel\",\"email\":\"info@remquip.ca\",\"hours_label\":\"Heures\",\"hours\":\"Lun - Ven: 8h00 - 17h00 HNE\"}"},"map":{"title":"Nous trouver","description":"La position et l''adresse se configurent dans Admin - CMS (carte Contact).","image_url":"","content":""}}}'
);
