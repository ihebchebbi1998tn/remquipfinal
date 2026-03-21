<?php
/**
 * PRODUCTS ROUTES - Full CRUD implementation
 */

$method = $_SERVER['REQUEST_METHOD'];
$isAdmin = false;

// Check if admin for POST/PATCH/DELETE
if (in_array($method, ['POST', 'PATCH', 'DELETE'])) {
    Auth::requireAuth('admin');
    $isAdmin = true;
}

// GET /products - List all products
if ($method === 'GET' && !$id) {
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $category = isset($_GET['category']) ? trim($_GET['category']) : '';
        $inStock = isset($_GET['inStock']) ? $_GET['inStock'] === 'true' : false;
        $sort = isset($_GET['sort']) ? $_GET['sort'] : 'featured';
        
        // Build query
        $where = ['p.is_active = 1', 'p.deleted_at IS NULL', 'c.is_active = 1'];
        $params = [];
        
        if ($search) {
            $where[] = "(p.name LIKE :search OR p.sku LIKE :search OR p.description LIKE :search)";
            $params['search'] = "%$search%";
        }
        
        if ($category) {
            $where[] = "c.slug = :category";
            $params['category'] = $category;
        }
        
        if ($inStock) {
            $where[] = "COALESCE(inv.quantity_available, 0) > 0";
        }
        
        $whereClause = implode(' AND ', $where);
        
        // Count total
        $countSql = "SELECT COUNT(DISTINCT p.id) as total FROM products p 
                     LEFT JOIN categories c ON p.category_id = c.id 
                     LEFT JOIN inventory inv ON p.id = inv.product_id 
                     WHERE $whereClause";
        $total = $conn->fetch($countSql, $params)['total'] ?? 0;
        
        // Get products
        $orderBy = match($sort) {
            'price_low' => 'p.base_price ASC',
            'price_high' => 'p.base_price DESC',
            'newest' => 'p.created_at DESC',
            default => 'p.created_at DESC'
        };
        
        $sql = "SELECT p.id, p.sku, p.name, p.description, p.base_price as price, 
                       c.name as category, c.slug as categorySlug,
                       (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image,
                       COALESCE(inv.quantity_available, 0) as stock
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN inventory inv ON p.id = inv.product_id
                WHERE $whereClause
                ORDER BY $orderBy
                LIMIT :limit OFFSET :offset";
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $products = $conn->fetchAll($sql, $params);
        
        ResponseHelper::sendPaginated($products, $total, $limit, $offset, 'Products retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get products error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve products', 500);
    }
}

// GET /products/:id - Get product details
if ($method === 'GET' && $id && !$action) {
    try {
        $product = $conn->fetch(
            "SELECT p.*, c.name as category, c.slug as categorySlug
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE (p.id = :id OR p.sku = :id) AND p.deleted_at IS NULL",
            ['id' => $id]
        );
        
        if (!$product) {
            ResponseHelper::sendError('Product not found', 404);
        }
        
        $images = $conn->fetchAll(
            "SELECT id, image_url, alt_text, is_primary FROM product_images 
             WHERE product_id = :id ORDER BY is_primary DESC, display_order ASC",
            ['id' => $product['id']]
        );
        
        $variants = $conn->fetchAll(
            "SELECT id, variant_name, variant_value, price_modifier FROM product_variants 
             WHERE product_id = :id AND is_active = 1 ORDER BY display_order ASC",
            ['id' => $product['id']]
        );
        
        $inventory = $conn->fetch(
            "SELECT quantity_on_hand, quantity_reserved, quantity_available FROM inventory WHERE product_id = :id",
            ['id' => $product['id']]
        );
        
        $product['images'] = $images;
        $product['variants'] = $variants;
        $product['stock'] = $inventory['quantity_available'] ?? 0;
        $product['details'] = json_decode($product['details'] ?? '{}', true);
        
        ResponseHelper::sendSuccess($product, 'Product details retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get product error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve product', 500);
    }
}

// POST /products - Create product (Admin only)
if ($method === 'POST' && !$id) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $required = ['sku', 'name', 'categoryId', 'basePrice'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                ResponseHelper::sendError("Missing required field: $field", 400);
            }
        }
        
        $conn->execute(
            "INSERT INTO products (sku, name, category_id, description, details, base_price, cost_price, is_active)
             VALUES (:sku, :name, :categoryId, :description, :details, :basePrice, :costPrice, 1)",
            [
                'sku' => strtoupper($data['sku']),
                'name' => $data['name'],
                'categoryId' => $data['categoryId'],
                'description' => $data['description'] ?? '',
                'details' => json_encode($data['details'] ?? []),
                'basePrice' => (float)$data['basePrice'],
                'costPrice' => isset($data['costPrice']) ? (float)$data['costPrice'] : null
            ]
        );
        
        $productId = $conn->lastInsertId();
        
        $conn->execute(
            "INSERT INTO inventory (product_id, quantity_on_hand, reorder_level, reorder_quantity)
             VALUES (:productId, 0, 10, 50)",
            ['productId' => $productId]
        );
        
        Logger::info('Product created', ['product_id' => $productId]);
        ResponseHelper::sendSuccess(['id' => $productId], 'Product created successfully', 201);
        
    } catch (Exception $e) {
        Logger::error('Create product error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create product', 500);
    }
}

// PATCH /products/:id - Update product (Admin only)
if ($method === 'PATCH' && $id && !$action) {
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['id' => $id];
        
        if (isset($data['name'])) {
            $updates[] = "name = :name";
            $params['name'] = $data['name'];
        }
        if (isset($data['basePrice'])) {
            $updates[] = "base_price = :basePrice";
            $params['basePrice'] = (float)$data['basePrice'];
        }
        if (isset($data['status'])) {
            $updates[] = "is_active = :isActive";
            $params['isActive'] = $data['status'] === 'active' ? 1 : 0;
        }
        
        if (!$updates) ResponseHelper::sendError('No fields to update', 400);
        
        $updates[] = "updated_at = NOW()";
        $conn->execute("UPDATE products SET " . implode(', ', $updates) . " WHERE id = :id", $params);
        
        Logger::info('Product updated', ['product_id' => $id]);
        ResponseHelper::sendSuccess(['id' => $id], 'Product updated successfully');
        
    } catch (Exception $e) {
        Logger::error('Update product error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update product', 500);
    }
}

// DELETE /products/:id - Delete product (Admin only, soft delete)
if ($method === 'DELETE' && $id && !$action) {
    try {
        $conn->execute("UPDATE products SET deleted_at = NOW() WHERE id = :id", ['id' => $id]);
        Logger::info('Product deleted', ['product_id' => $id]);
        ResponseHelper::sendSuccess(null, 'Product deleted successfully');
        
    } catch (Exception $e) {
        Logger::error('Delete product error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete product', 500);
    }
}

// =====================================================================
// PRODUCT IMAGES MANAGEMENT
// =====================================================================

// DELETE /products/:id/images/:imageId - Delete product image
if ($method === 'DELETE' && $id && $action === 'images') {
    try {
        $imageId = $_GET['imageId'] ?? null;
        if (!$imageId) {
            ResponseHelper::sendError('Image ID required', 400);
        }
        
        // Get image details
        $image = $conn->fetch(
            "SELECT file_url FROM product_images WHERE id = :id AND product_id = :productId",
            ['id' => $imageId, 'productId' => $id]
        );
        
        if (!$image) {
            ResponseHelper::sendError('Image not found', 404);
        }
        
        // Delete from filesystem
        $filePath = __DIR__ . '/..' . $image['file_url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
        
        // Delete from database
        $conn->execute("DELETE FROM product_images WHERE id = :id", ['id' => $imageId]);
        
        Logger::info('Product image deleted', ['product_id' => $id, 'image_id' => $imageId]);
        ResponseHelper::sendSuccess(null, 'Image deleted successfully');
        
    } catch (Exception $e) {
        Logger::error('Delete image error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete image', 500);
    }
}

// PATCH /products/:id/images/:imageId - Update image details
if ($method === 'PATCH' && $id && $action === 'images') {
    try {
        $imageId = $_GET['imageId'] ?? null;
        if (!$imageId) {
            ResponseHelper::sendError('Image ID required', 400);
        }
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['id' => $imageId];
        
        if (isset($data['altText'])) {
            $updates[] = "alt_text = :altText";
            $params['altText'] = $data['altText'];
        }
        
        if (isset($data['isPrimary'])) {
            // If setting as primary, unset other primary images
            if ($data['isPrimary']) {
                $conn->execute(
                    "UPDATE product_images SET is_primary = 0 WHERE product_id = :productId",
                    ['productId' => $id]
                );
            }
            $updates[] = "is_primary = :isPrimary";
            $params['isPrimary'] = $data['isPrimary'] ? 1 : 0;
        }
        
        if (isset($data['displayOrder'])) {
            $updates[] = "display_order = :order";
            $params['order'] = (int)$data['displayOrder'];
        }
        
        if (!$updates) ResponseHelper::sendError('No fields to update', 400);
        
        $conn->execute("UPDATE product_images SET " . implode(', ', $updates) . " WHERE id = :id", $params);
        
        Logger::info('Product image updated', ['product_id' => $id, 'image_id' => $imageId]);
        ResponseHelper::sendSuccess(['id' => $imageId], 'Image updated successfully');
        
    } catch (Exception $e) {
        Logger::error('Update image error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update image', 500);
    }
}

// GET /products/:id/images - Get all product images
if ($method === 'GET' && $id && $action === 'images') {
    try {
        $images = $conn->fetchAll(
            "SELECT id, image_url, alt_text, is_primary, display_order FROM product_images
             WHERE product_id = :id
             ORDER BY is_primary DESC, display_order ASC",
            ['id' => $id]
        );
        
        ResponseHelper::sendSuccess($images, 'Product images retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get images error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve images', 500);
    }
}

if (!$method) {
    ResponseHelper::sendError('Invalid request method', 405);
}
?>
