<?php
/**
 * /user/dashboard/* — customer portal (matches USER_DASHBOARD in api-endpoints.ts)
 * Links orders to customers where customers.email = users.email (B2B account match).
 */

$auth = Auth::requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$rs = $routeSegments ?? [];

$user = $conn->fetch(
    "SELECT id, email, full_name, role, phone, avatar_url, status, created_at FROM remquip_users WHERE id = :id AND deleted_at IS NULL",
    ['id' => $auth['user_id']]
);
if (!$user) {
    ResponseHelper::sendError('User not found', 404);
}

$customer = $conn->fetch(
    "SELECT * FROM remquip_customers WHERE email = :email AND deleted_at IS NULL LIMIT 1",
    ['email' => $user['email']]
);

try {
    // GET /user/dashboard/profile
    if ($method === 'GET' && ($rs[0] ?? '') === 'dashboard' && ($rs[1] ?? '') === 'profile' && !isset($rs[2])) {
        ResponseHelper::sendSuccess(array_merge($user, ['customer' => $customer]), 'Profile');
    }

    // GET /user/dashboard/orders
    if ($method === 'GET' && ($rs[0] ?? '') === 'dashboard' && ($rs[1] ?? '') === 'orders' && !isset($rs[2])) {
        if (!$customer) {
            ResponseHelper::sendPaginated([], 0, 20, 0, 'No linked customer record for your email');
        }
        $limit = min((int)($_GET['limit'] ?? 20), 100);
        $offset = (int)($_GET['offset'] ?? 0);
        if (isset($_GET['page'])) {
            $offset = (max(1, (int)$_GET['page']) - 1) * $limit;
        }
        $total = (int)($conn->fetch(
            "SELECT COUNT(*) as t FROM remquip_orders WHERE customer_id = :cid AND deleted_at IS NULL",
            ['cid' => $customer['id']]
        )['t'] ?? 0);
        $orders = $conn->fetchAll(
            "SELECT o.id, o.order_number, o.status, o.total, o.payment_status, o.created_at,
                    (SELECT COUNT(*) FROM remquip_order_items oi WHERE oi.order_id = o.id) AS items_count
             FROM remquip_orders o
             WHERE o.customer_id = :cid AND o.deleted_at IS NULL
             ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset",
            ['cid' => $customer['id'], 'limit' => $limit, 'offset' => $offset]
        );
        ResponseHelper::sendPaginated($orders, $total, $limit, $offset, 'Your orders');
    }

    // GET /user/dashboard/orders/summary
    if ($method === 'GET' && ($rs[0] ?? '') === 'dashboard' && ($rs[1] ?? '') === 'orders' && ($rs[2] ?? '') === 'summary') {
        if (!$customer) {
            ResponseHelper::sendSuccess(['orderCount' => 0, 'totalSpent' => 0], 'Summary');
        }
        $sum = $conn->fetch(
            "SELECT COUNT(*) as c, COALESCE(SUM(total), 0) as s FROM remquip_orders WHERE customer_id = :cid AND deleted_at IS NULL",
            ['cid' => $customer['id']]
        );
        ResponseHelper::sendSuccess([
            'orderCount' => (int)($sum['c'] ?? 0),
            'totalSpent' => (float)($sum['s'] ?? 0),
        ], 'Order summary');
    }

    // GET /user/dashboard/addresses
    if ($method === 'GET' && ($rs[0] ?? '') === 'dashboard' && ($rs[1] ?? '') === 'addresses' && !isset($rs[2])) {
        if (!$customer) {
            ResponseHelper::sendSuccess([], 'Addresses');
        }
        ResponseHelper::sendSuccess([
            [
                'type' => 'billing',
                'address' => $customer['address'] ?? '',
                'city' => $customer['city'] ?? '',
                'province' => $customer['province'] ?? '',
                'postal_code' => $customer['postal_code'] ?? '',
                'country' => $customer['country'] ?? '',
            ],
        ], 'Addresses');
    }

    // GET /user/dashboard/settings — merge `settings` keys portal_* + default toggles
    if ($method === 'GET' && ($rs[0] ?? '') === 'dashboard' && ($rs[1] ?? '') === 'settings' && !isset($rs[2])) {
        $emailNotif = true;
        try {
            $row = $conn->fetch(
                "SELECT setting_value FROM remquip_settings WHERE setting_key = 'portal_email_notifications_default' LIMIT 1"
            );
            if ($row && isset($row['setting_value'])) {
                $v = strtolower(trim((string)$row['setting_value']));
                $emailNotif = $v === '1' || $v === 'true' || $v === 'yes';
            }
        } catch (Exception $e) {
            // ignore
        }
        ResponseHelper::sendSuccess([
            'emailNotifications' => $emailNotif,
            'phone' => $user['phone'] ?? '',
        ], 'Settings');
    }

    // PUT /user/dashboard/settings
    if (($method === 'PUT' || $method === 'PATCH') && ($rs[0] ?? '') === 'dashboard' && ($rs[1] ?? '') === 'settings' && !isset($rs[2])) {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($data['phone'])) {
            $conn->execute(
                "UPDATE remquip_users SET phone = :phone, updated_at = NOW() WHERE id = :id",
                ['phone' => trim($data['phone']), 'id' => $auth['user_id']]
            );
        }
        ResponseHelper::sendSuccess([], 'Settings updated');
    }

    // GET /user/dashboard/contacts — same directory as admin-contacts/available (for api.getAdminContacts)
    if ($method === 'GET' && ($rs[0] ?? '') === 'dashboard' && ($rs[1] ?? '') === 'contacts' && !isset($rs[2])) {
        try {
            $rows = $conn->fetchAll(
                "SELECT id, name, email, phone, department, specialization, is_available, display_order AS sort_order, created_at, updated_at
                 FROM remquip_admin_contacts
                 WHERE is_available = 1
                 ORDER BY display_order ASC, name ASC"
            );

            // If this customer has an assigned owner, show them first in the portal list.
            $assignedId = $customer['assigned_contact_id'] ?? null;
            if ($assignedId) {
                usort($rows, function ($a, $b) use ($assignedId) {
                    if (($a['id'] ?? null) === $assignedId) return -1;
                    if (($b['id'] ?? null) === $assignedId) return 1;
                    return 0;
                });
            }
            ResponseHelper::sendSuccess(['items' => $rows], 'Contacts');
        } catch (Exception $e) {
            ResponseHelper::sendSuccess(['items' => []], 'Contacts');
        }
    }

    // GET /user/dashboard/notes — public (is_internal = 0) customer notes
    if ($method === 'GET' && ($rs[0] ?? '') === 'dashboard' && ($rs[1] ?? '') === 'notes' && !isset($rs[2])) {
        if (!$customer) {
            ResponseHelper::sendSuccess(['items' => []], 'Notes');
        }
        try {
            $limit = min((int)($_GET['limit'] ?? 20), 100);
            $offset = (int)($_GET['offset'] ?? 0);
            if (isset($_GET['page'])) {
                $offset = (max(1, (int)$_GET['page']) - 1) * $limit;
            }

            $total = (int)($conn->fetch(
                "SELECT COUNT(*) as t FROM remquip_customer_notes WHERE customer_id = :cid AND is_internal = 0",
                ['cid' => $customer['id']]
            )['t'] ?? 0);

            $rows = $conn->fetchAll(
                "SELECT id, note, is_internal, created_at
                 FROM remquip_customer_notes
                 WHERE customer_id = :cid AND is_internal = 0
                 ORDER BY created_at DESC
                 LIMIT :limit OFFSET :offset",
                ['cid' => $customer['id'], 'limit' => $limit, 'offset' => $offset]
            );

            ResponseHelper::sendPaginated($rows, $total, $limit, $offset, 'Notes');
        } catch (Exception $e) {
            Logger::error('User dashboard notes error', ['error' => $e->getMessage()]);
            ResponseHelper::sendError('Failed to retrieve notes', 500);
        }
    }
} catch (Exception $e) {
    Logger::error('User dashboard error', ['error' => $e->getMessage()]);
    ResponseHelper::sendError('User dashboard request failed', 500);
}

ResponseHelper::sendError('User endpoint not found', 404);
