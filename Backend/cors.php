<?php
/**
 * Open CORS — allow any origin; reflect Origin when present (required for credentialed requests).
 * Loaded from API entry points (index.php, apis.php, etc.).
 */
if (headers_sent()) {
    return;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && strcasecmp($origin, 'null') !== 0) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
$reqHeaders = $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? '';
if ($reqHeaders !== '') {
    header('Access-Control-Allow-Headers: ' . $reqHeaders);
} else {
    header(
        'Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, X-CSRF-Token, X-Request-ID'
    );
}
header('Access-Control-Max-Age: 86400');
