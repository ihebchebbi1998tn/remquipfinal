<?php
/**
 * CATEGORIES ROUTES - Full CRUD
 */

$method = $_SERVER['REQUEST_METHOD'];

// GET /categories - List categories
if ($method === 'GET' && !$id) {
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        
        $where = ['c.is_active = 1', 'c.deleted_at IS NULL'];
        $params = [];
        
        if ($search) {
            $where[] = "(c.name LIKE :search OR c.description LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        $whereClause = implode(' AND ', $where);
        
        $total = $conn->fetch(
            "SELECT COUNT(*) as total FROM categories c WHERE $whereClause",
            $params
        )['total'] ?? 0;
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $categories = $conn->fetchAll(
            "SELECT c.id, c.name, c.slug, c.description, c.image_url, c.display_order,
                    COUNT(p.id) as product_count
             FROM categories c
             LEFT JOIN products p ON c.id = p.category_id AND p.deleted_at IS NULL
             WHERE $whereClause
             GROUP BY c.id
             ORDER BY c.display_order ASC
             LIMIT :limit OFFSET :offset",
            $params
        );
        
        ResponseHelper::sendPaginated($categories, $total, $limit, $offset, 'Categories retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get categories error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve categories', 500);
    }
}

// GET /categories/:id - Get single category
if ($method === 'GET' && $id && !$action) {
    try {
        $category = $conn->fetch(
            "SELECT * FROM categories WHERE (id = :id OR slug = :id) AND deleted_at IS NULL",
            ['id' => $id]
        );
        
        if (!$category) {
            ResponseHelper::sendError('Category not found', 404);
        }
        
        $products = $conn->fetchAll(
            "SELECT id, sku, name, base_price as price FROM products 
             WHERE category_id = :id AND is_active = 1 AND deleted_at IS NULL
             LIMIT 20",
            ['id' => $category['id']]
        );
        
        $category['products'] = $products;
        
        ResponseHelper::sendSuccess($category, 'Category details retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get category error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve category', 500);
    }
}

// POST /categories - Create category (Admin)
if ($method === 'POST' && !$id) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['name'])) {
            ResponseHelper::sendError('Name is required', 400);
        }
        
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $data['name']), '-'));
        
        $conn->execute(
            "INSERT INTO categories (name, slug, description, image_url, display_order, is_active)
             VALUES (:name, :slug, :description, :imageUrl, :order, 1)",
            [
                'name' => $data['name'],
                'slug' => $slug,
                'description' => $data['description'] ?? '',
                'imageUrl' => $data['imageUrl'] ?? '',
                'order' => isset($data['displayOrder']) ? (int)$data['displayOrder'] : 0
            ]
        );
        
        $categoryId = $conn->lastInsertId();
        
        Logger::info('Category created', ['category_id' => $categoryId]);
        ResponseHelper::sendSuccess(['id' => $categoryId], 'Category created successfully', 201);
        
    } catch (Exception $e) {
        Logger::error('Create category error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create category', 500);
    }
}

// PATCH /categories/:id - Update category (Admin)
if ($method === 'PATCH' && $id && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['id' => $id];
        
        if (isset($data['name'])) {
            $updates[] = "name = :name";
            $params['name'] = $data['name'];
        }
        
        if (isset($data['status'])) {
            $updates[] = "is_active = :isActive";
            $params['isActive'] = $data['status'] === 'active' ? 1 : 0;
        }
        
        if (isset($data['displayOrder'])) {
            $updates[] = "display_order = :order";
            $params['order'] = (int)$data['displayOrder'];
        }
        
        if (!$updates) ResponseHelper::sendError('No fields to update', 400);
        
        $updates[] = "updated_at = NOW()";
        $conn->execute("UPDATE categories SET " . implode(', ', $updates) . " WHERE id = :id", $params);
        
        Logger::info('Category updated', ['category_id' => $id]);
        ResponseHelper::sendSuccess(['id' => $id], 'Category updated successfully');
        
    } catch (Exception $e) {
        Logger::error('Update category error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update category', 500);
    }
}

// DELETE /categories/:id - Delete category (Admin, soft delete)
if ($method === 'DELETE' && $id && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $conn->execute("UPDATE categories SET deleted_at = NOW() WHERE id = :id", ['id' => $id]);
        Logger::info('Category deleted', ['category_id' => $id]);
        ResponseHelper::sendSuccess(null, 'Category deleted successfully');
        
    } catch (Exception $e) {
        Logger::error('Delete category error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete category', 500);
    }
}
?>
