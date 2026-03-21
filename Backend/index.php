<?php
/**
 * =====================================================================
 * REMQUIP NEXUS - API ROUTER
 * Main entry point for all API requests
 * =====================================================================
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('log_errors_max_len', 1024);

// Set proper headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Include required files
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/helpers.php';

// Initialize system
Logger::init();

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/Backend', '', $path);
$path = trim($path, '/');

// Parse path segments
$segments = explode('/', $path);
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// Log incoming request
Logger::logRequest($resource, [
    'method' => $method,
    'path' => $path,
    'id' => $id,
    'action' => $action
]);

// Initialize database
$db = new Database();
$conn = $db->getConnection();

if (!$conn) {
    ResponseHelper::sendError('Database connection failed', 500);
}

// =====================================================================
// API ROUTING
// =====================================================================

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
        // Health check endpoint
        ResponseHelper::sendSuccess(['status' => 'ok', 'timestamp' => date('Y-m-d H:i:s')], 'API is running');
        break;
    
    default:
        ResponseHelper::sendError('Resource not found', 404);
}
?>
