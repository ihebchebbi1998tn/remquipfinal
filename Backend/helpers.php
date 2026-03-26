<?php
/**
 * =====================================================================
 * REMQUIP NEXUS - HELPER CLASSES
 * Utility functions for logging, validation, responses, and common operations
 * =====================================================================
 */

/** nginx / PHP-FPM often omit getallheaders(); Auth::getToken() needs this. */
if (!function_exists('getallheaders')) {
    function getallheaders(): array
    {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (strpos($name, 'HTTP_') === 0) {
                $key = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$key] = $value;
            }
        }
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        return $headers;
    }
}

class ResponseHelper {
    /**
     * JSON encode for API bodies — avoids HTTP 500 when DB text contains invalid UTF-8 (PHP 7.2+).
     *
     * @param mixed $data
     */
    private static function jsonEncodeSafe($data): string {
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
        if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
            $flags |= JSON_INVALID_UTF8_SUBSTITUTE;
        }
        $json = json_encode($data, $flags);
        if ($json === false) {
            return json_encode([
                'success' => false,
                'message' => 'Response could not be encoded',
                'data' => null,
                'timestamp' => date('Y-m-d H:i:s'),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }

        return $json;
    }

    /**
     * Send success response
     * @param mixed $data
     * @param string $message
     * @param int $code
     */
    public static function sendSuccess($data = null, $message = 'Success', $code = 200) {
        http_response_code($code);
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        echo self::jsonEncodeSafe($response);
        Logger::info('Response sent', ['code' => $code, 'message' => $message]);
        exit;
    }

    /**
     * Send detailed error response
     * @param string $message
     * @param int $code
     * @param array|string $details
     */
    public static function sendError($message, $code = 400, $details = null) {
        http_response_code($code);
        
        $error_details = [];
        
        // Parse details for deep error information
        if (is_array($details)) {
            $error_details = $details;
        } elseif (is_string($details)) {
            $error_details = ['description' => $details];
        }
        
        // Add helpful context based on error code
        $context = self::getErrorContext($code, $message);
        
        $response = [
            'success' => false,
            'message' => $message,
            'code' => $code,
            'details' => !empty($error_details) ? $error_details : null,
            'context' => $context,
            'timestamp' => date('Y-m-d H:i:s'),
            'request_id' => self::getRequestId()
        ];
        
        echo self::jsonEncodeSafe($response);
        Logger::error('Response sent', ['code' => $code, 'message' => $message, 'details' => $error_details]);
        exit;
    }

    /**
     * Send paginated response
     * @param array $items
     * @param int $total
     * @param int $limit
     * @param int $offset
     * @param string $message
     */
    public static function sendPaginated($items, $total, $limit, $offset, $message = 'Success') {
        self::sendSuccess([
            'items' => $items,
            'pagination' => [
                'total' => (int)$total,
                'limit' => (int)$limit,
                'offset' => (int)$offset,
                'page' => (int)floor($offset / $limit) + 1,
                'pages' => (int)ceil($total / $limit),
                'hasMore' => ($offset + $limit) < $total
            ]
        ], $message);
    }

    /**
     * Get error context information
     * @param int $code
     * @param string $message
     * @return array
     */
    private static function getErrorContext($code, $message) {
        $context = [];
        
        switch ($code) {
            case 400:
                $context['hint'] = 'Check your request body and parameters';
                $context['solutions'] = ['Verify all required fields are provided', 'Check data types match API requirements'];
                break;
            case 401:
                $context['hint'] = 'Authentication failed or token expired';
                $context['solutions'] = ['Include valid Authorization header', 'Use format: Bearer <token>', 'Refresh token if expired'];
                break;
            case 403:
                $context['hint'] = 'You do not have permission for this action';
                $context['solutions'] = ['Verify your user role', 'Admin-only operations require admin account'];
                break;
            case 404:
                $context['hint'] = 'Resource not found';
                $context['solutions'] = ['Verify the resource ID/slug exists', 'Check resource has not been deleted'];
                break;
            case 409:
                $context['hint'] = 'Resource conflict (likely duplicate)';
                $context['solutions'] = ['Verify unique constraints', 'Check if resource already exists'];
                break;
            case 422:
                $context['hint'] = 'Validation failed for provided data';
                $context['solutions'] = ['Check all fields match validation rules', 'Review field requirements in API docs'];
                break;
            case 500:
                $context['hint'] = 'Server error occurred';
                $context['solutions'] = ['Check server logs', 'Verify database connectivity', 'Ensure required tables exist'];
                break;
            default:
                $context['hint'] = 'An error occurred processing your request';
                break;
        }
        
        return $context;
    }

    /**
     * Get unique request ID for tracking
     * @return string
     */
    private static function getRequestId() {
        return 'REQ-' . date('YmdHis') . '-' . substr(md5(uniqid()), 0, 8);
    }
}

// =====================================================================
// AUTHENTICATION & AUTHORIZATION
// =====================================================================

class Auth {
    /**
     * Hash password using bcrypt
     * @param string $password
     * @return string
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => PASSWORD_COST]);
    }

    /**
     * Verify password against hash
     * @param string $password
     * @param string $hash
     * @return bool
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }

    /**
     * HMAC-signed bearer token (payload cannot be forged without JWT_SECRET)
     */
    public static function generateToken($userId, $role) {
        if (JWT_SECRET === '' || strlen(JWT_SECRET) < 16) {
            Logger::error('JWT_SECRET must be set in the environment (min 16 characters)');
            ResponseHelper::sendError('Authentication is not configured on the server', 503);
        }
        $payload = [
            'user_id' => $userId,
            'role' => $role,
            'iat' => time(),
            'exp' => time() + TOKEN_EXPIRY
        ];
        $payloadJson = json_encode($payload);
        $payloadB64 = rtrim(strtr(base64_encode($payloadJson), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $payloadB64, JWT_SECRET);
        return $payloadB64 . '.' . $sig;
    }

    /**
     * Verify signed token; rejects legacy unsigned tokens
     * @param string $token
     * @return array|null
     */
    public static function verifyToken($token) {
        try {
            if (strpos($token, '.') === false) {
                return null;
            }
            $parts = explode('.', $token, 2);
            if (count($parts) !== 2) {
                return null;
            }
            list($payloadB64, $sig) = $parts;
            $expected = hash_hmac('sha256', $payloadB64, JWT_SECRET);
            if (!hash_equals($expected, $sig)) {
                return null;
            }
            $payloadJson = self::base64UrlDecode($payloadB64);
            if ($payloadJson === false || $payloadJson === '') {
                return null;
            }
            $payload = json_decode($payloadJson, true);
            if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
                return null;
            }
            return $payload;
        } catch (Exception $e) {
            Logger::error('Token verification failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private static function base64UrlDecode($data) {
        $b64 = strtr($data, '-_', '+/');
        $pad = strlen($b64) % 4;
        if ($pad) {
            $b64 .= str_repeat('=', 4 - $pad);
        }
        return base64_decode($b64, true);
    }

    /**
     * Get authorization token from headers
     * @return string|null
     */
    public static function getToken() {
        // Robust auth: token can be passed via query-string for hosts
        // that strip Authorization headers to PHP.
        $queryToken = $_GET['token'] ?? $_POST['token'] ?? null;
        if (is_string($queryToken)) {
            $queryToken = trim($queryToken);
            if ($queryToken !== '') {
                return $queryToken;
            }
        }

        $headers = getallheaders();
        if (!is_array($headers)) {
            $headers = [];
        }
        if (!isset($headers['Authorization']) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
        }
        if (!isset($headers['Authorization']) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        // Some hosts/proxies strip the `Authorization` header before it reaches PHP.
        // Support a custom header sent by the frontend.
        if (!isset($headers['Authorization']) && isset($headers['X-Auth-Token'])) {
            $t = trim((string) $headers['X-Auth-Token']);
            return $t !== '' ? $t : null;
        }
        if (!isset($headers['Authorization']) && isset($_SERVER['HTTP_X_AUTH_TOKEN'])) {
            $t = trim((string) $_SERVER['HTTP_X_AUTH_TOKEN']);
            return $t !== '' ? $t : null;
        }
        
        if (!isset($headers['Authorization'])) {
            return null;
        }
        
        $parts = explode(' ', $headers['Authorization']);
        if (count($parts) !== 2 || $parts[0] !== 'Bearer') {
            return null;
        }
        
        return $parts[1];
    }

    /**
     * Require authentication
     * @param string|null $requiredRole
     * @return array
     */
    public static function requireAuth($requiredRole = null) {
        // If enabled, skip token authentication only for admin CRUD endpoints.
        // This is meant to unblock the admin UI when the host strips Authorization headers.
        if ($requiredRole === 'admin' && defined('ADMIN_NO_AUTH') && ADMIN_NO_AUTH === true) {
            return [
                'user_id' => 0,
                'role' => 'admin',
                'iat' => time(),
                'exp' => time() + (TOKEN_EXPIRY ?? (24 * 60 * 60)),
            ];
        }

        $token = self::getToken();
        
        if (!$token) {
            ResponseHelper::sendError('Unauthorized: Missing token', 401);
        }
        
        $payload = self::verifyToken($token);
        
        if (!$payload) {
            ResponseHelper::sendError('Unauthorized: Invalid or expired token', 401);
        }
        
        if ($requiredRole) {
            $role = $payload['role'] ?? '';
            $deny = $role !== 'admin' && $role !== 'super_admin' && $role !== $requiredRole;
            if ($deny) {
            ResponseHelper::sendError('Forbidden: Insufficient permissions', 403);
            }
        }
        
        return $payload;
    }
}

// =====================================================================
// LOGGING
// =====================================================================

class Logger {
    private static $logDir = __DIR__ . '/logs';
    
    public static function init() {
        @mkdir(self::$logDir, 0755, true);
    }
    
    public static function info($message, $data = []) {
        self::log('info', $message, $data);
    }
    
    public static function error($message, $data = []) {
        self::log('error', $message, $data);
    }
    
    public static function warning($message, $data = []) {
        self::log('warning', $message, $data);
    }
    
    public static function logRequest($endpoint, $data = []) {
        self::log('request', $endpoint, $data);
    }
    
    public static function logUpload($filename, $success, $data = []) {
        $status = $success ? 'success' : 'failed';
        self::log("upload_{$status}", $filename, $data);
    }
    
    private static function log($type, $message, $data = []) {
        self::init();
        
        $timestamp = date('Y-m-d H:i:s');
        $logFile = self::$logDir . '/' . date('Y-m-d') . '.log';
        
        $logEntry = [
            'timestamp' => $timestamp,
            'type' => $type,
            'message' => $message,
            'data' => $data,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        
        $logLine = json_encode($logEntry) . PHP_EOL;
        @file_put_contents($logFile, $logLine, FILE_APPEND);
    }
}

class Validator {
    /**
     * Validate required fields in array
     * @param array $data
     * @param array $required
     * @return array ['valid' => bool, 'missing' => array]
     */
    public static function validateRequired($data, $required = []) {
        $missing = [];
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $missing[] = $field;
            }
        }
        return ['valid' => empty($missing), 'missing' => $missing];
    }

    /**
     * Validate email format
     * @param string $email
     * @return bool
     */
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Validate password strength
     * @param string $password
     * @return array
     */
    public static function validatePassword($password) {
        $errors = [];
        
        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters';
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            $errors[] = 'Password must contain at least one lowercase letter';
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one number';
        }
        
        return ['valid' => empty($errors), 'errors' => $errors];
    }
    
    /**
     * Validate phone number
     * @param string $phone
     * @return bool
     */
    public static function validatePhone($phone) {
        $cleaned = preg_replace('/[^0-9+\-\s]/', '', $phone);
        return strlen($cleaned) >= 10;
    }
    
    /**
     * Validate URL format
     * @param string $url
     * @return bool
     */
    public static function validateURL($url) {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
    
    /**
     * Validate JSON string
     * @param string $json
     * @return bool
     */
    public static function validateJSON($json) {
        json_decode($json);
        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * Validate numeric value
     * @param mixed $value
     * @param float $min
     * @param float $max
     * @return array
     */
    public static function validateNumeric($value, $min = null, $max = null) {
        if (!is_numeric($value)) {
            return ['valid' => false, 'error' => 'Value must be numeric'];
        }
        
        if ($min !== null && $value < $min) {
            return ['valid' => false, 'error' => "Value must be at least $min"];
        }
        
        if ($max !== null && $value > $max) {
            return ['valid' => false, 'error' => "Value must be at most $max"];
        }
        
        return ['valid' => true];
    }

    /**
     * Validate string length
     * @param string $value
     * @param int $min
     * @param int $max
     * @return array
     */
    public static function validateLength($value, $min = 1, $max = 255) {
        $len = strlen($value);
        
        if ($len < $min) {
            return ['valid' => false, 'error' => "Value must be at least $min characters"];
        }
        
        if ($len > $max) {
            return ['valid' => false, 'error' => "Value must not exceed $max characters"];
        }
        
        return ['valid' => true];
    }

    /**
     * Validate array is not empty
     * @param array $array
     * @return array
     */
    public static function validateNotEmpty($array) {
        if (!is_array($array) || empty($array)) {
            return ['valid' => false, 'error' => 'Array cannot be empty'];
        }
        return ['valid' => true];
    }
}

class FileHelper {
    private static $uploadsDir = __DIR__ . '/uploads';
    
    public static function ensureUploadsDir($subdir = 'general') {
        $dir = self::$uploadsDir . '/' . $subdir;
        @mkdir($dir, 0755, true);
        return $dir;
    }
    
    public static function generateFileName($originalName) {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if ($extension === 'jpeg') $extension = 'jpg';
        
        $timestamp = time();
        $randomStr = bin2hex(random_bytes(4));
        return "{$timestamp}_{$randomStr}.{$extension}";
    }
    
    public static function validateImageMime($mimeType) {
        $allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return in_array($mimeType, $allowed);
    }
    
    public static function validateFileSize($size, $maxSizeMB = 100) {
        $maxBytes = $maxSizeMB * 1024 * 1024;
        return $size <= $maxBytes;
    }
    
    public static function deleteFile($filePath) {
        if (file_exists($filePath)) {
            return @unlink($filePath);
        }
        return false;
    }
}

class StringHelper {
    public static function sanitize($value) {
        if (is_array($value)) {
            return array_map([self::class, 'sanitize'], $value);
        }
        return trim(htmlspecialchars($value, ENT_QUOTES, 'UTF-8'));
    }
    
    public static function slugify($text) {
        // Convert to lowercase
        $slug = strtolower($text);
        
        // Remove special characters
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        
        // Remove leading/trailing hyphens
        $slug = trim($slug, '-');
        
        return $slug;
    }
    
    public static function truncate($text, $length = 100, $suffix = '...') {
        if (strlen($text) <= $length) {
            return $text;
        }
        return substr($text, 0, $length) . $suffix;
    }
    
    public static function toTitleCase($text) {
        return ucwords(strtolower($text));
    }
}

class DateHelper {
    public static function formatDate($date, $format = 'Y-m-d H:i:s') {
        if (is_string($date)) {
            $date = strtotime($date);
        }
        return date($format, $date);
    }
    
    public static function getTimezoneDate($date, $timezone = 'America/Toronto') {
        $dt = new DateTime($date, new DateTimeZone('UTC'));
        $dt->setTimezone(new DateTimeZone($timezone));
        return $dt->format('Y-m-d H:i:s');
    }
    
    public static function getDaysSince($date) {
        $now = new DateTime();
        $past = new DateTime($date);
        $interval = $now->diff($past);
        return $interval->days;
    }
}

class CurrencyHelper {
    public static function formatPrice($amount, $currency = 'CAD', $locale = 'en_CA') {
        $fmt = new NumberFormatter($locale, NumberFormatter::CURRENCY);
        return $fmt->formatCurrency($amount, $currency);
    }
    
    public static function parsePrice($formattedPrice) {
        $fmt = new NumberFormatter('en_CA', NumberFormatter::CURRENCY);
        return $fmt->parse($formattedPrice, NumberFormatter::TYPE_DOUBLE);
    }
}

/**
 * @param object $conn Database (fetch/execute)
 * @param string $key
 * @param string $default
 * @return string
 */
function settings_fetch_value($conn, $key, $default = '') {
    $r = $conn->fetch('SELECT setting_value FROM remquip_settings WHERE setting_key = :k', ['k' => $key]);
    if (!$r || !array_key_exists('setting_value', $r)) {
        return $default;
    }
    $v = $r['setting_value'];
    if ($v === null || $v === '') {
        return $default;
    }
    return (string)$v;
}

/**
 * Tax/shipping/currency for storefront + order totals (see GET /settings/storefront).
 *
 * @param object $conn
 * @return array{tax_gst_rate: float, tax_qst_rate: float, tax_combined_rate: float, free_shipping_threshold: float, flat_shipping_rate: float, default_currency: string}
 */
function settings_storefront_rates($conn) {
    $gst = (float)settings_fetch_value($conn, 'tax_gst_rate', '5.0');
    $qst = (float)settings_fetch_value($conn, 'tax_qst_rate', '9.975');
    $free = (float)settings_fetch_value($conn, 'free_shipping_threshold', '500');
    $flat = (float)settings_fetch_value($conn, 'flat_shipping_rate', '25');
    $cur = settings_fetch_value($conn, 'default_currency', 'CAD');
    $combined = ($gst + $qst) / 100.0;
    return [
        'tax_gst_rate' => $gst,
        'tax_qst_rate' => $qst,
        'tax_combined_rate' => $combined,
        'free_shipping_threshold' => $free,
        'flat_shipping_rate' => $flat,
        'default_currency' => $cur,
        'supported_locales' => get_supported_locales($conn),
    ];
}

/**
 * Returns array of enabled locale codes from settings (e.g. ["en","fr"]).
 * Supports future languages; admins add codes via supported_locales setting.
 *
 * @param object $conn
 * @return array<string>
 */
function get_supported_locales($conn) {
    $raw = settings_fetch_value($conn, 'supported_locales', '["en","fr"]');
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $out = [];
        foreach ($decoded as $v) {
            if (is_string($v) && preg_match('/^[a-z]{2}(-[a-z]{2})?$/', strtolower(trim($v)))) {
                $out[] = strtolower(trim($v));
            }
        }
        if (!empty($out)) {
            return array_values(array_unique($out));
        }
    }
    return ['en', 'fr'];
}

/**
 * @param float $subtotal
 * @param array $rates settings_storefront_rates()
 * @return array{tax: float, shipping: float, total: float}
 */
function compute_order_totals_from_subtotal($subtotal, $rates) {
    $subtotal = max(0, (float)$subtotal);
    $tax = round($subtotal * $rates['tax_combined_rate'], 2);
    $shipping = $subtotal <= 0
        ? 0.0
        : ($subtotal >= $rates['free_shipping_threshold'] ? 0.0 : (float)$rates['flat_shipping_rate']);
    $total = round($subtotal + $tax + $shipping, 2);
    return ['tax' => $tax, 'shipping' => $shipping, 'total' => $total];
}

require_once __DIR__ . '/email_templates.php';

function remquip_setting_is_on($conn, $key) {
    $v = settings_fetch_value($conn, $key, '0');
    return $v === '1' || strcasecmp((string)$v, 'true') === 0;
}

function remquip_notification_recipient($conn) {
    $to = trim(settings_fetch_value($conn, 'notif_recipient_email', ''));
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        $to = trim(settings_fetch_value($conn, 'contact_email', ''));
    }
    return filter_var($to, FILTER_VALIDATE_EMAIL) ? $to : null;
}

function remquip_mail_from_address($conn) {
    $f = trim(settings_fetch_value($conn, 'notif_from_email', ''));
    if ($f !== '' && filter_var($f, FILTER_VALIDATE_EMAIL)) {
        return $f;
    }
    $c = trim(settings_fetch_value($conn, 'contact_email', ''));
    if ($c !== '' && filter_var($c, FILTER_VALIDATE_EMAIL)) {
        return $c;
    }
    if (defined('SMTP_FROM')) {
        $s = trim((string)SMTP_FROM);
        if ($s !== '' && filter_var($s, FILTER_VALIDATE_EMAIL)) {
            return $s;
        }
    }
    if (defined('SMTP_USER')) {
        $u = trim((string)SMTP_USER);
        if ($u !== '' && filter_var($u, FILTER_VALIDATE_EMAIL)) {
            return $u;
        }
    }
    return null;
}

function remquip_get_smtp_config($conn) {
    return [
        'host' => settings_fetch_value($conn, 'smtp_host', defined('SMTP_HOST') ? SMTP_HOST : ''),
        'port' => (int)settings_fetch_value($conn, 'smtp_port', defined('SMTP_PORT') ? (string)SMTP_PORT : '465'),
        'user' => settings_fetch_value($conn, 'smtp_user', defined('SMTP_USER') ? SMTP_USER : ''),
        'pass' => settings_fetch_value($conn, 'smtp_pass', defined('SMTP_PASS') ? SMTP_PASS : ''),
        'encryption' => settings_fetch_value($conn, 'smtp_encryption', defined('SMTP_ENCRYPTION') ? SMTP_ENCRYPTION : 'ssl'),
        'from' => remquip_mail_from_address($conn)
    ];
}

function remquip_notify_order_paid_to_customer($conn, $orderId) {
    if (!remquip_setting_is_on($conn, 'notif_order_status')) {
        return;
    }
    $row = $conn->fetch(
        'SELECT o.order_number, o.total, c.email FROM remquip_orders o
         INNER JOIN remquip_customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
         WHERE o.id = :id AND o.deleted_at IS NULL',
        ['id' => $orderId]
    );
    if (!$row || empty($row['email'])) {
        return;
    }
    $cust = filter_var($row['email'], FILTER_VALIDATE_EMAIL);
    if (!$cust) {
        return;
    }
    
    $num = $row['order_number'];
    
    // Add currency safely
    $currency = defined('CURRENCY_CODE') ? mb_strtoupper((string)CURRENCY_CODE) : 'CAD';
    $totalString = number_format((float)$row['total'], 2) . ' ' . $currency;

    $tpl = remquip_tpl_order_paid_customer([
        'order_number' => $num,
        'total' => $totalString,
    ]);
    remquip_send_customer_mail($conn, $cust, 'REMQUIP: Payment confirmed for order ' . $num, $tpl['html'], $tpl['text']);
}

/**
 * @param object $conn
 * @return string|null "Name <email@domain>"
 */
function remquip_mail_from_header($conn) {
    $addr = remquip_mail_from_address($conn);
    if (!$addr) {
        return null;
    }
    $name = settings_fetch_value($conn, 'store_name', 'REMQUIP');

    return trim($name) . ' <' . $addr . '>';
}

/**
 * Admin/system HTML mail via OVH SMTP.
 *
 * @param object $conn
 * @param string $html
 * @param string|null $plain
 * @return bool
 */
function remquip_send_admin_mail($conn, $to, $subject, $html, $plain = null) {
    if (!$to) {
        return false;
    }
    $from = remquip_mail_from_header($conn);
    if (!$from) {
        Logger::info('remquip_mail_skip', ['reason' => 'no_from']);
        return false;
    }
    require_once __DIR__ . '/lib/RemquipSmtp.php';
    $config = remquip_get_smtp_config($conn);
    $reply = remquip_mail_from_address($conn);
    $ok = RemquipSmtp::send($from, $to, $subject, $html, $plain, $reply, $config);
    Logger::info('remquip_admin_mail', ['to' => $to, 'subject' => $subject, 'ok' => $ok]);

    return $ok;
}

/**
 * Customer-facing HTML mail; Reply-To = store outbound address.
 *
 * @param object $conn
 * @param string $html
 * @param string|null $plain
 * @return bool
 */
function remquip_send_customer_mail($conn, $to, $subject, $html, $plain = null) {
    if (!$to) {
        return false;
    }
    $from = remquip_mail_from_header($conn);
    if (!$from) {
        return false;
    }
    require_once __DIR__ . '/lib/RemquipSmtp.php';
    $config = remquip_get_smtp_config($conn);
    $reply = remquip_mail_from_address($conn);
    $ok = RemquipSmtp::send($from, $to, $subject, $html, $plain, $reply, $config);
    Logger::info('remquip_customer_mail', ['to' => $to, 'subject' => $subject, 'ok' => $ok]);

    return $ok;
}

function remquip_notify_new_order($conn, $orderId, $orderNumber, $total) {
    if (!remquip_setting_is_on($conn, 'notif_new_order')) {
        return;
    }
    $to = remquip_notification_recipient($conn);
    if (!$to) {
        return;
    }
    $tpl = remquip_tpl_order_new_admin([
        'order_number' => $orderNumber,
        'total' => $total,
        'order_id' => $orderId,
    ]);
    remquip_send_admin_mail($conn, $to, 'REMQUIP: New order ' . $orderNumber, $tpl['html'], $tpl['text']);
}

function remquip_notify_new_customer($conn, $companyName, $email) {
    if (!remquip_setting_is_on($conn, 'notif_new_customer')) {
        return;
    }
    $to = remquip_notification_recipient($conn);
    if (!$to) {
        return;
    }
    $tpl = remquip_tpl_new_customer_admin(['company' => $companyName, 'email' => $email]);
    remquip_send_admin_mail($conn, $to, 'REMQUIP: New customer ' . $email, $tpl['html'], $tpl['text']);
}

function remquip_notify_low_stock($conn, $sku, $name, $qtyAvailable, $reorderLevel) {
    if (!remquip_setting_is_on($conn, 'notif_low_stock')) {
        return;
    }
    $to = remquip_notification_recipient($conn);
    if (!$to) {
        return;
    }
    $tpl = remquip_tpl_low_stock_admin([
        'sku' => $sku,
        'name' => $name,
        'available' => $qtyAvailable,
        'reorder' => $reorderLevel,
    ]);
    remquip_send_admin_mail($conn, $to, 'REMQUIP: Low stock ' . $sku, $tpl['html'], $tpl['text']);
}

/**
 * Email the customer when an order ships (tracking optional).
 */
function remquip_notify_order_shipped_to_customer($conn, $orderId, $carrier = null, $trackingNumber = null) {
    if (!remquip_setting_is_on($conn, 'notif_order_shipped')) {
        return;
    }
    $row = $conn->fetch(
        'SELECT o.order_number, c.email FROM remquip_orders o
         INNER JOIN remquip_customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
         WHERE o.id = :id AND o.deleted_at IS NULL',
        ['id' => $orderId]
    );
    if (!$row || empty($row['email'])) {
        return;
    }
    $cust = filter_var($row['email'], FILTER_VALIDATE_EMAIL);
    if (!$cust) {
        return;
    }
    $num = $row['order_number'];
    $tpl = remquip_tpl_order_shipped_customer([
        'order_number' => $num,
        'carrier' => $carrier,
        'tracking' => $trackingNumber,
    ]);
    remquip_send_customer_mail($conn, $cust, 'REMQUIP: Order ' . $num . ' shipped', $tpl['html'], $tpl['text']);
}

/**
 * Generic customer email when order status changes (not the shipped flow).
 */
function remquip_notify_order_status_to_customer($conn, $orderId, $newStatus) {
    $flag = settings_fetch_value($conn, 'notif_order_status', '1');
    if ($flag !== '1' && strcasecmp((string)$flag, 'true') !== 0) {
        return;
    }
    $row = $conn->fetch(
        'SELECT o.order_number, c.email FROM remquip_orders o
         INNER JOIN remquip_customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
         WHERE o.id = :id AND o.deleted_at IS NULL',
        ['id' => $orderId]
    );
    if (!$row || empty($row['email'])) {
        return;
    }
    $cust = filter_var($row['email'], FILTER_VALIDATE_EMAIL);
    if (!$cust) {
        return;
    }
    $tpl = remquip_tpl_order_status_customer([
        'order_number' => $row['order_number'],
        'status' => $newStatus,
    ]);
    remquip_send_customer_mail(
        $conn,
        $cust,
        'REMQUIP: Order ' . $row['order_number'] . ' — ' . $newStatus,
        $tpl['html'],
        $tpl['text']
    );
}

/**
 * @param string $prevStatus
 * @param string $newStatus
 */
function remquip_notify_order_status_changed($conn, $orderId, $prevStatus, $newStatus) {
    if ($prevStatus === $newStatus) {
        return;
    }
    if ($newStatus === 'shipped' && $prevStatus !== 'shipped') {
        remquip_notify_order_shipped_to_customer($conn, $orderId, null, null);

        return;
    }
    remquip_notify_order_status_to_customer($conn, $orderId, $newStatus);
}

/**
 * Send the offer/quote to the customer via email.
 * $customMessage: optional personalised note added above the items table.
 * $customSubject: optional subject line override.
 */
function remquip_notify_offer_sent($conn, $offerId, $customMessage = null, $customSubject = null) {
    $row = $conn->fetch(
        'SELECT o.offer_number, o.subtotal, o.discount, o.shipping, o.tax, o.total, o.valid_until,
                o.notes,
                c.email, c.contact_person, c.company_name
         FROM remquip_offers o
         INNER JOIN remquip_customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
         WHERE o.id = :id AND o.deleted_at IS NULL',
        ['id' => $offerId]
    );
    if (!$row || empty($row['email'])) {
        return false;
    }
    $to = filter_var($row['email'], FILTER_VALIDATE_EMAIL);
    if (!$to) {
        return false;
    }

    $items = $conn->fetchAll(
        'SELECT product_name AS name, sku, quantity, unit_price, line_total FROM remquip_offer_items WHERE offer_id = :id',
        ['id' => $offerId]
    );

    $customerName = trim(($row['contact_person'] ?? '') . ' ' . ($row['company_name'] ?? ''));
    if ($customerName === '') $customerName = $to;

    $tpl = remquip_tpl_offer_sent_customer([
        'customer_name'  => $customerName,
        'offer_number'   => $row['offer_number'],
        'valid_until'    => $row['valid_until'] ? date('F j, Y', strtotime($row['valid_until'])) : null,
        'subtotal'       => $row['subtotal'],
        'discount'       => $row['discount'],
        'shipping'       => $row['shipping'],
        'tax'            => $row['tax'],
        'total'          => $row['total'],
        'items'          => $items,
        'custom_message' => $customMessage,
    ]);

    $subject = $customSubject ?: ('REMQUIP: Your Quote ' . $row['offer_number']);
    return remquip_send_customer_mail($conn, $to, $subject, $tpl['html'], $tpl['text']);
}

/**
 * Notify the customer that their accepted offer has been converted to an order.
 */
function remquip_notify_order_from_offer($conn, $orderId, $offerNumber) {
    $row = $conn->fetch(
        'SELECT o.order_number, o.total,
                c.email, c.contact_person, c.company_name
         FROM remquip_orders o
         INNER JOIN remquip_customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
         WHERE o.id = :id AND o.deleted_at IS NULL',
        ['id' => $orderId]
    );
    if (!$row || empty($row['email'])) {
        return false;
    }
    $to = filter_var($row['email'], FILTER_VALIDATE_EMAIL);
    if (!$to) {
        return false;
    }

    $customerName = trim(($row['contact_person'] ?? '') . ' ' . ($row['company_name'] ?? ''));
    if ($customerName === '') $customerName = $to;

    $tpl = remquip_tpl_order_from_offer_customer([
        'customer_name' => $customerName,
        'offer_number'  => $offerNumber,
        'order_number'  => $row['order_number'],
        'total'         => $row['total'],
    ]);

    return remquip_send_customer_mail(
        $conn, $to,
        'REMQUIP: Order ' . $row['order_number'] . ' confirmed',
        $tpl['html'], $tpl['text']
    );
}

// Initialize on include
Logger::init();
