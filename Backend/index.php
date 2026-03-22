<?php
/**
 * =====================================================================
 * REMQUIP NEXUS - API ROUTER
 * Main entry point for all API requests
 * Supports paths like /auth/login, /remquip/api/auth/login, /remquip/backend/auth/login (prefix segments stripped).
 * =====================================================================
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('log_errors_max_len', 1024);

require_once __DIR__ . '/cors.php';

// CORS preflight — must return 2xx with CORS headers (some proxies strip headers on 204)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    header('Content-Length: 0', true);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/helpers.php';

Logger::init();

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#/backend#i', '', (string)$path);
$path = trim($path, '/');

$segments = array_values(array_filter(explode('/', $path), 'strlen'));
$knownResources = [
    'auth', 'users', 'products', 'categories', 'inventory', 'customers',
    'orders', 'discounts', 'uploads', 'analytics', 'cms', 'health',
    'dashboard', 'audit', 'user', 'admin', 'admin-contacts', 'settings', 'contact-map', 'landing-theme',
];
while (!empty($segments) && !in_array($segments[0], $knownResources, true)) {
    array_shift($segments);
}
if (($segments[0] ?? '') === 'api') {
    array_shift($segments);
}

$resource = $segments[0] ?? '';
$routeSegments = array_slice($segments, 1);
$id = $routeSegments[0] ?? null;
$action = $routeSegments[1] ?? null;

Logger::logRequest($resource, [
    'method' => $method,
    'path' => $path,
    'id' => $id,
    'action' => $action,
    'routeSegments' => $routeSegments,
]);

$db = new Database();
$db->getConnection();
$conn = $db;

if (!$db->conn) {
    ResponseHelper::sendError('Database connection failed', 500);
}

switch ($resource) {
    case 'auth':
        require_once __DIR__ . '/routes/auth.php';
        break;
    case 'users':
        require_once __DIR__ . '/routes/users.php';
        break;
    case 'products':
        require_once __DIR__ . '/routes/products.php';
        break;
    case 'categories':
        require_once __DIR__ . '/routes/categories.php';
        break;
    case 'inventory':
        require_once __DIR__ . '/routes/inventory.php';
        break;
    case 'customers':
        require_once __DIR__ . '/routes/customers.php';
        break;
    case 'orders':
        require_once __DIR__ . '/routes/orders.php';
        break;
    case 'discounts':
        require_once __DIR__ . '/routes/discounts.php';
        break;
    case 'uploads':
        require_once __DIR__ . '/routes/uploads.php';
        break;
    case 'analytics':
        require_once __DIR__ . '/routes/analytics.php';
        break;
    case 'cms':
        require_once __DIR__ . '/routes/cms.php';
        break;
    case 'health':
        ResponseHelper::sendSuccess(['status' => 'ok', 'timestamp' => date('Y-m-d H:i:s')], 'API is running');
        break;
    case 'dashboard':
        require_once __DIR__ . '/routes/dashboard.php';
        break;
    case 'audit':
        require_once __DIR__ . '/routes/audit.php';
        break;
    case 'user':
        require_once __DIR__ . '/routes/user.php';
        break;
    case 'admin':
        require_once __DIR__ . '/routes/admin.php';
        break;
    case 'admin-contacts':
        require_once __DIR__ . '/routes/admin-contacts.php';
        break;
    case 'settings':
        require_once __DIR__ . '/routes/settings.php';
        break;
    case 'contact-map':
        require_once __DIR__ . '/routes/contact-map.php';
        break;
    case 'landing-theme':
        require_once __DIR__ . '/routes/landing-theme.php';
        break;
    default:
        ResponseHelper::sendError('Resource not found', 404);
}
