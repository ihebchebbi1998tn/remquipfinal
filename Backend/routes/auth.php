<?php
/**
 * =====================================================================
 * REMQUIP NEXUS - AUTHENTICATION ROUTES
 * =====================================================================
 */

// Get request details
$method = $_SERVER['REQUEST_METHOD'];
$action = $id ?? null;

// =====================================================================
// LOGIN
// =====================================================================
if ($method === 'POST' && $action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    
    if (empty($data['email']) || empty($data['password'])) {
        ResponseHelper::sendError('Email and password are required', 400);
    }
    
    // Validate email format
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        ResponseHelper::sendError('Invalid email format', 400);
    }
    
    try {
        $stmt = $conn->prepare("
            SELECT id, email, password_hash, role, full_name, status 
            FROM remquip_users 
            WHERE email = :email AND deleted_at IS NULL
        ");
        $stmt->execute(['email' => trim($data['email'])]);
        $user = $stmt->fetch();
        
        if (!$user) {
            Logger::warning('Login attempt with non-existent email', ['email' => $data['email']]);
            ResponseHelper::sendError('Invalid email or password', 401);
        }
        
        if ($user['status'] === 'inactive') {
            Logger::warning('Login attempt for inactive user', ['user_id' => $user['id']]);
            ResponseHelper::sendError('Your account is inactive', 403);
        }
        
        if ($user['status'] === 'suspended') {
            Logger::warning('Login attempt for suspended user', ['user_id' => $user['id']]);
            ResponseHelper::sendError('Your account has been suspended', 403);
        }
        
        if (!Auth::verifyPassword($data['password'], $user['password_hash'])) {
            Logger::warning('Failed login attempt', ['email' => $data['email']]);
            ResponseHelper::sendError('Invalid email or password', 401);
        }
        
        // Generate token
        $token = Auth::generateToken($user['id'], $user['role']);
        
        // Update last login
        $updateStmt = $conn->prepare("UPDATE remquip_users SET last_login = NOW() WHERE id = :id");
        $updateStmt->execute(['id' => $user['id']]);
        
        Logger::info('User logged in successfully', ['user_id' => $user['id']]);
        
        ResponseHelper::sendSuccess([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'role' => $user['role']
            ]
        ], 'Login successful', 200);
        
    } catch (Exception $e) {
        Logger::error('Login error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Login failed', 500);
    }
}

// =====================================================================
// REGISTER
// =====================================================================
if ($method === 'POST' && $action === 'register') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    if (empty($data['email']) || empty($data['password']) || empty($data['full_name'])) {
        ResponseHelper::sendError('Email, password, and full name are required', 400);
    }

    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        ResponseHelper::sendError('Invalid email format', 400);
    }

    if (strlen($data['password']) < PASSWORD_MIN_LENGTH) {
        ResponseHelper::sendError('Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters', 400);
    }

    try {
        $check = $conn->prepare('SELECT id FROM remquip_users WHERE email = :email AND deleted_at IS NULL');
        $check->execute(['email' => trim($data['email'])]);
        if ($check->fetch()) {
            ResponseHelper::sendError('An account with this email already exists', 409);
        }

        $userId = bin2hex(random_bytes(18));
        $passwordHash = Auth::hashPassword($data['password']);

        $stmt = $conn->prepare("
            INSERT INTO remquip_users (id, email, password_hash, full_name, role, phone, status)
            VALUES (:id, :email, :password, :full_name, :role, :phone, 'active')
        ");
        $stmt->execute([
            'id' => $userId,
            'email' => trim($data['email']),
            'password' => $passwordHash,
            'full_name' => trim($data['full_name']),
            'role' => 'user',
            'phone' => trim($data['phone'] ?? ''),
        ]);

        $token = Auth::generateToken($userId, 'user');

        Logger::info('User registered', ['user_id' => $userId]);

        ResponseHelper::sendSuccess([
            'token' => $token,
            'user' => [
                'id' => $userId,
                'email' => trim($data['email']),
                'full_name' => trim($data['full_name']),
                'role' => 'user',
            ],
        ], 'Registration successful', 201);
    } catch (Exception $e) {
        Logger::error('Register error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Registration failed', 500);
    }
}

// =====================================================================
// LOGOUT
// =====================================================================
if ($method === 'POST' && $action === 'logout') {
    // Token-based auth doesn't need server-side logout
    // Client should remove token from localStorage/sessionStorage
    ResponseHelper::sendSuccess([], 'Logged out successfully', 200);
}

// =====================================================================
// CHANGE PASSWORD
// =====================================================================
if ($method === 'POST' && $action === 'change-password') {
    $auth = Auth::requireAuth();
    
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    
    if (empty($data['current_password']) || empty($data['new_password'])) {
        ResponseHelper::sendError('Current password and new password are required', 400);
    }
    
    // Validate new password
    if (strlen($data['new_password']) < PASSWORD_MIN_LENGTH) {
        ResponseHelper::sendError('Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters', 400);
    }
    
    try {
        $stmt = $conn->prepare("SELECT password_hash FROM remquip_users WHERE id = :id");
        $stmt->execute(['id' => $auth['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            ResponseHelper::sendError('User not found', 404);
        }
        
        if (!Auth::verifyPassword($data['current_password'], $user['password_hash'])) {
            ResponseHelper::sendError('Current password is incorrect', 400);
        }
        
        $newHash = Auth::hashPassword($data['new_password']);
        
        $updateStmt = $conn->prepare("UPDATE remquip_users SET password_hash = :password, updated_at = NOW() WHERE id = :id");
        $updateStmt->execute([
            'password' => $newHash,
            'id' => $auth['user_id']
        ]);
        
        Logger::info('User password changed', ['user_id' => $auth['user_id']]);
        ResponseHelper::sendSuccess([], 'Password changed successfully', 200);
        
    } catch (Exception $e) {
        Logger::error('Password change error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to change password', 500);
    }
}

// =====================================================================
// REFRESH TOKEN (same claims as login; client sends current Bearer token)
// =====================================================================
if ($method === 'POST' && $action === 'refresh') {
    try {
        $auth = Auth::requireAuth();
        $stmt = $conn->prepare('SELECT id, role, status FROM remquip_users WHERE id = :id AND deleted_at IS NULL');
        $stmt->execute(['id' => $auth['user_id']]);
        $user = $stmt->fetch();
        if (!$user) {
            ResponseHelper::sendError('User not found', 404);
        }
        if ($user['status'] === 'inactive') {
            ResponseHelper::sendError('Your account is inactive', 403);
        }
        if ($user['status'] === 'suspended') {
            ResponseHelper::sendError('Your account has been suspended', 403);
        }
        $token = Auth::generateToken($user['id'], $user['role']);
        ResponseHelper::sendSuccess(['token' => $token], 'Token refreshed', 200);
    } catch (Exception $e) {
        Logger::error('Token refresh error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Token refresh failed', 500);
    }
}

// =====================================================================
// VERIFY TOKEN
// =====================================================================
if ($method === 'GET' && $action === 'verify') {
    try {
        $token = Auth::getToken();
        
        if (!$token) {
            ResponseHelper::sendError('No token provided', 401);
        }
        
        $payload = Auth::verifyToken($token);
        
        if (!$payload) {
            ResponseHelper::sendError('Invalid or expired token', 401);
        }
        
        // Fetch user info
        $stmt = $conn->prepare("SELECT id, email, full_name, role, status FROM remquip_users WHERE id = :id");
        $stmt->execute(['id' => $payload['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            ResponseHelper::sendError('User not found', 404);
        }
        
        ResponseHelper::sendSuccess([
            'user' => $user,
            'expires_in' => $payload['exp'] - time()
        ], 'Token is valid', 200);
        
    } catch (Exception $e) {
        Logger::error('Token verification error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Token verification failed', 500);
    }
}

// If none of the routes match
ResponseHelper::sendError('Authentication endpoint not found', 404);
?>
