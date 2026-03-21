<?php
/**
 * =====================================================================
 * REMQUIP NEXUS - CONFIGURATION
 * =====================================================================
 */

// Database Configuration
define('DB_HOST', getenv('DB_HOST') ?: 'luccybcdb.mysql.db');
define('DB_USER', getenv('DB_USER') ?: 'luccybcdb');
define('DB_PASS', getenv('DB_PASS') ?: 'Dadouhibou2025');
define('DB_NAME', getenv('DB_NAME') ?: 'luccybcdb');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATION', 'utf8mb4_unicode_ci');

// API Configuration
define('API_URL', getenv('API_URL') ?: 'http://localhost:3000/api');
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: 'http://localhost:5173');
define('API_VERSION', '1.0.0');

// JWT/Token Configuration
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-secret-key-change-in-production');
define('TOKEN_EXPIRY', 24 * 60 * 60); // 24 hours in seconds

// File Upload Configuration
define('UPLOAD_DIR', __DIR__ . '/uploads');
define('MAX_UPLOAD_SIZE', 100 * 1024 * 1024); // 100 MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
define('ALLOWED_IMAGE_EXT', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
define('ALLOWED_FILE_TYPES', ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

// Pagination
define('DEFAULT_LIMIT', 10);
define('MAX_LIMIT', 100);
define('DEFAULT_OFFSET', 0);

// Password Configuration
define('PASSWORD_COST', 12); // bcrypt cost factor
define('PASSWORD_MIN_LENGTH', 8);

// Timezone
define('APP_TIMEZONE', 'America/Toronto');
date_default_timezone_set(APP_TIMEZONE);

// Locale
define('APP_LOCALE', 'en_CA');

// Currency
define('CURRENCY_CODE', 'CAD');
define('CURRENCY_SYMBOL', 'C$');

// Email Configuration
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', getenv('SMTP_PORT') ?: 587);
define('SMTP_USER', getenv('SMTP_USER') ?: 'your-email@gmail.com');
define('SMTP_PASS', getenv('SMTP_PASS') ?: 'your-app-password');
define('SMTP_FROM', getenv('SMTP_FROM') ?: 'noreply@remquip.com');

// Logging
define('LOG_DIR', __DIR__ . '/logs');
define('LOG_LEVEL', getenv('LOG_LEVEL') ?: 'info'); // debug, info, warning, error

// Permissions
define('ROLES', ['admin', 'manager', 'user']);
define('PERMISSIONS', [
    'view' => 1,
    'create' => 2,
    'edit' => 4,
    'delete' => 8,
    'publish' => 16
]);

// Cache Configuration
define('CACHE_ENABLED', true);
define('CACHE_TTL', 3600); // 1 hour

// Pagination defaults per resource
define('PAGINATION_DEFAULTS', [
    'products' => 20,
    'orders' => 10,
    'customers' => 15,
    'users' => 10,
    'inventory' => 25
]);

// Product pricing tiers
define('CUSTOMER_TYPES', [
    'retail' => ['discount' => 0, 'name' => 'Retail'],
    'wholesale' => ['discount' => 10, 'name' => 'Wholesale'],
    'fleet' => ['discount' => 15, 'name' => 'Fleet'],
    'distributor' => ['discount' => 20, 'name' => 'Distributor']
]);

// Status enums
define('USER_STATUS', ['active', 'inactive', 'suspended']);
define('ORDER_STATUS', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);
define('PRODUCT_STATUS', ['active', 'inactive', 'discontinued']);
define('INVENTORY_STATUS', ['in_stock', 'low_stock', 'out_of_stock']);

// Enable/Disable features
define('FEATURE_ANALYTICS', true);
define('FEATURE_CMS', true);
define('FEATURE_DISCOUNTS', true);
define('FEATURE_INVENTORY_TRACKING', true);
define('FEATURE_CUSTOMER_NOTES', true);
define('FEATURE_MULTI_CURRENCY', false);

// Development mode
define('DEBUG_MODE', getenv('DEBUG_MODE') === 'true');

// Ensure upload directory exists
if (!is_dir(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0755, true);
}

// Ensure log directory exists
if (!is_dir(LOG_DIR)) {
    @mkdir(LOG_DIR, 0755, true);
}
?>
