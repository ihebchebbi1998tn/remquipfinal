<?php
/**
 * INVENTORY ROUTES - Stock management
 */

$method = $_SERVER['REQUEST_METHOD'];
Auth::requireAuth('admin');

// GET /inventory - List inventory (Admin)
if ($method === 'GET' && !$id) {
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $lowStock = isset($_GET['lowStock']) ? $_GET['lowStock'] === 'true' : false;
        
        $where = ['p.deleted_at IS NULL'];
        $params = [];
        
        if ($search) {
            $where[] = "(p.sku LIKE :search OR p.name LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        if ($lowStock) {
            $where[] = "inv.quantity_available <= inv.reorder_level";
        }
        
        $whereClause = implode(' AND ', $where);
        
        $total = $conn->fetch(
            "SELECT COUNT(*) as total FROM inventory inv LEFT JOIN products p ON inv.product_id = p.id WHERE $whereClause",
            $params
        )['total'] ?? 0;
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $inventory = $conn->fetchAll(
            "SELECT p.id as productId, p.sku, p.name,
                    inv.quantity_on_hand as onHand, inv.quantity_reserved as reserved,
                    inv.quantity_available as available, inv.reorder_level, inv.reorder_quantity,
                    inv.warehouse_location
             FROM inventory inv
             LEFT JOIN products p ON inv.product_id = p.id
             WHERE $whereClause
             ORDER BY inv.quantity_available ASC
             LIMIT :limit OFFSET :offset",
            $params
        );
        
        ResponseHelper::sendPaginated($inventory, $total, $limit, $offset, 'Inventory retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get inventory error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve inventory', 500);
    }
}

// PATCH /inventory/:id - Adjust stock (Admin)
if ($method === 'PATCH' && $id && !$action) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (!isset($data['quantityOnHand'])) {
            ResponseHelper::sendError('Quantity is required', 400);
        }
        
        $oldInventory = $conn->fetch(
            "SELECT quantity_on_hand FROM inventory WHERE product_id = :id",
            ['id' => $id]
        );
        
        if (!$oldInventory) {
            ResponseHelper::sendError('Inventory record not found', 404);
        }
        
        $quantityChange = $data['quantityOnHand'] - $oldInventory['quantity_on_hand'];
        
        $conn->execute(
            "UPDATE inventory SET quantity_on_hand = :qty, warehouse_location = :location, updated_at = NOW() WHERE product_id = :id",
            [
                'qty' => $data['quantityOnHand'],
                'location' => $data['warehouseLocation'] ?? '',
                'id' => $id
            ]
        );
        
        // Log the change
        $payload = Auth::verifyToken(Auth::getToken());
        $conn->execute(
            "INSERT INTO inventory_logs (product_id, user_id, action, quantity_change, reason, old_quantity, new_quantity)
             VALUES (:productId, :userId, :action, :change, :reason, :oldQty, :newQty)",
            [
                'productId' => $id,
                'userId' => $payload['user_id'] ?? null,
                'action' => 'adjustment',
                'change' => $quantityChange,
                'reason' => $data['reason'] ?? 'Manual adjustment',
                'oldQty' => $oldInventory['quantity_on_hand'],
                'newQty' => $data['quantityOnHand']
            ]
        );
        
        Logger::info('Inventory adjusted', ['product_id' => $id, 'change' => $quantityChange]);
        ResponseHelper::sendSuccess(['id' => $id, 'quantityOnHand' => $data['quantityOnHand']], 'Inventory updated');
        
    } catch (Exception $e) {
        Logger::error('Update inventory error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update inventory', 500);
    }
}

// GET /inventory/:id/logs - Get inventory change history
if ($method === 'GET' && $id && $action === 'logs') {
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        
        $total = $conn->fetch(
            "SELECT COUNT(*) as total FROM inventory_logs WHERE product_id = :id",
            ['id' => $id]
        )['total'] ?? 0;
        
        $logs = $conn->fetchAll(
            "SELECT il.*, u.full_name as user
             FROM inventory_logs il
             LEFT JOIN users u ON il.user_id = u.id
             WHERE il.product_id = :id
             ORDER BY il.created_at DESC
             LIMIT :limit OFFSET :offset",
            ['id' => $id, 'limit' => $limit, 'offset' => $offset]
        );
        
        ResponseHelper::sendPaginated($logs, $total, $limit, $offset, 'Inventory logs retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get inventory logs error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve logs', 500);
    }
}
?>
