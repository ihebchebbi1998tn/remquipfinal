<?php
/**
 * DISCOUNTS ROUTES - Promotion codes
 */

$method = $_SERVER['REQUEST_METHOD'];

// GET /discounts - List discounts (Admin)
if ($method === 'GET' && !$id) {
    Auth::requireAuth('admin');
    
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $active = isset($_GET['active']) ? $_GET['active'] === 'true' : true;
        
        $where = [];
        $params = [];
        
        if ($active) {
            $where[] = "is_active = 1";
            $where[] = "(valid_from IS NULL OR valid_from <= NOW())";
            $where[] = "(valid_until IS NULL OR valid_until >= NOW())";
        }
        
        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        
        $total = $conn->fetch(
            "SELECT COUNT(*) as total FROM discounts $whereClause",
            $params
        )['total'] ?? 0;
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $discounts = $conn->fetchAll(
            "SELECT id, code, description, discount_type, discount_value, min_order_value, 
                    max_uses, uses_count, is_active, valid_from, valid_until
             FROM discounts $whereClause
             ORDER BY created_at DESC
             LIMIT :limit OFFSET :offset",
            $params
        );
        
        ResponseHelper::sendPaginated($discounts, $total, $limit, $offset, 'Discounts retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get discounts error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve discounts', 500);
    }
}

// GET /discounts/:code/validate - Validate discount code (public)
if ($method === 'GET' && $id && $action === 'validate') {
    try {
        $discount = $conn->fetch(
            "SELECT id, code, discount_type, discount_value, min_order_value, max_uses, uses_count
             FROM discounts 
             WHERE code = :code AND is_active = 1 
             AND (valid_from IS NULL OR valid_from <= NOW())
             AND (valid_until IS NULL OR valid_until >= NOW())
             AND (max_uses IS NULL OR uses_count < max_uses)",
            ['code' => strtoupper($id)]
        );
        
        if (!$discount) {
            ResponseHelper::sendError('Invalid or expired discount code', 404);
        }
        
        ResponseHelper::sendSuccess($discount, 'Discount code is valid');
        
    } catch (Exception $e) {
        Logger::error('Validate discount error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to validate discount', 500);
    }
}

// POST /discounts - Create discount (Admin)
if ($method === 'POST' && !$id) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['code']) || empty($data['discountType']) || !isset($data['discountValue'])) {
            ResponseHelper::sendError('Missing required fields', 400);
        }
        
        $code = strtoupper($data['code']);
        
        // Check if code exists
        $existing = $conn->fetch("SELECT id FROM discounts WHERE code = :code", ['code' => $code]);
        if ($existing) {
            ResponseHelper::sendError('Discount code already exists', 409);
        }
        
        $conn->execute(
            "INSERT INTO discounts (code, description, discount_type, discount_value, min_order_value, max_uses, valid_from, valid_until, is_active)
             VALUES (:code, :description, :type, :value, :minOrder, :maxUses, :validFrom, :validUntil, 1)",
            [
                'code' => $code,
                'description' => $data['description'] ?? '',
                'type' => $data['discountType'],
                'value' => (float)$data['discountValue'],
                'minOrder' => isset($data['minOrderValue']) ? (float)$data['minOrderValue'] : 0,
                'maxUses' => $data['maxUses'] ?? null,
                'validFrom' => $data['validFrom'] ?? null,
                'validUntil' => $data['validUntil'] ?? null
            ]
        );
        
        $discountId = $conn->lastInsertId();
        
        Logger::info('Discount created', ['discount_id' => $discountId, 'code' => $code]);
        ResponseHelper::sendSuccess(['id' => $discountId], 'Discount created successfully', 201);
        
    } catch (Exception $e) {
        Logger::error('Create discount error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create discount', 500);
    }
}

// PATCH /discounts/:id - Update discount (Admin)
if ($method === 'PATCH' && $id && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['id' => $id];
        
        if (isset($data['discountValue'])) {
            $updates[] = "discount_value = :value";
            $params['value'] = (float)$data['discountValue'];
        }
        
        if (isset($data['status'])) {
            $updates[] = "is_active = :isActive";
            $params['isActive'] = $data['status'] === 'active' ? 1 : 0;
        }
        
        if (isset($data['validUntil'])) {
            $updates[] = "valid_until = :validUntil";
            $params['validUntil'] = $data['validUntil'];
        }
        
        if (!$updates) ResponseHelper::sendError('No fields to update', 400);
        
        $updates[] = "updated_at = NOW()";
        $conn->execute("UPDATE discounts SET " . implode(', ', $updates) . " WHERE id = :id", $params);
        
        Logger::info('Discount updated', ['discount_id' => $id]);
        ResponseHelper::sendSuccess(['id' => $id], 'Discount updated successfully');
        
    } catch (Exception $e) {
        Logger::error('Update discount error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update discount', 500);
    }
}

// DELETE /discounts/:id - Delete discount (Admin)
if ($method === 'DELETE' && $id && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $conn->execute("DELETE FROM discounts WHERE id = :id", ['id' => $id]);
        Logger::info('Discount deleted', ['discount_id' => $id]);
        ResponseHelper::sendSuccess(null, 'Discount deleted successfully');
        
    } catch (Exception $e) {
        Logger::error('Delete discount error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete discount', 500);
    }
}
?>
