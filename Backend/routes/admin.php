<?php
/**
 * /admin/permissions/* — Uses pages + user_page_access (database/remquip_full_schema.sql)
 */

Auth::requireAuth('admin');

$method = $_SERVER['REQUEST_METHOD'];
$rs = $routeSegments ?? [];

try {
    // GET /admin/permissions
    if ($method === 'GET' && ($rs[0] ?? '') === 'permissions' && !isset($rs[1])) {
        $pages = $conn->fetchAll("SELECT id, name, slug, description, display_order FROM remquip_pages WHERE is_active = 1 ORDER BY display_order");
        ResponseHelper::sendSuccess(['pages' => $pages], 'All permissions');
    }

    // GET /admin/permissions/user/:userId
    if ($method === 'GET' && ($rs[0] ?? '') === 'permissions' && ($rs[1] ?? '') === 'user' && isset($rs[2]) && !isset($rs[3])) {
        $uid = $rs[2];
        $access = $conn->fetchAll(
            "SELECT upa.page_id, upa.can_view, upa.can_edit, upa.can_delete, p.name, p.slug
             FROM remquip_user_page_access upa
             INNER JOIN remquip_pages p ON upa.page_id = p.id
             WHERE upa.user_id = :uid",
            ['uid' => $uid]
        );
        ResponseHelper::sendSuccess(['userId' => $uid, 'access' => $access], 'User permissions');
    }

    // PUT /admin/permissions/user/:userId
    if (($method === 'PUT' || $method === 'PATCH') && ($rs[0] ?? '') === 'permissions' && ($rs[1] ?? '') === 'user' && isset($rs[2]) && !isset($rs[3])) {
        $uid = $rs[2];
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $items = $data['access'] ?? $data['permissions'] ?? [];
        if (!is_array($items)) {
            ResponseHelper::sendError('Invalid body', 400);
        }
        foreach ($items as $row) {
            $pid = $row['page_id'] ?? $row['pageId'] ?? null;
            if (!$pid) {
                continue;
            }
            $cv = !empty($row['can_view']) ? 1 : 0;
            $ce = !empty($row['can_edit']) ? 1 : 0;
            $cd = !empty($row['can_delete']) ? 1 : 0;
            $existing = $conn->fetch(
                'SELECT id FROM remquip_user_page_access WHERE user_id = :u AND page_id = :p',
                ['u' => $uid, 'p' => $pid]
            );
            if ($existing) {
                $conn->execute(
                    'UPDATE remquip_user_page_access SET can_view = :cv, can_edit = :ce, can_delete = :cd, updated_at = NOW() WHERE id = :id',
                    ['cv' => $cv, 'ce' => $ce, 'cd' => $cd, 'id' => $existing['id']]
                );
            } else {
                $conn->execute(
                    'INSERT INTO remquip_user_page_access (id, user_id, page_id, can_view, can_edit, can_delete)
                     VALUES (UUID(), :uid, :pid, :cv, :ce, :cd)',
                    ['uid' => $uid, 'pid' => $pid, 'cv' => $cv, 'ce' => $ce, 'cd' => $cd]
                );
            }
        }
        ResponseHelper::sendSuccess([], 'Permissions updated');
    }
} catch (Exception $e) {
    Logger::error('Admin permissions error', ['error' => $e->getMessage()]);
    ResponseHelper::sendError('Admin request failed: ' . $e->getMessage(), 500);
}

ResponseHelper::sendError('Admin endpoint not found', 404);
