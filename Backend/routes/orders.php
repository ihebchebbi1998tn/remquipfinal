<?php
/**
 * ORDERS ROUTES - Order management
 */

$method = $_SERVER['REQUEST_METHOD'];

// GET /orders — list (also GET /orders/search?q= for frontend api.searchOrders)
if ($method === 'GET' && (!$id || $id === 'search')) {
    Auth::requireAuth('admin');
    
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        if (isset($_GET['page'])) {
            $offset = (max(1, (int)$_GET['page']) - 1) * $limit;
        }
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        if ($id === 'search') {
            $search = trim($_GET['q'] ?? $_GET['search'] ?? '');
        }
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
            "SELECT COUNT(*) as total FROM remquip_orders o LEFT JOIN remquip_customers c ON o.customer_id = c.id WHERE $whereClause",
            $params
        )['total'] ?? 0;
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $orders = $conn->fetchAll(
            "SELECT o.id, o.order_number, o.customer_id,
                    c.company_name as customer, c.email as customer_email, c.phone,
                    (SELECT COUNT(*) FROM remquip_order_items WHERE order_id = o.id) as items,
                    o.total, o.total as total_amount, o.status, o.payment_status,
                    o.payment_method, o.stripe_payment_intent_id, o.paid_at,
                    o.created_at, o.created_at as order_date, o.created_at as date
             FROM remquip_orders o
             LEFT JOIN remquip_customers c ON o.customer_id = c.id
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
            "SELECT o.*, o.stripe_session_id, o.stripe_payment_intent_id, o.payment_method, o.paid_at,
                    c.company_name, c.email, c.phone
             FROM remquip_orders o
             LEFT JOIN remquip_customers c ON o.customer_id = c.id
             WHERE o.id = :id AND o.deleted_at IS NULL",
            ['id' => $id]
        );
        
        if (!$order) {
            ResponseHelper::sendError('Order not found', 404);
        }
        
        $items = $conn->fetchAll(
            "SELECT oi.id, oi.quantity, oi.unit_price, p.name, p.sku FROM remquip_order_items oi
             LEFT JOIN remquip_products p ON oi.product_id = p.id
             WHERE oi.order_id = :id",
            ['id' => $id]
        );
        
        $notes = $conn->fetchAll(
            "SELECT n.`date`, n.`user`, n.`text` FROM remquip_order_notes n
             WHERE n.order_id = :id ORDER BY n.date DESC",
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

// GET /orders/:id/notes — notes only (Admin); matches api.getOrderNotes / ORDERS.GET_NOTES
if ($method === 'GET' && $id && $action === 'notes') {
    Auth::requireAuth('admin');

    try {
        $exists = $conn->fetch(
            'SELECT id FROM remquip_orders WHERE id = :id AND deleted_at IS NULL',
            ['id' => $id]
        );
        if (!$exists) {
            ResponseHelper::sendError('Order not found', 404);
        }

        $notes = $conn->fetchAll(
            "SELECT n.`date`, n.`user`, n.`text` FROM remquip_order_notes n
             WHERE n.order_id = :id ORDER BY n.date DESC",
            ['id' => $id]
        );

        ResponseHelper::sendSuccess($notes, 'Order notes retrieved');
    } catch (Exception $e) {
        Logger::error('Get order notes error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve order notes', 500);
    }
}

// PATCH/PUT /orders/:id - Partial update (Admin) — aligns with frontend api.updateOrder (PUT)
if (($method === 'PATCH' || $method === 'PUT') && $id && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['id' => $id];
        
        if (isset($data['status'])) {
            $updates[] = 'status = :status';
            $params['status'] = $data['status'];
        }
        if (isset($data['payment_status'])) {
            $updates[] = 'payment_status = :payment_status';
            $params['payment_status'] = $data['payment_status'];
        }
        if (isset($data['subtotal'])) {
            $updates[] = 'subtotal = :subtotal';
            $params['subtotal'] = (float)$data['subtotal'];
        }
        if (isset($data['tax'])) {
            $updates[] = 'tax = :tax';
            $params['tax'] = (float)$data['tax'];
        }
        if (isset($data['shipping'])) {
            $updates[] = 'shipping = :shipping';
            $params['shipping'] = (float)$data['shipping'];
        }
        if (isset($data['total'])) {
            $updates[] = 'total = :total';
            $params['total'] = (float)$data['total'];
        }
        if (isset($data['shippingAddress'])) {
            $updates[] = 'shipping_address = :shipping_address';
            $params['shipping_address'] = is_string($data['shippingAddress'])
                ? $data['shippingAddress']
                : json_encode($data['shippingAddress']);
        }
        
        if (!$updates) {
            ResponseHelper::sendError('No fields to update', 400);
        }

        $prevStatus = null;
        if (isset($data['status'])) {
            $prevRow = $conn->fetch(
                'SELECT status FROM remquip_orders WHERE id = :id AND deleted_at IS NULL',
                ['id' => $id]
            );
            $prevStatus = $prevRow['status'] ?? null;
        }
        
        $updates[] = 'updated_at = NOW()';
        $conn->execute('UPDATE remquip_orders SET ' . implode(', ', $updates) . ' WHERE id = :id AND deleted_at IS NULL', $params);

        if (isset($data['status']) && $prevStatus !== null) {
            remquip_notify_order_status_changed($conn, $id, (string)$prevStatus, (string)$data['status']);
        }
        
        Logger::info('Order updated', ['order_id' => $id]);
        ResponseHelper::sendSuccess(['id' => $id], 'Order updated successfully');
        
    } catch (Exception $e) {
        Logger::error('Update order error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update order', 500);
    }
}

// POST /orders - Create order (guest checkout: customer_email + billing_address, or customerId)
if ($method === 'POST' && !$id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $rawItems = $data['items'] ?? [];
        if (!is_array($rawItems) || empty($rawItems)) {
            ResponseHelper::sendError('Invalid order data: items required', 400);
        }

        $items = [];
        foreach ($rawItems as $item) {
            $pid = $item['productId'] ?? $item['product_id'] ?? null;
            $qty = (int)($item['quantity'] ?? 0);
            $up = (float)($item['unitPrice'] ?? $item['unit_price'] ?? 0);
            if (!$pid || $qty < 1 || $up < 0) {
                continue;
            }
            $items[] = ['productId' => $pid, 'quantity' => $qty, 'unitPrice' => $up];
        }
        if (empty($items)) {
            ResponseHelper::sendError('Invalid order data: no valid line items', 400);
        }

        $email = '';
        $customerId = $data['customerId'] ?? $data['customer_id'] ?? null;
        if (!$customerId) {
            $email = trim($data['customer_email'] ?? $data['email'] ?? '');
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                ResponseHelper::sendError('customer_email or customerId is required', 400);
            }
            $existing = $conn->fetch(
                'SELECT id FROM remquip_customers WHERE email = :e AND deleted_at IS NULL',
                ['e' => $email]
            );
            if ($existing) {
                $customerId = $existing['id'];
            } else {
                $ba = $data['billing_address'] ?? [];
                $company = trim($ba['company'] ?? '');
                if ($company === '') {
                    $company = 'Web Customer';
                }
                $contact = trim(($ba['first_name'] ?? '') . ' ' . ($ba['last_name'] ?? ''));
                if ($contact === '') {
                    $contact = 'Customer';
                }
                $customerId = $conn->fetch('SELECT UUID() AS u')['u'];
                $conn->execute(
                    "INSERT INTO remquip_customers (id, company_name, contact_person, email, phone, customer_type, status, address, city, province, postal_code, country)
                     VALUES (:id, :co, :cp, :em, :ph, 'Fleet', 'active', :ad, :ci, :pr, :pc, :cty)",
                    [
                        'id' => $customerId,
                        'co' => $company,
                        'cp' => $contact,
                        'em' => $email,
                        'ph' => $ba['phone'] ?? '',
                        'ad' => $ba['address_line1'] ?? '',
                        'ci' => $ba['city'] ?? '',
                        'pr' => $ba['state'] ?? '',
                        'pc' => $ba['postal_code'] ?? '',
                        'cty' => $ba['country'] ?? '',
                    ]
                );
            }
        }

        $subtotal = isset($data['subtotal']) ? (float)$data['subtotal'] : 0;
        if ($subtotal <= 0) {
            $subtotal = 0;
            foreach ($items as $item) {
                $subtotal += $item['quantity'] * $item['unitPrice'];
            }
        }
        $subtotal = round(max(0, $subtotal), 2);
        $rates = settings_storefront_rates($conn);
        $tot = compute_order_totals_from_subtotal($subtotal, $rates);
        $tax = $tot['tax'];
        $shipping = $tot['shipping'];
        $total = $tot['total'];

        $shipAddr = $data['shipping_address'] ?? $data['shippingAddress'] ?? [];
        $notes = $data['notes'] ?? null;

        $orderNumber = 'RMQ-' . date('YmdHis');

        $orderId = $conn->fetch('SELECT UUID() AS u')['u'];
        $conn->execute(
            "INSERT INTO remquip_orders (id, customer_id, order_number, subtotal, tax, shipping, total, payment_status, status, shipping_address, notes)
             VALUES (:id, :customerId, :orderNumber, :subtotal, :tax, :shipping, :total, 'pending', 'pending', :shippingAddress, :notes)",
            [
                'id' => $orderId,
                'customerId' => $customerId,
                'orderNumber' => $orderNumber,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'shipping' => $shipping,
                'total' => $total,
                'shippingAddress' => json_encode($shipAddr),
                'notes' => $notes,
            ]
        );

        foreach ($items as $item) {
            $lineId = $conn->fetch('SELECT UUID() AS u')['u'];
            $conn->execute(
                "INSERT INTO remquip_order_items (id, order_id, product_id, quantity, unit_price, line_total)
                 VALUES (:id, :orderId, :productId, :quantity, :unitPrice, :lineTotal)",
                [
                    'id' => $lineId,
                    'orderId' => $orderId,
                    'productId' => $item['productId'],
                    'quantity' => $item['quantity'],
                    'unitPrice' => $item['unitPrice'],
                    'lineTotal' => $item['quantity'] * $item['unitPrice'],
                ]
            );
        }

        Logger::info('Order created', ['order_id' => $orderId, 'order_number' => $orderNumber]);
        
        // Mark abandoned carts for this email as completed
        // $email may be empty when order was created via customerId — look it up
        if ($email === '') {
            try {
                $custRow = $conn->fetch('SELECT email FROM remquip_customers WHERE id = :id AND deleted_at IS NULL', ['id' => $customerId]);
                $email = $custRow['email'] ?? '';
            } catch (Exception $_) {}
        }
        if ($email !== '') {
            try {
                $conn->execute(
                    "UPDATE abandoned_carts SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE email = :email AND status = 'abandoned'",
                    ['email' => $email]
                );
            } catch (Exception $e) {
                Logger::error('Failed to mark cart as completed', ['error' => $e->getMessage()]);
            }
        }
        
        remquip_notify_new_order($conn, $orderId, $orderNumber, (string)$total);
        ResponseHelper::sendSuccess(['id' => $orderId, 'orderNumber' => $orderNumber], 'Order created successfully', 201);
    } catch (Exception $e) {
        Logger::error('Create order error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create order', 500);
    }
}

// PATCH/PUT /orders/:id/status - Update order status (Admin)
if (($method === 'PATCH' || $method === 'PUT') && $id && $action === 'status') {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['status'])) {
            ResponseHelper::sendError('Status is required', 400);
        }
        
        $prev = $conn->fetch('SELECT status FROM remquip_orders WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
        if (!$prev) {
            ResponseHelper::sendError('Order not found', 404);
        }
        $conn->execute(
            "UPDATE remquip_orders SET status = :status, updated_at = NOW() WHERE id = :id",
            ['status' => $data['status'], 'id' => $id]
        );

        remquip_notify_order_status_changed($conn, $id, (string)($prev['status'] ?? ''), (string)$data['status']);

        Logger::info('Order status updated', ['order_id' => $id, 'status' => $data['status']]);
        ResponseHelper::sendSuccess(['id' => $id, 'status' => $data['status']], 'Order status updated');
        
    } catch (Exception $e) {
        Logger::error('Update order status error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update order status', 500);
    }
}

// PATCH/PUT /orders/:id/shipment or /tracking (api-endpoints ORDERS.TRACKING)
if (($method === 'PATCH' || $method === 'PUT') && $id && ($action === 'shipment' || $action === 'tracking')) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['carrier']) || empty($data['trackingNumber'])) {
            ResponseHelper::sendError('Carrier and tracking number required', 400);
        }
        
        $conn->execute(
            "UPDATE remquip_orders SET status = 'shipped', updated_at = NOW() WHERE id = :id",
            ['id' => $id]
        );

        remquip_notify_order_shipped_to_customer($conn, $id, $data['carrier'], $data['trackingNumber']);

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
        
        $tok = Auth::getToken();
        $payload = $tok ? Auth::verifyToken($tok) : null;
        
        $noteId = $conn->fetch('SELECT UUID() AS u')['u'];
        $conn->execute(
            "INSERT INTO remquip_order_notes (id, order_id, `user`, `text`, `date`) VALUES (:nid, :orderId, :user, :text, NOW())",
            [
                'nid' => $noteId,
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

// DELETE /orders/:id — soft delete (Admin)
if ($method === 'DELETE' && $id && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $conn->execute('UPDATE remquip_orders SET deleted_at = NOW(), updated_at = NOW() WHERE id = :id', ['id' => $id]);
        Logger::info('Order soft-deleted', ['order_id' => $id]);
        ResponseHelper::sendSuccess(null, 'Order deleted successfully');
    } catch (Exception $e) {
        Logger::error('Delete order error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete order', 500);
    }
}

ResponseHelper::sendError('Order endpoint not found', 404);
?>
