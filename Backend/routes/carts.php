<?php
/**
 * Abandoned Carts API
 *
 * GET /carts (Admin only) - List abandoned carts
 * POST /carts - Upsert an abandoned cart (Public/Customer)
 * PATCH /carts/:id - Update cart status (Admin only)
 */

require_once __DIR__ . '/../helpers/ResponseHelper.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Logger.php';
require_once __DIR__ . '/../helpers/ValidationHelper.php';

list($pdo, $conn) = remquip_require_db();

if ($method === 'POST') {
    // Collect cart data
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Validate required fields
    if (empty($data['email'])) {
        ResponseHelper::sendError('Email is required', 400);
    }
    
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        ResponseHelper::sendError('Invalid email format', 400);
    }
    
    $cartData = $data['cart_data'] ?? [];
    $cartJson = json_encode($cartData);
    
    try {
        if ($pdo) {
            // Check if there's an existing active 'abandoned' cart for this email
            $stmt = $pdo->prepare("SELECT id FROM abandoned_carts WHERE email = :email AND status = 'abandoned' ORDER BY created_at DESC LIMIT 1");
            $stmt->execute(['email' => $email]);
            $existingCart = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingCart) {
                // Update existing
                $updateStmt = $pdo->prepare("UPDATE abandoned_carts SET cart_data = :cart_data, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
                $updateStmt->execute([
                    'cart_data' => $cartJson,
                    'id' => $existingCart['id']
                ]);
                $cartId = $existingCart['id'];
            } else {
                // Insert new
                $insertStmt = $pdo->prepare("INSERT INTO abandoned_carts (email, cart_data, status) VALUES (:email, :cart_data, 'abandoned')");
                $insertStmt->execute([
                    'email' => $email,
                    'cart_data' => $cartJson
                ]);
                $cartId = $pdo->lastInsertId();
            }
        } else {
            // MySQLi implementation
            $emailEscaped = $conn->real_escape_string($email);
            $cartEscaped = $conn->real_escape_string($cartJson);
            
            $result = $conn->query("SELECT id FROM abandoned_carts WHERE email = '$emailEscaped' AND status = 'abandoned' ORDER BY created_at DESC LIMIT 1");
            
            if ($result && $result->num_rows > 0) {
                $row = $result->fetch_assoc();
                $cartId = $row['id'];
                $conn->query("UPDATE abandoned_carts SET cart_data = '$cartEscaped', updated_at = CURRENT_TIMESTAMP WHERE id = $cartId");
            } else {
                $conn->query("INSERT INTO abandoned_carts (email, cart_data, status) VALUES ('$emailEscaped', '$cartEscaped', 'abandoned')");
                $cartId = $conn->insert_id;
            }
        }
        
        ResponseHelper::sendSuccess(['id' => $cartId, 'status' => 'tracked'], 'Cart sequence tracked');
    } catch (Exception $e) {
        Logger::error('Failed to track abandoned cart', ['error' => $e->getMessage()]);
        // Fail silently so it doesn't break checkout flow
        ResponseHelper::sendSuccess(['status' => 'ignored'], 'Tracked ignored');
    }
}

// ==========================================
// ADMIN ROUTES BELOW
// ==========================================

$user = Auth::requireAuth('admin');

if ($method === 'GET') {
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 50;
    $offset = ($page - 1) * $limit;
    $status = $_GET['status'] ?? '';
    
    try {
        if ($pdo) {
            $query = "SELECT * FROM abandoned_carts";
            $params = [];
            
            if (!empty($status)) {
                $query .= " WHERE status = :status";
                $params['status'] = $status;
            }
            
            // Count total
            $countQuery = str_replace("SELECT *", "SELECT COUNT(*)", $query);
            $countStmt = $pdo->prepare($countQuery);
            $countStmt->execute($params);
            $total = (int)$countStmt->fetchColumn();
            
            // Get data
            $query .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
            $stmt = $pdo->prepare($query);
            foreach ($params as $key => $val) {
                $stmt->bindValue(":$key", $val);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $carts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Decode JSON
            foreach ($carts as &$cart) {
                $cart['cart_data'] = json_decode($cart['cart_data'], true);
            }
        } else {
            // MySQLi implementation
            $whereClause = "";
            if (!empty($status)) {
                $statusEscaped = $conn->real_escape_string($status);
                $whereClause = "WHERE status = '$statusEscaped'";
            }
            
            $countResult = $conn->query("SELECT COUNT(*) as total FROM abandoned_carts $whereClause");
            $total = (int)$countResult->fetch_assoc()['total'];
            
            $carts = [];
            $result = $conn->query("SELECT * FROM abandoned_carts $whereClause ORDER BY created_at DESC LIMIT $limit OFFSET $offset");
            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    $row['cart_data'] = json_decode($row['cart_data'], true);
                    $carts[] = $row;
                }
            }
        }
        
        ResponseHelper::sendSuccess([
            'data' => $carts,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ]
        ]);
        
    } catch (Exception $e) {
        Logger::error('Failed to fetch abandoned carts', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to fetch abandoned carts', 500);
    }
}

if ($method === 'PATCH' && $id) {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $newStatus = $data['status'] ?? '';
    
    if (!in_array($newStatus, ['abandoned', 'recovered', 'completed'])) {
        ResponseHelper::sendError('Invalid status', 400);
    }
    
    try {
        if ($pdo) {
            $stmt = $pdo->prepare("UPDATE abandoned_carts SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $stmt->execute(['status' => $newStatus, 'id' => $id]);
        } else {
            $statusEscaped = $conn->real_escape_string($newStatus);
            $idEscaped = (int)$id;
            $conn->query("UPDATE abandoned_carts SET status = '$statusEscaped', updated_at = CURRENT_TIMESTAMP WHERE id = $idEscaped");
        }
        
        ResponseHelper::sendSuccess(null, 'Cart status updated');
    } catch (Exception $e) {
        Logger::error('Failed to update cart status', ['error' => $e->getMessage(), 'id' => $id]);
        ResponseHelper::sendError('Failed to update status', 500);
    }
}

ResponseHelper::sendError('Method not allowed', 405);
