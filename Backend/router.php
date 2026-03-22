<?php
/**
 * Path parsing + dispatch into routes/*.php (same logic for pretty URLs and api.php?path=).
 */

function remquip_known_resources(): array
{
    return [
        'auth', 'users', 'products', 'categories', 'inventory', 'customers',
        'orders', 'discounts', 'uploads', 'analytics', 'cms', 'health',
        'dashboard', 'audit', 'user', 'admin', 'admin-contacts', 'settings', 'contact-map', 'landing-theme',
    ];
}

/**
 * Strip deploy prefixes so the first segment can be a known resource name.
 */
function remquip_trim_to_segments(string $path): array
{
    $path = preg_replace('#/backend#i', '', $path);
    $path = preg_replace('#/(?:index|api)\.php#i', '', $path);
    $path = trim($path, '/');

    return array_values(array_filter(explode('/', $path), 'strlen'));
}

function remquip_shift_to_resource(array $segments): array
{
    $knownResources = remquip_known_resources();
    while (!empty($segments) && !in_array($segments[0], $knownResources, true)) {
        array_shift($segments);
    }
    if (($segments[0] ?? '') === 'api') {
        array_shift($segments);
    }

    return $segments;
}

/**
 * Parse logical API path (e.g. auth/login, cms/pages/home) into route segments.
 */
function remquip_parse_path_to_segments(string $path): array
{
    $path = trim(str_replace('\\', '/', $path), '/');
    if ($path === '') {
        return [];
    }
    $segments = remquip_trim_to_segments($path);

    return remquip_shift_to_resource($segments);
}

/**
 * Parse REQUEST_URI (Apache rewrite / direct index.php) into route segments.
 */
function remquip_parse_request_uri(): array
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $path = (string) $path;
    $segments = remquip_trim_to_segments($path);

    return remquip_shift_to_resource($segments);
}

/**
 * Dispatch to routes/{resource}.php with $method, $conn, $id, $action, $routeSegments set for includes.
 *
 * @param array<int, string> $segments
 */
function remquip_dispatch(array $segments): void
{
    list(, $conn) = remquip_require_db();

    $method = $_SERVER['REQUEST_METHOD'];
    $resource = $segments[0] ?? '';
    $routeSegments = array_slice($segments, 1);
    $id = $routeSegments[0] ?? null;
    $action = $routeSegments[1] ?? null;
    $path = implode('/', array_filter($segments, 'strlen'));

    Logger::logRequest($resource, [
        'method' => $method,
        'path' => $path,
        'id' => $id,
        'action' => $action,
        'routeSegments' => $routeSegments,
    ]);

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
}
