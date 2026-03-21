<?php
/**
 * CMS ROUTES - Pages, banners, content
 */

$method = $_SERVER['REQUEST_METHOD'];
$contentType = $id ?? 'pages';

// GET /cms/pages - List pages
if ($method === 'GET' && $contentType === 'pages' && !$action) {
    try {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $published = isset($_GET['published']) ? $_GET['published'] === 'true' : null;
        
        $where = [];
        $params = [];
        
        if ($published !== null) {
            $where[] = 'is_published = :published';
            $params['published'] = $published ? 1 : 0;
        }
        
        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        
        $total = $conn->fetch(
            "SELECT COUNT(*) as total FROM cms_pages $whereClause",
            $params
        )['total'] ?? 0;
        
        $params['limit'] = $limit;
        $params['offset'] = $offset;
        
        $pages = $conn->fetchAll(
            "SELECT id, title, slug, excerpt, is_published, published_at, created_at
             FROM cms_pages $whereClause
             ORDER BY created_at DESC
             LIMIT :limit OFFSET :offset",
            $params
        );
        
        ResponseHelper::sendPaginated($pages, $total, $limit, $offset, 'Pages retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get pages error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve pages', 500);
    }
}

// GET /cms/pages/:id - Get single page
if ($method === 'GET' && $contentType !== 'pages' && !$action) {
    try {
        $page = $conn->fetch(
            "SELECT * FROM cms_pages WHERE (id = :id OR slug = :id)",
            ['id' => $contentType]
        );
        
        if (!$page) {
            ResponseHelper::sendError('Page not found', 404);
        }
        
        // Only fetch unpublished pages if admin
        if (!$page['is_published']) {
            Auth::requireAuth('admin');
        }
        
        ResponseHelper::sendSuccess($page, 'Page retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get page error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve page', 500);
    }
}

// POST /cms/pages - Create page (Admin)
if ($method === 'POST' && $contentType === 'pages' && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['title']) || empty($data['content'])) {
            ResponseHelper::sendError('Title and content required', 400);
        }
        
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $data['title']), '-'));
        
        $conn->execute(
            "INSERT INTO cms_pages (title, slug, excerpt, content, is_published, published_at)
             VALUES (:title, :slug, :excerpt, :content, :published, :publishedAt)",
            [
                'title' => $data['title'],
                'slug' => $slug,
                'excerpt' => $data['excerpt'] ?? '',
                'content' => $data['content'],
                'published' => isset($data['isPublished']) ? (int)$data['isPublished'] : 0,
                'publishedAt' => isset($data['isPublished']) && $data['isPublished'] ? date('Y-m-d H:i:s') : null
            ]
        );
        
        $pageId = $conn->lastInsertId();
        
        Logger::info('CMS page created', ['page_id' => $pageId]);
        ResponseHelper::sendSuccess(['id' => $pageId], 'Page created successfully', 201);
        
    } catch (Exception $e) {
        Logger::error('Create page error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create page', 500);
    }
}

// PATCH /cms/pages/:id - Update page (Admin)
if ($method === 'PATCH' && $contentType !== 'pages' && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $updates = [];
        $params = ['id' => $contentType];
        
        if (isset($data['title'])) {
            $updates[] = 'title = :title';
            $params['title'] = $data['title'];
        }
        
        if (isset($data['content'])) {
            $updates[] = 'content = :content';
            $params['content'] = $data['content'];
        }
        
        if (isset($data['isPublished'])) {
            $updates[] = 'is_published = :published';
            $updates[] = 'published_at = ' . ($data['isPublished'] ? 'NOW()' : 'NULL');
            $params['published'] = (int)$data['isPublished'];
        }
        
        if (!$updates) ResponseHelper::sendError('No fields to update', 400);
        
        $updates[] = 'updated_at = NOW()';
        $conn->execute("UPDATE cms_pages SET " . implode(', ', $updates) . " WHERE id = :id", $params);
        
        Logger::info('CMS page updated', ['page_id' => $contentType]);
        ResponseHelper::sendSuccess(['id' => $contentType], 'Page updated successfully');
        
    } catch (Exception $e) {
        Logger::error('Update page error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to update page', 500);
    }
}

// DELETE /cms/pages/:id - Delete page (Admin)
if ($method === 'DELETE' && $contentType !== 'pages' && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $conn->execute("DELETE FROM cms_pages WHERE id = :id", ['id' => $contentType]);
        Logger::info('CMS page deleted', ['page_id' => $contentType]);
        ResponseHelper::sendSuccess(null, 'Page deleted successfully');
        
    } catch (Exception $e) {
        Logger::error('Delete page error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to delete page', 500);
    }
}

// GET /cms/banners - List banners
if ($method === 'GET' && $contentType === 'banners' && !$action) {
    try {
        $banners = $conn->fetchAll(
            "SELECT id, title, image_url, link_url, is_active, display_order
             FROM banners WHERE is_active = 1
             ORDER BY display_order ASC"
        );
        
        ResponseHelper::sendSuccess($banners, 'Banners retrieved');
        
    } catch (Exception $e) {
        Logger::error('Get banners error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve banners', 500);
    }
}

// POST /cms/banners - Create banner (Admin)
if ($method === 'POST' && $contentType === 'banners' && !$action) {
    Auth::requireAuth('admin');
    
    try {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['title']) || empty($data['imageUrl'])) {
            ResponseHelper::sendError('Title and image URL required', 400);
        }
        
        $conn->execute(
            "INSERT INTO banners (title, image_url, link_url, display_order, is_active)
             VALUES (:title, :imageUrl, :linkUrl, :order, 1)",
            [
                'title' => $data['title'],
                'imageUrl' => $data['imageUrl'],
                'linkUrl' => $data['linkUrl'] ?? '',
                'order' => isset($data['displayOrder']) ? (int)$data['displayOrder'] : 0
            ]
        );
        
        $bannerId = $conn->lastInsertId();
        
        Logger::info('Banner created', ['banner_id' => $bannerId]);
        ResponseHelper::sendSuccess(['id' => $bannerId], 'Banner created successfully', 201);
        
    } catch (Exception $e) {
        Logger::error('Create banner error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to create banner', 500);
    }
}
?>
