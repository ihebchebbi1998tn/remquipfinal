/**
 * API Endpoints Configuration
 * All REST API endpoints for REMQUIP backend
 * Base URL: http://luccibyey.com.tn/remquip/backend
 */

export const API_ENDPOINTS = {
  // ==================== AUTH ENDPOINTS ====================
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    VERIFY: '/api/auth/verify',
  },

  // ==================== USERS ENDPOINTS ====================
  USERS: {
    LIST: '/api/users',
    CREATE: '/api/users',
    PROFILE: '/api/users/profile',
    GET: '/api/users/:id',
    UPDATE: '/api/users/:id',
    DELETE: '/api/users/:id',
    UPDATE_PASSWORD: '/api/users/:id/password',
    UPDATE_AVATAR: '/api/users/:id/avatar',
    GET_SETTINGS: '/api/users/:id/settings',
    UPDATE_SETTINGS: '/api/users/:id/settings',
  },

  // ==================== PRODUCTS ENDPOINTS ====================
  PRODUCTS: {
    LIST: '/api/products',
    CREATE: '/api/products',
    GET: '/api/products/:id',
    UPDATE: '/api/products/:id',
    DELETE: '/api/products/:id',
    SEARCH: '/api/products/search',
    FEATURED: '/api/products/featured',
    BY_CATEGORY: '/api/products/category/:categoryId',
  },

  // ==================== PRODUCT IMAGES ENDPOINTS ====================
  PRODUCT_IMAGES: {
    LIST: '/api/products/:id/images',
    UPLOAD: '/api/products/:id/images',
    DELETE: '/api/products/:id/images/:imageId',
  },

  // ==================== CATEGORIES ENDPOINTS ====================
  CATEGORIES: {
    LIST: '/api/categories',
    CREATE: '/api/categories',
    GET: '/api/categories/:id',
    UPDATE: '/api/categories/:id',
    DELETE: '/api/categories/:id',
  },

  // ==================== CUSTOMERS ENDPOINTS ====================
  CUSTOMERS: {
    LIST: '/api/customers',
    CREATE: '/api/customers',
    GET: '/api/customers/:id',
    UPDATE: '/api/customers/:id',
    DELETE: '/api/customers/:id',
    SEARCH: '/api/customers/search',
    ORDERS: '/api/customers/:id/orders',
    ADDRESSES: '/api/customers/:id/addresses',
  },

  // ==================== ORDERS ENDPOINTS ====================
  ORDERS: {
    LIST: '/api/orders',
    CREATE: '/api/orders',
    GET: '/api/orders/:id',
    UPDATE: '/api/orders/:id',
    DELETE: '/api/orders/:id',
    SEARCH: '/api/orders/search',
    STATUS: '/api/orders/:id/status',
    TRACKING: '/api/orders/:id/tracking',
    ADD_NOTE: '/api/orders/:id/notes',
    GET_NOTES: '/api/orders/:id/notes',
    USER_ORDERS: '/api/users/:userId/orders',
  },

  // ==================== DISCOUNTS ENDPOINTS ====================
  DISCOUNTS: {
    LIST: '/api/discounts',
    CREATE: '/api/discounts',
    GET: '/api/discounts/:id',
    UPDATE: '/api/discounts/:id',
    DELETE: '/api/discounts/:id',
    VALIDATE: '/api/discounts/validate/:code',
  },

  // ==================== INVENTORY ENDPOINTS ====================
  INVENTORY: {
    LOGS: '/api/inventory/logs',
    ADJUST: '/api/inventory/adjust',
    LOW_STOCK: '/api/inventory/low-stock',
    HISTORY: '/api/inventory/product/:productId/history',
  },

  // ==================== ANALYTICS ENDPOINTS ====================
  ANALYTICS: {
    DASHBOARD: '/api/analytics/dashboard',
    DAILY_METRICS: '/api/analytics/metrics',
    REVENUE: '/api/analytics/revenue',
  },

  // ==================== DASHBOARD ENDPOINTS ====================
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
    RECENT_ORDERS: '/api/dashboard/recent-orders',
    ACTIVITY_LOG: '/api/dashboard/activity-log',
    TOP_PRODUCTS: '/api/dashboard/top-products',
  },

  // ==================== CMS ENDPOINTS ====================
  CMS: {
    PAGES: '/api/cms/pages',
    CREATE_PAGE: '/api/cms/pages',
    GET_PAGE: '/api/cms/pages/:slug',
    UPDATE_PAGE: '/api/cms/pages/:id',
    DELETE_PAGE: '/api/cms/pages/:id',
    PAGE_CONTENT: '/api/cms/pages/:pageName/content',
    SECTION_CONTENT: '/api/cms/pages/:pageName/sections/:sectionKey',
  },

  // ==================== AUDIT ENDPOINTS ====================
  AUDIT: {
    LOGS: '/api/audit/logs',
    USER_LOGS: '/api/audit/users/:userId/logs',
  },

  // ==================== ADMIN CONTACTS ENDPOINTS ====================
  ADMIN_CONTACTS: {
    LIST: '/api/admin-contacts',
    GET: '/api/admin-contacts/:id',
    BY_DEPARTMENT: '/api/admin-contacts/department/:department',
    BY_SPECIALIZATION: '/api/admin-contacts/specialization/:specialization',
    AVAILABLE: '/api/admin-contacts/available',
  },

  // ==================== ADMIN PERMISSIONS ENDPOINTS ====================
  ADMIN_PERMISSIONS: {
    GET_USER_PERMISSIONS: '/api/admin/permissions/user/:userId',
    UPDATE_PERMISSIONS: '/api/admin/permissions/user/:userId',
    GET_ALL_PERMISSIONS: '/api/admin/permissions',
  },

  // ==================== USER DASHBOARD ENDPOINTS ====================
  USER_DASHBOARD: {
    PROFILE: '/api/user/dashboard/profile',
    ORDERS: '/api/user/dashboard/orders',
    ORDER_SUMMARY: '/api/user/dashboard/orders/summary',
    ADDRESSES: '/api/user/dashboard/addresses',
    SETTINGS: '/api/user/dashboard/settings',
    UPDATE_SETTINGS: '/api/user/dashboard/settings',
    CONTACT_US: '/api/user/dashboard/contacts',
  },
} as const;
