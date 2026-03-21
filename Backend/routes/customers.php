<?php
/**
 * CUSTOMERS ROUTES - CRM functionality
 */

$method = $_SERVER['REQUEST_METHOD'];
Auth::requireAuth('admin');

// GET /customers - List customers (Admin)
if ($method === 'GET' && !$id) {
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
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
            "SELECT COUNT(*) as total FROM customers c WHERE $whereClause",
            $params
        )['total'] ?? 0;
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $customers = $conn->fetchAll(
            "SELECT c.id, c.company_name, c.contact_person, c.email, c.phone, c.customer_type, c.status, c.total_orders, c.total_spent
             FROM customers c
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

// GET /customers/:id - Get customer details
if ($method === 'GET' && $id && !$action) {
    try {
        $customer = $conn->fetch(
            "SELECT * FROM customers WHERE id = :id AND deleted_at IS NULL",
            ['id' => $id]
        );
        
        if (!$customer) {
            ResponseHelper::sendError('Customer not found', 404);
        }
        
        $notes = $conn->fetchAll(
            "SELECT cn.id, cn.note, cn.is_internal, u.full_name as user, cn.created_at
             FROM customer_notes cn
             LEFT JOIN users u ON cn.user_id = u.id
             WHERE cn.customer_id = :id
             ORDER BY cn.created_at DESC",
            ['id' => $id]
        );
        
        $orders = $conn->fetchAll(
            "SELECT o.id, o.order_number, o.total, o.status, o.created_at
             FROM orders o
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

// POST /customers - Create customer (Admin)
if ($method === 'POST' && !$id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['companyName']) || empty($data['email']) || empty($data['contactPerson'])) {
            ResponseHelper::sendError('Missing required fields', 400);
        }
        
        $conn->execute(
            "INSERT INTO customers (company_name, contact_person, email, phone, customer_type, address, city, province, postal_code, country, tax_number)
             VALUES (:companyName, :contactPerson, :email, :phone, :type, :address, :city, :province, :postalCode, :country, :taxNumber)",
            [
                'companyName' => $data['companyName'],
                'contactPerson' => $data['contactPerson'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? '',
                'type' => $data['customerType'] ?? 'Wholesale',
                'address' => $data['address'] ?? '',
                'city' => $data['city'] ?? '',
                'province' => $data['province'] ?? '',
                'postalCode' => $data['postalCode'] ?? '',
                'country' => $data['country'] ?? '',
                'taxNumber' => $data['taxNumber'] ?? ''
            ]
        );
        
        $customerId = $conn->lastInsertId();
        
        Logger::info('Customer created', ['customer_id' => $customerId]);
        ResponseHelper::sendSuccess(['id' => $customerId], 'Customer created successfully', 201);
        
    } catch (Exception $e) {
        Logger::error('Create customer error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create customer', 500);
    }
}

// PATCH /customers/:id - Update customer (Admin)
if ($method === 'PATCH' && $id && !$action) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['id' => $id];
        
        if (isset($data['status'])) {
            $updates[] = "status = :status";
            $params['status'] = $data['status'];
        }
        
        if (isset($data['paymentTerms'])) {
            $updates[] = "payment_terms = :paymentTerms";
            $params['paymentTerms'] = $data['paymentTerms'];
        }
        
        if (isset($data['creditLimit'])) {
            $updates[] = "credit_limit = :creditLimit";
            $params['creditLimit'] = (float)$data['creditLimit'];
        }
        
        if (!$updates) ResponseHelper::sendError('No fields to update', 400);
        
        $updates[] = "updated_at = NOW()";
        $conn->execute("UPDATE customers SET " . implode(', ', $updates) . " WHERE id = :id", $params);
        
        Logger::info('Customer updated', ['customer_id' => $id]);
        ResponseHelper::sendSuccess(['id' => $id], 'Customer updated successfully');
        
    } catch (Exception $e) {
        Logger::error('Update customer error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update customer', 500);
    }
}

// POST /customers/:id/notes - Add customer note (Admin)
if ($method === 'POST' && $id && $action === 'notes') {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['note'])) {
            ResponseHelper::sendError('Note content is required', 400);
        }
        
        $payload = Auth::verifyToken(Auth::getToken());
        
        $conn->execute(
            "INSERT INTO customer_notes (customer_id, user_id, note, is_internal) VALUES (:customerId, :userId, :note, :isInternal)",
            [
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
                    "SELECT id FROM customers WHERE email = :email",
                    ['email' => $customer['email']]
                );
                
                if ($existing) {
                    $errors[] = "Row $index: Email {$customer['email']} already exists";
                    continue;
                }
                
                $conn->execute(
                    "INSERT INTO customers (company_name, contact_person, email, phone, customer_type, status, billing_address, shipping_address)
                     VALUES (:company, :contact, :email, :phone, :type, :status, :billing, :shipping)",
                    [
                        'company' => $customer['company_name'],
                        'contact' => $customer['contact_person'] ?? '',
                        'email' => $customer['email'],
                        'phone' => $customer['phone'] ?? '',
                        'type' => $customer['customer_type'] ?? 'retail',
                        'status' => $customer['status'] ?? 'active',
                        'billing' => $customer['billing_address'] ?? '',
                        'shipping' => $customer['shipping_address'] ?? ''
                    ]
                );
                
                $customerId = $conn->lastInsertId();
                
                // Add initial note if provided
                if (!empty($customer['notes'])) {
                    $conn->execute(
                        "INSERT INTO customer_notes (customer_id, note, is_internal)
                         VALUES (:customerId, :note, 1)",
                        [
                            'customerId' => $customerId,
                            'note' => $customer['notes']
                        ]
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
