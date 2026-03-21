<?php
/**
 * ANALYTICS ROUTES - Dashboard metrics
 */

Auth::requireAuth('admin');

$method = $_SERVER['REQUEST_METHOD'];

// GET /analytics/dashboard - Dashboard overview
if ($method === 'GET' && $id === 'dashboard' && !$action) {
    try {
        // Total revenue
        $revenue = $conn->fetch(
            "SELECT SUM(total) as total_revenue FROM orders WHERE status IN ('completed', 'shipped') AND deleted_at IS NULL"
        )['total_revenue'] ?? 0;
        
        // Total orders
        $totalOrders = $conn->fetch(
            "SELECT COUNT(*) as count FROM orders WHERE deleted_at IS NULL"
        )['count'] ?? 0;
        
        // Total products
        $totalProducts = $conn->fetch(
            "SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL"
        )['count'] ?? 0;
        
        // Active customers
        $activeCustomers = $conn->fetch(
            "SELECT COUNT(*) as count FROM customers WHERE status = 'active' AND deleted_at IS NULL"
        )['count'] ?? 0;
        
        // Recent orders
        $recentOrders = $conn->fetchAll(
            "SELECT o.id, o.order_number, c.company_name as customer, o.total, o.status, o.created_at
             FROM orders o
             LEFT JOIN customers c ON o.customer_id = c.id
             WHERE o.deleted_at IS NULL
             ORDER BY o.created_at DESC LIMIT 5"
        );
        
        // Low stock products
        $lowStock = $conn->fetchAll(
            "SELECT p.id, p.sku, p.name, inv.quantity_available as stock, inv.reorder_level
             FROM inventory inv
             LEFT JOIN products p ON inv.product_id = p.id
             WHERE inv.quantity_available <= inv.reorder_level AND p.deleted_at IS NULL
             ORDER BY inv.quantity_available ASC LIMIT 10"
        );
        
        // Monthly revenue trend
        $monthlyRevenue = $conn->fetchAll(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total) as revenue, COUNT(*) as orders
             FROM orders
             WHERE status IN ('completed', 'shipped') AND deleted_at IS NULL
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month DESC LIMIT 12"
        );
        
        ResponseHelper::sendSuccess([
            'summary' => [
                'totalRevenue' => (float)$revenue,
                'totalOrders' => (int)$totalOrders,
                'totalProducts' => (int)$totalProducts,
                'activeCustomers' => (int)$activeCustomers
            ],
            'recentOrders' => $recentOrders,
            'lowStockProducts' => $lowStock,
            'monthlyRevenue' => $monthlyRevenue
        ], 'Dashboard data retrieved');
        
    } catch (Exception $e) {
        Logger::error('Dashboard analytics error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve dashboard data', 500);
    }
}

// GET /analytics/sales - Sales metrics by period
if ($method === 'GET' && $id === 'sales' && !$action) {
    try {
        $period = isset($_GET['period']) ? $_GET['period'] : 'month';
        
        $groupBy = match($period) {
            'day' => 'DATE(created_at)',
            'week' => 'WEEK(created_at)',
            'year' => 'YEAR(created_at)',
            default => 'DATE_FORMAT(created_at, "%Y-%m")'
        };
        
        $sales = $conn->fetchAll(
            "SELECT $groupBy as period, 
                    SUM(total) as revenue,
                    COUNT(*) as orders,
                    AVG(total) as avgOrderValue,
                    MAX(total) as maxOrder,
                    MIN(total) as minOrder
             FROM orders
             WHERE status IN ('completed', 'shipped') AND deleted_at IS NULL
             GROUP BY $groupBy
             ORDER BY period DESC"
        );
        
        ResponseHelper::sendSuccess($sales, 'Sales metrics retrieved');
        
    } catch (Exception $e) {
        Logger::error('Sales analytics error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve sales data', 500);
    }
}

// GET /analytics/inventory - Inventory status
if ($method === 'GET' && $id === 'inventory' && !$action) {
    try {
        $inventory = [
            'totalProducts' => $conn->fetch("SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL")['count'],
            'lowStock' => $conn->fetch("SELECT COUNT(*) as count FROM inventory WHERE quantity_available <= reorder_level")['count'],
            'outOfStock' => $conn->fetch("SELECT COUNT(*) as count FROM inventory WHERE quantity_available = 0")['count'],
            'overStock' => $conn->fetch(
                "SELECT COUNT(*) as count FROM inventory WHERE quantity_on_hand > (quantity_available + quantity_reserved) * 2"
            )['count'],
            'stockByValue' => $conn->fetchAll(
                "SELECT p.sku, p.name, inv.quantity_on_hand as quantity, p.cost_price as cost,
                        (inv.quantity_on_hand * COALESCE(p.cost_price, 0)) as inventory_value
                 FROM inventory inv
                 LEFT JOIN products p ON inv.product_id = p.id
                 ORDER BY inventory_value DESC LIMIT 20"
            )
        ];
        
        ResponseHelper::sendSuccess($inventory, 'Inventory analytics retrieved');
        
    } catch (Exception $e) {
        Logger::error('Inventory analytics error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve inventory data', 500);
    }
}

// GET /analytics/customers - Customer analytics
if ($method === 'GET' && $id === 'customers' && !$action) {
    try {
        $analytics = [
            'byType' => $conn->fetchAll(
                "SELECT customer_type as type, COUNT(*) as count FROM customers WHERE deleted_at IS NULL GROUP BY customer_type"
            ),
            'byStatus' => $conn->fetchAll(
                "SELECT status, COUNT(*) as count FROM customers WHERE deleted_at IS NULL GROUP BY status"
            ),
            'topByRevenue' => $conn->fetchAll(
                "SELECT c.id, c.company_name, SUM(o.total) as total_spent, COUNT(o.id) as orders
                 FROM customers c
                 LEFT JOIN orders o ON c.id = o.customer_id AND o.deleted_at IS NULL
                 GROUP BY c.id ORDER BY total_spent DESC LIMIT 10"
            ),
            'newCustomersThisMonth' => $conn->fetch(
                "SELECT COUNT(*) as count FROM customers WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())"
            )['count']
        ];
        
        ResponseHelper::sendSuccess($analytics, 'Customer analytics retrieved');
        
    } catch (Exception $e) {
        Logger::error('Customer analytics error', ['error' => $e->getMessage()]);
        ResponseHelper::sendError('Failed to retrieve customer data', 500);
    }
}
?>
