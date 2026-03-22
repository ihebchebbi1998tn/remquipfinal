/**
 * API Endpoints Configuration
 * Paths are relative to API_BASE_URL (HTTPS; see `constants.ts` and Backend/config.php `API_URL`).
 */

export const API_ENDPOINTS = {
  /** GET — Backend `index.php` case `health` (no auth). */
  HEALTH: '/health',

  /** Files land under `Backend/uploads/*` — see `Backend/routes/uploads.php`. */
  UPLOADS: {
    /** POST multipart `file`; optional `productId`, `altText`, `isPrimary`. */
    IMAGE: '/uploads/image',
    /** POST multipart `file`; optional `customerId`, `documentType` (admin). */
    CONTRACT: '/uploads/contract',
    /** POST multipart `file` — `file_uploads` registry (auth). */
    FILE: '/uploads/file',
    /** GET — paginated `file_uploads` (admin). */
    FILES_LIST: '/uploads/files',
    /** DELETE — `file_uploads.id` (admin). */
    FILE_DELETE: '/uploads/files/:id',
    /** GET — list documents for a customer (admin). */
    CONTRACTS_BY_CUSTOMER: '/uploads/contracts/:customerId',
    /** DELETE — `customer_documents.id` (admin). */
    DELETE: '/uploads/:id',
  },

  /** Site config — `settings` table (Backend/routes/settings.php). */
  SETTINGS: {
    PUBLIC: '/settings/public',
    /** GET — tax/shipping/currency for cart (no auth). */
    STOREFRONT: '/settings/storefront',
    LIST: '/settings',
  },

  /** Contact page Leaflet location — `remquip_contact_map` (Backend/routes/contact-map.php). */
  CONTACT_MAP: {
    GET: '/contact-map',
    UPDATE: '/contact-map',
  },

  /** Landing page design tokens — `remquip_landing_theme` (Backend/routes/landing-theme.php). */
  LANDING_THEME: {
    GET: '/landing-theme',
    UPDATE: '/landing-theme',
  },

  // ==================== AUTH ENDPOINTS ====================
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
  },

  // ==================== USERS ENDPOINTS ====================
  /** Per-user settings live under USER_DASHBOARD; avatar via UPDATE body `avatar_url`. */
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    PROFILE: '/users/profile',
    GET: '/users/:id',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
    UPDATE_PASSWORD: '/users/:id/password',
    /** POST: multipart `file` (csv/json) or JSON `{ users: [...] }` (admin). */
    IMPORT: '/users/import',
  },

  // ==================== PRODUCTS ENDPOINTS ====================
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products',
    GET: '/products/:id',
    UPDATE: '/products/:id',
    DELETE: '/products/:id',
    SEARCH: '/products/search',
    FEATURED: '/products/featured',
    BY_CATEGORY: '/products/category/:categoryId',
  },

  // ==================== PRODUCT IMAGES ENDPOINTS ====================
  PRODUCT_IMAGES: {
    LIST: '/products/:id/images',
    UPLOAD: '/products/:id/images',
    DELETE: '/products/:id/images/:imageId',
  },

  // ==================== CATEGORIES ENDPOINTS ====================
  CATEGORIES: {
    LIST: '/categories',
    CREATE: '/categories',
    GET: '/categories/:id',
    UPDATE: '/categories/:id',
    DELETE: '/categories/:id',
    /** GET/PUT — admin; body `{ en?: { name, description }, fr?: { ... } }` */
    TRANSLATIONS: '/categories/:id/translations',
  },

  // ==================== CUSTOMERS ENDPOINTS ====================
  CUSTOMERS: {
    LIST: '/customers',
    CREATE: '/customers',
    GET: '/customers/:id',
    UPDATE: '/customers/:id',
    DELETE: '/customers/:id',
    SEARCH: '/customers/search',
    ORDERS: '/customers/:id/orders',
    ADDRESSES: '/customers/:id/addresses',
    /** POST: multipart `file` (csv/json) or JSON `{ customers: [...] }` (admin). */
    IMPORT: '/customers/import',
  },

  // ==================== ORDERS ENDPOINTS ====================
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    GET: '/orders/:id',
    UPDATE: '/orders/:id',
    DELETE: '/orders/:id',
    SEARCH: '/orders/search',
    STATUS: '/orders/:id/status',
    TRACKING: '/orders/:id/tracking',
    ADD_NOTE: '/orders/:id/notes',
    GET_NOTES: '/orders/:id/notes',
    USER_ORDERS: '/users/:userId/orders',
  },

  // ==================== DISCOUNTS ENDPOINTS ====================
  DISCOUNTS: {
    LIST: '/discounts',
    CREATE: '/discounts',
    GET: '/discounts/:id',
    UPDATE: '/discounts/:id',
    DELETE: '/discounts/:id',
    VALIDATE: '/discounts/validate/:code',
  },

  // ==================== INVENTORY ENDPOINTS ====================
  INVENTORY: {
    LOGS: '/inventory/logs',
    ADJUST: '/inventory/adjust',
    LOW_STOCK: '/inventory/low-stock',
    HISTORY: '/inventory/product/:productId/history',
  },

  // ==================== ANALYTICS ENDPOINTS ====================
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    DAILY_METRICS: '/analytics/metrics',
    REVENUE: '/analytics/revenue',
    SALES: '/analytics/sales',
    INVENTORY_OVERVIEW: '/analytics/inventory',
    CUSTOMERS_OVERVIEW: '/analytics/customers',
    /** POST — insert `analytics` row (public; optional Bearer). */
    EVENTS: '/analytics/events',
    /** GET — admin paginated events. */
    EVENTS_SUMMARY: '/analytics/events/summary',
  },

  // ==================== DASHBOARD ENDPOINTS ====================
  DASHBOARD: {
    STATS: '/dashboard/stats',
    RECENT_ORDERS: '/dashboard/recent-orders',
    ACTIVITY_LOG: '/dashboard/activity-log',
    TOP_PRODUCTS: '/dashboard/top-products',
  },

  // ==================== CMS ENDPOINTS ====================
  CMS: {
    PAGES: '/cms/pages',
    CREATE_PAGE: '/cms/pages',
    GET_PAGE: '/cms/pages/:slug',
    UPDATE_PAGE: '/cms/pages/:id',
    DELETE_PAGE: '/cms/pages/:id',
    PAGE_CONTENT: '/cms/pages/:pageName/content',
    SECTION_CONTENT: '/cms/pages/:pageName/sections/:sectionKey',
    /** POST body creates/updates a section on a page (Backend: cms.php). */
    CONTENT: '/cms/content',
    /** `id` is `pageUuid:sectionKey` (URL-encoded in client). */
    CONTENT_BY_ID: '/cms/content/:id',
    IMAGES_UPLOAD: '/cms/images/upload',
    /** GET/PUT — admin; per-locale title/excerpt/content */
    PAGE_TRANSLATIONS: '/cms/pages/:id/translations',
  },

  /** Hero / marketing banners (Backend routes/cms.php). */
  CMS_BANNERS: {
    LIST: '/cms/banners',
    CREATE: '/cms/banners',
    UPDATE: '/cms/banners/:id',
    DELETE: '/cms/banners/:id',
    /** GET/PUT — admin; per-locale title/description */
    TRANSLATIONS: '/cms/banners/:id/translations',
  },

  // ==================== AUDIT ENDPOINTS ====================
  AUDIT: {
    LOGS: '/audit/logs',
    USER_LOGS: '/audit/users/:userId/logs',
  },

  // ==================== ADMIN CONTACTS ENDPOINTS ====================
  ADMIN_CONTACTS: {
    LIST: '/admin-contacts',
    GET: '/admin-contacts/:id',
    BY_DEPARTMENT: '/admin-contacts/department/:department',
    BY_SPECIALIZATION: '/admin-contacts/specialization/:specialization',
    AVAILABLE: '/admin-contacts/available',
  },

  // ==================== ADMIN PERMISSIONS ENDPOINTS ====================
  ADMIN_PERMISSIONS: {
    GET_USER_PERMISSIONS: '/admin/permissions/user/:userId',
    UPDATE_PERMISSIONS: '/admin/permissions/user/:userId',
    GET_ALL_PERMISSIONS: '/admin/permissions',
  },

  // ==================== USER DASHBOARD ENDPOINTS ====================
  USER_DASHBOARD: {
    PROFILE: '/user/dashboard/profile',
    ORDERS: '/user/dashboard/orders',
    ORDER_SUMMARY: '/user/dashboard/orders/summary',
    ADDRESSES: '/user/dashboard/addresses',
    SETTINGS: '/user/dashboard/settings',
    UPDATE_SETTINGS: '/user/dashboard/settings',
    CONTACT_US: '/user/dashboard/contacts',
  },
} as const;
