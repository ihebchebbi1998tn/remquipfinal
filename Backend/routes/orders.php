<?php
/**
 * ORDERS ROUTES - Order management
 */

$method = $_SERVER['REQUEST_METHOD'];

// GET /orders - List orders (Admin)
if ($method === 'GET' && !$id) {
    Auth::requireAuth('admin');
    
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        
        $where = ['o.deleted_at IS NULL'];
        $params = [];
        
        if ($search) {
            $where[] = "(o.order_number LIKE :search OR c.company_name LIKE :search OR c.email LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        if ($status) {
            $where[] = "o.status = :status";
            $params['status'] = $status;
        }
        
        $whereClause = implode(' AND ', $where);
        
        $total = $conn->fetch(
            "SELECT COUNT(*) as total FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE $whereClause",
            $params
        )['total'] ?? 0;
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $orders = $conn->fetchAll(
            "SELECT o.id, o.order_number, c.company_name as customer, c.email, c.phone, 
                    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items,
                    o.total, o.status, o.payment_status, o.created_at as date
             FROM orders o
             LEFT JOIN customers c ON o.customer_id = c.id
             WHERE $whereClause
             ORDER BY o.created_at DESC
             LIMIT :limit OFFSET :offset",
            $params
        );
        
        ResponseHelper::sendPaginated($orders, $total, $limit, $offset, 'Orders retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get orders error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve orders', 500);
    }
}

// GET /orders/:id - Get order details
if ($method === 'GET' && $id && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $order = $conn->fetch(
            "SELECT o.*, c.company_name, c.email, c.phone
             FROM orders o
             LEFT JOIN customers c ON o.customer_id = c.id
             WHERE o.id = :id AND o.deleted_at IS NULL",
            ['id' => $id]
        );
        
        if (!$order) {
            ResponseHelper::sendError('Order not found', 404);
        }
        
        $items = $conn->fetchAll(
            "SELECT oi.id, oi.quantity, oi.unit_price, p.name, p.sku FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = :id",
            ['id' => $id]
        );
        
        $notes = $conn->fetchAll(
            "SELECT on.date, on.user, on.text FROM order_notes on
             WHERE on.order_id = :id ORDER BY on.date DESC",
            ['id' => $id]
        );
        
        $order['items'] = $items;
        $order['notes'] = $notes;
        
        ResponseHelper::sendSuccess($order, 'Order details retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get order error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve order', 500);
    }
}

// POST /orders - Create new order
if ($method === 'POST' && !$id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        // Validate required fields
        if (empty($data['customerId']) || empty($data['items']) || !is_array($data['items'])) {
            ResponseHelper::sendError('Invalid order data', 400);
        }
        
        // Calculate totals
        $subtotal = 0;
        foreach ($data['items'] as $item) {
            $subtotal += $item['quantity'] * $item['unitPrice'];
        }
        
        $tax = $subtotal * 0.14975;
        $shipping = isset($data['shipping']) ? $data['shipping'] : 0;
        $total = $subtotal + $tax + $shipping;
        
        // Create order
        $orderNumber = 'RMQ-' . date('YmdHis');
        
        $conn->execute(
            "INSERT INTO orders (customer_id, order_number, subtotal, tax, shipping, total, payment_status, status, shipping_address)
             VALUES (:customerId, :orderNumber, :subtotal, :tax, :shipping, :total, 'pending', 'pending', :shippingAddress)",
            [
                'customerId' => $data['customerId'],
                'orderNumber' => $orderNumber,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'shipping' => $shipping,
                'total' => $total,
                'shippingAddress' => json_encode($data['shippingAddress'] ?? [])
            ]
        );
        
        $orderId = $conn->lastInsertId();
        
        // Add order items
        foreach ($data['items'] as $item) {
            $conn->execute(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
                 VALUES (:orderId, :productId, :quantity, :unitPrice, :lineTotal)",
                [
                    'orderId' => $orderId,
                    'productId' => $item['productId'],
                    'quantity' => $item['quantity'],
                    'unitPrice' => $item['unitPrice'],
                    'lineTotal' => $item['quantity'] * $item['unitPrice']
                ]
            );
        }
        
        Logger::info('Order created', ['order_id' => $orderId, 'order_number' => $orderNumber]);
        ResponseHelper::sendSuccess(['id' => $orderId, 'orderNumber' => $orderNumber], 'Order created successfully', 201);
        
    } catch (Exception $e) {
        Logger::error('Create order error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create order', 500);
    }
}

// PATCH /orders/:id/status - Update order status (Admin)
if ($method === 'PATCH' && $id && $action === 'status') {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['status'])) {
            ResponseHelper::sendError('Status is required', 400);
        }
        
        $conn->execute(
            "UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id",
            ['status' => $data['status'], 'id' => $id]
        );
        
        Logger::info('Order status updated', ['order_id' => $id, 'status' => $data['status']]);
        ResponseHelper::sendSuccess(['id' => $id, 'status' => $data['status']], 'Order status updated');
        
    } catch (Exception $e) {
        Logger::error('Update order status error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update order status', 500);
    }
}

// PATCH /orders/:id/shipment - Update shipment info (Admin)
if ($method === 'PATCH' && $id && $action === 'shipment') {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['carrier']) || empty($data['trackingNumber'])) {
            ResponseHelper::sendError('Carrier and tracking number required', 400);
        }
        
        $conn->execute(
            "UPDATE orders SET status = 'shipped', updated_at = NOW() WHERE id = :id",
            ['id' => $id]
        );
        
        Logger::info('Shipment updated', ['order_id' => $id, 'carrier' => $data['carrier']]);
        ResponseHelper::sendSuccess(
            ['id' => $id, 'carrier' => $data['carrier'], 'trackingNumber' => $data['trackingNumber']],
            'Shipment information updated'
        );
        
    } catch (Exception $e) {
        Logger::error('Update shipment error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update shipment', 500);
    }
}

// POST /orders/:id/notes - Add order note (Admin)
if ($method === 'POST' && $id && $action === 'notes') {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['note'])) {
            ResponseHelper::sendError('Note content is required', 400);
        }
        
        $payload = Auth::verifyToken(Auth::getToken());
        
        $conn->execute(
            "INSERT INTO order_notes (order_id, user, text, date) VALUES (:orderId, :user, :text, NOW())",
            [
                'orderId' => $id,
                'user' => $payload['user_id'] ?? 'System',
                'text' => $data['note']
            ]
        );
        
        Logger::info('Order note added', ['order_id' => $id]);
        ResponseHelper::sendSuccess(['id' => $id], 'Note added to order');
        
    } catch (Exception $e) {
        Logger::error('Add order note error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to add note', 500);
    }
}
?>
