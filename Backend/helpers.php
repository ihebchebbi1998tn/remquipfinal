<?php
/**
 * =====================================================================
 * REMQUIP NEXUS - HELPER CLASSES
 * Utility functions for logging, validation, responses, and common operations
 * =====================================================================
 */

class ResponseHelper {
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
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
     * Generate JWT token
     * @param string $userId
     * @param string $role
     * @return string
     */
    public static function generateToken($userId, $role) {
        $payload = [
            'user_id' => $userId,
            'role' => $role,
            'iat' => time(),
            'exp' => time() + TOKEN_EXPIRY
        ];
        return base64_encode(json_encode($payload));
    }

    /**
     * Verify JWT token
     * @param string $token
     * @return array|null
     */
    public static function verifyToken($token) {
        try {
            $payload = json_decode(base64_decode($token), true);
            
            if (!$payload) {
                return null;
            }
            
            if (!isset($payload['exp']) || $payload['exp'] < time()) {
                return null;
            }
            
            return $payload;
        } catch (Exception $e) {
            Logger::error('Token verification failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Get authorization token from headers
     * @return string|null
     */
    public static function getToken() {
        $headers = getallheaders();
        
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
        $token = self::getToken();
        
        if (!$token) {
            ResponseHelper::sendError('Unauthorized: Missing token', 401);
        }
        
        $payload = self::verifyToken($token);
        
        if (!$payload) {
            ResponseHelper::sendError('Unauthorized: Invalid or expired token', 401);
        }
        
        if ($requiredRole && $payload['role'] !== 'admin' && $payload['role'] !== $requiredRole) {
            ResponseHelper::sendError('Forbidden: Insufficient permissions', 403);
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

class ResponseHelper {
    public static function success($data, $message = 'Success', $code = 200) {
        return self::response(true, $message, $data, $code);
    }
    
    public static function error($message, $code = 400, $errors = null) {
        return self::response(false, $message, $errors, $code);
    }
    
    private static function response($success, $message, $data, $code) {
        http_response_code($code);
        return json_encode([
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

// Initialize on include
Logger::init();
?>
