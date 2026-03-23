<?php
/**
 * CUSTOMERS ROUTES - CRM functionality
 */

$method = $_SERVER['REQUEST_METHOD'];
// Some CRM endpoints must remain public (e.g. contact form lead capture).
$needsAdminAuth = !($method === 'POST' && $id === 'contact-leads');
if ($needsAdminAuth) {
    Auth::requireAuth('admin');
}

// GET /customers — list (also /customers/search?q=)
if ($method === 'GET' && (!$id || $id === 'search')) {
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
        $type = isset($_GET['type']) ? trim($_GET['type']) : '';
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        
        $where = ['c.deleted_at IS NULL'];
        $params = [];
        
        if ($search) {
            $where[] = "(c.company_name LIKE :search OR c.email LIKE :search OR c.contact_person LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        if ($type) {
            $where[] = "c.customer_type = :type";
            $params['type'] = $type;
        }
        
        if ($status) {
            $where[] = "c.status = :status";
            $params['status'] = $status;
        }
        
        $whereClause = implode(' AND ', $where);
        
        $total = $conn->fetch(
            "SELECT COUNT(*) as total FROM remquip_customers c WHERE $whereClause",
            $params
        )['total'] ?? 0;
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $customers = $conn->fetchAll(
            "SELECT c.id, c.company_name, c.contact_person, c.contact_person AS full_name,
                    c.email, c.phone, c.customer_type, c.status, c.total_orders, c.total_spent, c.created_at, c.updated_at
                    , c.assigned_contact_id
             FROM remquip_customers c
             WHERE $whereClause
             ORDER BY c.created_at DESC
             LIMIT :limit OFFSET :offset",
            $params
        );
        
        ResponseHelper::sendPaginated($customers, $total, $limit, $offset, 'Customers retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get customers error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve customers', 500);
    }
}

// POST /customers/contact-leads — public (Contact page lead capture)
if ($method === 'POST' && $id === 'contact-leads') {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim((string)($data['name'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $subject = trim((string)($data['subject'] ?? ''));
        $message = trim((string)($data['message'] ?? ''));
        $phone = trim((string)($data['phone'] ?? ''));

        if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
            ResponseHelper::sendError('Name, valid email, and message are required', 400);
        }

        // Pick an owner from admin-contacts based on subject/department-ish routing.
        $desired = $subject !== '' ? $subject : ($message !== '' ? substr($message, 0, 60) : '');
        $assignedId = null;
        if ($desired !== '') {
            $row = $conn->fetch(
                'SELECT id FROM remquip_admin_contacts
                 WHERE is_available = 1 AND (department = :d OR specialization = :d)
                 ORDER BY display_order ASC, name ASC
                 LIMIT 1',
                ['d' => $desired]
            );
            $assignedId = $row['id'] ?? null;

            if (!$assignedId) {
                $row = $conn->fetch(
                    'SELECT id FROM remquip_admin_contacts
                     WHERE is_available = 1 AND (department LIKE :d OR specialization LIKE :d)
                     ORDER BY display_order ASC, name ASC
                     LIMIT 1',
                    ['d' => '%' . $desired . '%']
                );
                $assignedId = $row['id'] ?? null;
            }
        }
        if (!$assignedId) {
            $row = $conn->fetch(
                'SELECT id FROM remquip_admin_contacts WHERE is_available = 1 ORDER BY display_order ASC, name ASC LIMIT 1'
            );
            $assignedId = $row['id'] ?? null;
        }

        // Create a lead as an inactive customer.
        $customerId = $conn->fetch('SELECT UUID() AS u')['u'];
        $companyName = trim((string)($data['companyName'] ?? ''));
        if ($companyName === '') {
            $companyName = $subject !== '' ? $subject : ('Lead - ' . $name);
        }

        $conn->execute(
            "INSERT INTO remquip_customers
              (id, company_name, contact_person, email, phone, customer_type, status, address, city, province, postal_code, country, tax_number, assigned_contact_id)
             VALUES
              (:id, :companyName, :contactPerson, :email, :phone, :type, 'inactive', :address, :city, :province, :postalCode, :country, :taxNumber, :assignedContactId)",
            [
                'id' => $customerId,
                'companyName' => $companyName,
                'contactPerson' => $name,
                'email' => $email,
                'phone' => $phone,
                'type' => $data['customerType'] ?? 'Wholesale',
                'address' => $data['address'] ?? '',
                'city' => $data['city'] ?? '',
                'province' => $data['province'] ?? ($data['state'] ?? ''),
                'postalCode' => $data['postalCode'] ?? ($data['postal_code'] ?? ''),
                'country' => $data['country'] ?? '',
                'taxNumber' => $data['taxNumber'] ?? ($data['tax_number'] ?? ''),
                'assignedContactId' => $assignedId,
            ]
        );

        // Internal note so the owner sees context immediately.
        $noteId = $conn->fetch('SELECT UUID() AS u')['u'];
        $noteText = "Public lead captured via Contact page.\n\nSubject: " . ($subject !== '' ? $subject : '(none)') .
            "\nFrom: " . $name . " <" . $email . ">" .
            ($phone !== '' ? "\nPhone: " . $phone : '') .
            "\n\nMessage:\n" . $message;

        $conn->execute(
            "INSERT INTO remquip_customer_notes (id, customer_id, user_id, note, is_internal)
             VALUES (:nid, :customerId, NULL, :note, 1)",
            [
                'nid' => $noteId,
                'customerId' => $customerId,
                'note' => $noteText,
            ]
        );

        ResponseHelper::sendSuccess(
            ['id' => $customerId, 'assigned_contact_id' => $assignedId],
            'Lead captured successfully',
            201
        );
    } catch (Exception $e) {
        Logger::error('Contact lead capture error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to capture lead', 500);
    }
}

// GET /customers/:id - Get customer details
if ($method === 'GET' && $id && !$action) {
    try {
        $customer = $conn->fetch(
            "SELECT * FROM remquip_customers WHERE id = :id AND deleted_at IS NULL",
            ['id' => $id]
        );
        
        if (!$customer) {
            ResponseHelper::sendError('Customer not found', 404);
        }
        
        $notes = $conn->fetchAll(
            "SELECT cn.id, cn.note, cn.is_internal, u.full_name as user, cn.created_at
             FROM remquip_customer_notes cn
             LEFT JOIN remquip_users u ON cn.user_id = u.id
             WHERE cn.customer_id = :id
             ORDER BY cn.created_at DESC",
            ['id' => $id]
        );
        
        $orders = $conn->fetchAll(
            "SELECT o.id, o.order_number, o.total, o.status, o.created_at
             FROM remquip_orders o
             WHERE o.customer_id = :id AND o.deleted_at IS NULL
             ORDER BY o.created_at DESC LIMIT 10",
            ['id' => $id]
        );
        
        $customer['notes'] = $notes;
        $customer['orders'] = $orders;
        
        ResponseHelper::sendSuccess($customer, 'Customer details retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get customer error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve customer', 500);
    }
}

// GET /customers/:id/orders — aligns with api.getCustomerOrders
if ($method === 'GET' && $id && $action === 'orders') {
    try {
        $orders = $conn->fetchAll(
            "SELECT o.id, o.order_number, o.customer_id, o.status, o.total, o.subtotal,
                    o.tax AS tax_amount, o.shipping AS shipping_amount, o.discount AS discount_amount,
                    o.payment_status, o.created_at AS order_date, o.created_at, o.updated_at
             FROM remquip_orders o
             WHERE o.customer_id = :cid AND o.deleted_at IS NULL
             ORDER BY o.created_at DESC",
            ['cid' => $id]
        );
        ResponseHelper::sendSuccess($orders, 'Customer orders');
    } catch (Exception $e) {
        Logger::error('Get customer orders error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve orders', 500);
    }
}

// GET /customers/:id/addresses — single billing row from customers.* (no separate address table)
if ($method === 'GET' && $id && $action === 'addresses') {
    try {
        $c = $conn->fetch(
            "SELECT id, address, city, province, postal_code, country, created_at FROM remquip_customers WHERE id = :id AND deleted_at IS NULL",
            ['id' => $id]
        );
        if (!$c) {
            ResponseHelper::sendError('Customer not found', 404);
        }
        $rows = [];
        if (($c['address'] ?? '') !== '' || ($c['city'] ?? '') !== '') {
            $rows[] = [
                'id' => $c['id'] . ':primary',
                'customer_id' => $c['id'],
                'address_line1' => $c['address'] ?? '',
                'address_line2' => '',
                'city' => $c['city'] ?? '',
                'state' => $c['province'] ?? '',
                'postal_code' => $c['postal_code'] ?? '',
                'country' => $c['country'] ?? '',
                'is_default' => true,
                'address_type' => 'billing',
                'created_at' => $c['created_at'],
            ];
        }
        ResponseHelper::sendSuccess($rows, 'Customer addresses');
    } catch (Exception $e) {
        Logger::error('Get customer addresses error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve addresses', 500);
    }
}

// POST /customers - Create customer (Admin)
if ($method === 'POST' && !$id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $contactPerson = $data['contactPerson'] ?? $data['contact_person'] ?? $data['full_name'] ?? '';
        $companyName = $data['companyName'] ?? $data['company_name'] ?? '';
        if ($companyName === '') {
            $companyName = $contactPerson !== '' ? $contactPerson : 'Web Customer';
        }
        if ($contactPerson === '' || empty($data['email'])) {
            ResponseHelper::sendError('Email and contact name are required', 400);
        }

        $customerId = $conn->fetch('SELECT UUID() AS u')['u'];
        $assignedContactId = $data['assigned_contact_id'] ?? $data['assignedContactId'] ?? null;
        if ($assignedContactId !== null && trim((string)$assignedContactId) === '') {
            $assignedContactId = null;
        }
        $conn->execute(
            "INSERT INTO remquip_customers
              (id, company_name, contact_person, email, phone, customer_type, address, city, province, postal_code, country, tax_number, assigned_contact_id)
             VALUES
              (:id, :companyName, :contactPerson, :email, :phone, :type, :address, :city, :province, :postalCode, :country, :taxNumber, :assignedContactId)",
            [
                'id' => $customerId,
                'companyName' => $companyName,
                'contactPerson' => $contactPerson,
                'email' => $data['email'],
                'phone' => $data['phone'] ?? '',
                'type' => $data['customerType'] ?? 'Wholesale',
                'address' => $data['address'] ?? '',
                'city' => $data['city'] ?? '',
                'province' => $data['province'] ?? '',
                'postalCode' => $data['postalCode'] ?? '',
                'country' => $data['country'] ?? '',
                'taxNumber' => $data['taxNumber'] ?? '',
                'assignedContactId' => $assignedContactId,
            ]
        );

        remquip_notify_new_customer($conn, $companyName, $data['email']);

        Logger::info('Customer created', ['customer_id' => $customerId]);
        ResponseHelper::sendSuccess(['id' => $customerId], 'Customer created successfully', 201);
        
    } catch (Exception $e) {
        Logger::error('Create customer error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create customer', 500);
    }
}

// PATCH/PUT /customers/:id - Update customer (Admin) — snake_case + camelCase
if (($method === 'PATCH' || $method === 'PUT') && $id && !$action) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['id' => $id];

        $company = $data['companyName'] ?? $data['company_name'] ?? null;
        if ($company !== null && $company !== '') {
            $updates[] = 'company_name = :company_name';
            $params['company_name'] = $company;
        }
        $contact = $data['contactPerson'] ?? $data['contact_person'] ?? $data['full_name'] ?? null;
        if ($contact !== null && $contact !== '') {
            $updates[] = 'contact_person = :contact_person';
            $params['contact_person'] = $contact;
        }
        if (isset($data['email']) && $data['email'] !== '') {
            $updates[] = 'email = :email';
            $params['email'] = trim($data['email']);
        }
        if (array_key_exists('phone', $data)) {
            $updates[] = 'phone = :phone';
            $params['phone'] = $data['phone'] ?? '';
        }
        $ctype = $data['customerType'] ?? $data['customer_type'] ?? null;
        if ($ctype !== null && $ctype !== '') {
            $updates[] = 'customer_type = :customer_type';
            $params['customer_type'] = $ctype;
        }
        if (isset($data['status'])) {
            $updates[] = 'status = :status';
            $params['status'] = $data['status'];
        }
        if (array_key_exists('address', $data)) {
            $updates[] = 'address = :address';
            $params['address'] = $data['address'] ?? '';
        }
        if (array_key_exists('city', $data)) {
            $updates[] = 'city = :city';
            $params['city'] = $data['city'] ?? '';
        }
        $prov = $data['province'] ?? $data['state'] ?? null;
        if ($prov !== null) {
            $updates[] = 'province = :province';
            $params['province'] = $prov;
        }
        $pc = $data['postalCode'] ?? $data['postal_code'] ?? null;
        if ($pc !== null) {
            $updates[] = 'postal_code = :postal_code';
            $params['postal_code'] = $pc;
        }
        if (array_key_exists('country', $data)) {
            $updates[] = 'country = :country';
            $params['country'] = $data['country'] ?? '';
        }
        $tax = $data['taxNumber'] ?? $data['tax_number'] ?? null;
        if ($tax !== null) {
            $updates[] = 'tax_number = :tax_number';
            $params['tax_number'] = $tax;
        }

        $assigned = $data['assigned_contact_id'] ?? $data['assignedContactId'] ?? null;
        if (array_key_exists('assigned_contact_id', $data) || array_key_exists('assignedContactId', $data)) {
            $updates[] = 'assigned_contact_id = :assigned_contact_id';
            $params['assigned_contact_id'] = $assigned !== null && trim((string)$assigned) !== '' ? $assigned : null;
        }

        if (isset($data['paymentTerms'])) {
            $updates[] = 'payment_terms = :paymentTerms';
            $params['paymentTerms'] = $data['paymentTerms'];
        }
        if (isset($data['creditLimit'])) {
            $updates[] = 'credit_limit = :creditLimit';
            $params['creditLimit'] = (float)$data['creditLimit'];
        }

        if (!$updates) {
            ResponseHelper::sendError('No fields to update', 400);
        }

        $updates[] = 'updated_at = NOW()';
        $conn->execute('UPDATE remquip_customers SET ' . implode(', ', $updates) . ' WHERE id = :id AND deleted_at IS NULL', $params);

        Logger::info('Customer updated', ['customer_id' => $id]);
        ResponseHelper::sendSuccess(['id' => $id], 'Customer updated successfully');
    } catch (Exception $e) {
        Logger::error('Update customer error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update customer', 500);
    }
}

// DELETE /customers/:id — soft delete (aligns with api.deleteCustomer)
if ($method === 'DELETE' && $id && !$action) {
    try {
        $conn->execute('UPDATE remquip_customers SET deleted_at = NOW(), updated_at = NOW() WHERE id = :id AND deleted_at IS NULL', ['id' => $id]);
        Logger::info('Customer deleted (soft)', ['customer_id' => $id]);
        ResponseHelper::sendSuccess(null, 'Customer deleted successfully');
    } catch (Exception $e) {
        Logger::error('Delete customer error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete customer', 500);
    }
}

// POST /customers/:id/notes - Add customer note (Admin)
if ($method === 'POST' && $id && $action === 'notes') {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['note'])) {
            ResponseHelper::sendError('Note content is required', 400);
        }
        
        $tok = Auth::getToken();
        $payload = $tok ? Auth::verifyToken($tok) : null;
        
        $noteId = $conn->fetch('SELECT UUID() AS u')['u'];
        $conn->execute(
            "INSERT INTO remquip_customer_notes (id, customer_id, user_id, note, is_internal) VALUES (:nid, :customerId, :userId, :note, :isInternal)",
            [
                'nid' => $noteId,
                'customerId' => $id,
                'userId' => $payload['user_id'] ?? null,
                'note' => $data['note'],
                'isInternal' => isset($data['isInternal']) ? (int)$data['isInternal'] : 1
            ]
        );
        
        Logger::info('Customer note added', ['customer_id' => $id]);
        ResponseHelper::sendSuccess(['id' => $id], 'Note added to customer');
        
    } catch (Exception $e) {
        Logger::error('Add customer note error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to add note', 500);
    }
}

// =====================================================================
// CRM TASKS (follow-ups / SLA)
// =====================================================================

// GET /customers/:id/tasks — list tasks for customer (Admin)
if ($method === 'GET' && $id && $action === 'tasks') {
    Auth::requireAuth('admin');
    try {
        $tasks = $conn->fetchAll(
            "SELECT
                t.id,
                t.title,
                t.due_at,
                t.status,
                t.assigned_to,
                ac.name AS assigned_contact_name,
                t.notes,
                t.created_at,
                t.updated_at
             FROM remquip_crm_tasks t
             LEFT JOIN remquip_admin_contacts ac ON ac.id = t.assigned_to
             WHERE t.customer_id = :customerId
             ORDER BY (t.due_at IS NULL) ASC, t.due_at ASC, t.created_at DESC",
            ['customerId' => $id]
        );
        ResponseHelper::sendSuccess($tasks, 'Customer tasks');
    } catch (Exception $e) {
        Logger::error('Get customer tasks error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve customer tasks', 500);
    }
}

// POST /customers/:id/tasks — create task (Admin)
if ($method === 'POST' && $id && $action === 'tasks') {
    Auth::requireAuth('admin');
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $title = trim((string)($data['title'] ?? ''));
        if ($title === '') {
            ResponseHelper::sendError('Task title is required', 400);
        }

        $dueAt = null;
        if (isset($data['due_at']) || isset($data['dueAt'])) {
            $raw = $data['due_at'] ?? $data['dueAt'];
            if ($raw !== null && trim((string)$raw) !== '') {
                // Let MySQL parse ISO-8601 / datetime strings.
                $dueAt = (string)$raw;
            }
        }

        $status = trim((string)($data['status'] ?? 'open'));
        if (!in_array($status, ['open', 'done', 'cancelled'], true)) {
            $status = 'open';
        }

        $assignedTo = $data['assigned_to'] ?? $data['assignedTo'] ?? null;
        if ($assignedTo !== null && trim((string)$assignedTo) === '') {
            $assignedTo = null;
        }

        $notes = isset($data['notes']) ? (string)$data['notes'] : null;

        $tok = Auth::getToken();
        $payload = $tok ? Auth::verifyToken($tok) : null;
        $createdBy = $payload['user_id'] ?? null;
        if (!is_string($createdBy) || trim((string)$createdBy) === '') {
            $createdBy = null;
        }

        $taskId = $conn->fetch('SELECT UUID() AS u')['u'];
        $conn->execute(
            "INSERT INTO remquip_crm_tasks
              (id, customer_id, title, due_at, status, assigned_to, created_by, notes)
             VALUES
              (:id, :customerId, :title, :dueAt, :status, :assignedTo, :createdBy, :notes)",
            [
                'id' => $taskId,
                'customerId' => $id,
                'title' => $title,
                'dueAt' => $dueAt,
                'status' => $status,
                'assignedTo' => $assignedTo,
                'createdBy' => $createdBy,
                'notes' => $notes,
            ]
        );

        ResponseHelper::sendSuccess(['id' => $taskId], 'Task created', 201);
    } catch (Exception $e) {
        Logger::error('Create customer task error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create task', 500);
    }
}

// PATCH/PUT /customers/tasks/:taskId — update task (Admin)
if (($method === 'PATCH' || $method === 'PUT') && $id === 'tasks' && $action) {
    Auth::requireAuth('admin');
    $taskId = (string)$action;
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['taskId' => $taskId];

        if (isset($data['title'])) {
            $title = trim((string)$data['title']);
            if ($title !== '') {
                $updates[] = 'title = :title';
                $params['title'] = $title;
            }
        }

        if (array_key_exists('status', $data)) {
            $status = trim((string)$data['status']);
            if (in_array($status, ['open', 'done', 'cancelled'], true)) {
                $updates[] = 'status = :status';
                $params['status'] = $status;
            }
        }

        if (array_key_exists('due_at', $data) || array_key_exists('dueAt', $data)) {
            $raw = $data['due_at'] ?? $data['dueAt'];
            if ($raw === null || trim((string)$raw) === '') {
                $updates[] = 'due_at = NULL';
            } else {
                $updates[] = 'due_at = :dueAt';
                $params['dueAt'] = (string)$raw;
            }
        }

        if (array_key_exists('assigned_to', $data) || array_key_exists('assignedTo', $data)) {
            $assignedTo = $data['assigned_to'] ?? $data['assignedTo'];
            if ($assignedTo === null || trim((string)$assignedTo) === '') {
                $updates[] = 'assigned_to = NULL';
            } else {
                $updates[] = 'assigned_to = :assignedTo';
                $params['assignedTo'] = $assignedTo;
            }
        }

        if (array_key_exists('notes', $data)) {
            $updates[] = 'notes = :notes';
            $params['notes'] = $data['notes'] !== null ? (string)$data['notes'] : null;
        }

        if (!$updates) {
            ResponseHelper::sendError('No fields to update', 400);
        }

        $updates[] = 'updated_at = NOW()';

        $conn->execute('UPDATE remquip_crm_tasks SET ' . implode(', ', $updates) . ' WHERE id = :taskId', $params);
        ResponseHelper::sendSuccess(['id' => $taskId], 'Task updated');
    } catch (Exception $e) {
        Logger::error('Update task error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update task', 500);
    }
}

// DELETE /customers/tasks/:taskId — delete task (Admin)
if ($method === 'DELETE' && $id === 'tasks' && $action) {
    Auth::requireAuth('admin');
    $taskId = (string)$action;
    try {
        $conn->execute('DELETE FROM remquip_crm_tasks WHERE id = :taskId', ['taskId' => $taskId]);
        ResponseHelper::sendSuccess(null, 'Task deleted');
    } catch (Exception $e) {
        Logger::error('Delete task error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete task', 500);
    }
}

// =====================================================================
// POST /customers/import - Bulk import CRM contacts (Admin only)
// =====================================================================
if ($method === 'POST' && $id === 'import' && !$action) {
    Auth::requireAuth('admin');
    
    try {
        // Check if file upload
        if (!empty($_FILES['file'])) {
            $file = $_FILES['file'];
            
            if ($file['error'] !== UPLOAD_ERR_OK) {
                ResponseHelper::sendError('File upload error', 400);
            }
            
            if ($file['size'] > 5 * 1024 * 1024) { // 5MB limit
                ResponseHelper::sendError('File size exceeds 5MB limit', 400);
            }
            
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['csv', 'json'])) {
                ResponseHelper::sendError('Only CSV and JSON files supported', 400);
            }
            
            $fileContent = file_get_contents($file['tmp_name']);
            
            if ($ext === 'json') {
                $data = json_decode($fileContent, true);
                if (!is_array($data)) {
                    ResponseHelper::sendError('Invalid JSON format', 400);
                }
                $customers = $data;
            } else {
                // Parse CSV
                $lines = explode("\n", $fileContent);
                $header = str_getcsv(array_shift($lines));
                $customers = [];
                foreach ($lines as $line) {
                    if (trim($line)) {
                        $values = str_getcsv($line);
                        $customers[] = array_combine($header, $values);
                    }
                }
            }
        } else {
            // JSON body
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            $customers = $data['customers'] ?? [];
        }
        
        if (empty($customers)) {
            ResponseHelper::sendError('No customers to import', 400);
        }
        
        $imported = 0;
        $errors = [];
        
        foreach ($customers as $index => $customer) {
            try {
                // Validate required fields
                if (empty($customer['company_name']) || empty($customer['email'])) {
                    $errors[] = "Row $index: Missing company_name or email";
                    continue;
                }
                
                // Check if customer already exists by email
                $existing = $conn->fetch(
                    "SELECT id FROM remquip_customers WHERE email = :email",
                    ['email' => $customer['email']]
                );
                
                if ($existing) {
                    $errors[] = "Row $index: Email {$customer['email']} already exists";
                    continue;
                }

                $ctype = $customer['customer_type'] ?? 'Wholesale';
                if (!in_array($ctype, ['Fleet', 'Wholesale', 'Distributor'], true)) {
                    $ctype = 'Wholesale';
                }
                $cstatus = $customer['status'] ?? 'active';
                if (!in_array($cstatus, ['active', 'inactive', 'suspended'], true)) {
                    $cstatus = 'active';
                }
                $addr = $customer['address'] ?? $customer['billing_address'] ?? '';

                $customerId = $conn->fetch('SELECT UUID() AS u')['u'];
                $conn->execute(
                    "INSERT INTO remquip_customers (id, company_name, contact_person, email, phone, customer_type, status, address, city, province, postal_code, country)
                     VALUES (:id, :company, :contact, :email, :phone, :type, :status, :address, :city, :province, :pc, :country)",
                    [
                        'id' => $customerId,
                        'company' => $customer['company_name'],
                        'contact' => $customer['contact_person'] ?? $customer['contact'] ?? '',
                        'email' => $customer['email'],
                        'phone' => $customer['phone'] ?? '',
                        'type' => $ctype,
                        'status' => $cstatus,
                        'address' => $addr,
                        'city' => $customer['city'] ?? '',
                        'province' => $customer['province'] ?? $customer['state'] ?? '',
                        'pc' => $customer['postal_code'] ?? '',
                        'country' => $customer['country'] ?? '',
                    ]
                );

                if (!empty($customer['notes'])) {
                    $nid = $conn->fetch('SELECT UUID() AS u')['u'];
                    $conn->execute(
                        "INSERT INTO remquip_customer_notes (id, customer_id, note, is_internal) VALUES (:id, :customerId, :note, 1)",
                        ['id' => $nid, 'customerId' => $customerId, 'note' => $customer['notes']]
                    );
                }
                
                $imported++;
                Logger::info('Customer imported', ['customer_id' => $customerId, 'email' => $customer['email']]);
                
            } catch (Exception $e) {
                $errors[] = "Row $index: " . $e->getMessage();
            }
        }
        
        ResponseHelper::sendSuccess(
            ['imported' => $imported, 'total' => count($customers), 'errors' => $errors],
            "Imported $imported customers",
            201
        );
        
    } catch (Exception $e) {
        Logger::error('Customer import error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to import customers: ' . $e->getMessage(), 500);
    }
}
?>
