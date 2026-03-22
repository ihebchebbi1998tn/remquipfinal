import { v4 as uuid } from 'uuid';
import { db } from './database';

export class OrderService {
  /**
   * Get all orders with pagination (admin)
   */
  static async getOrders(page: number = 1, limit: number = 20, filters?: any) {
    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM remquip_orders WHERE 1=1';
      const params: any[] = [];

      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters?.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters?.search) {
        query += ' AND (id LIKE ? OR user_id LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM remquip_orders WHERE 1=1 ${
          filters?.status ? 'AND status = ?' : ''
        } ${filters?.userId ? 'AND user_id = ?' : ''} ${
          filters?.search ? 'AND (id LIKE ? OR user_id LIKE ?)' : ''
        }`,
        params
      );

      const total = countResult[0].total;

      // Get paginated results
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [orders] = await db.query(query, params);

      // Get items and tracking for each order
      const ordersWithDetails = await Promise.all(
        orders.map(async (order: any) => {
          const [items] = await db.query(
            'SELECT * FROM remquip_order_items WHERE order_id = ?',
            [order.id]
          );

          const [tracking] = await db.query(
            'SELECT * FROM remquip_order_tracking WHERE order_id = ? ORDER BY created_at DESC',
            [order.id]
          );

          return {
            ...order,
            items,
            tracking: tracking[0] || null
          };
        })
      );

      return {
        success: true,
        data: ordersWithDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[OrderService] Get orders error:', error);
      throw error;
    }
  }

  /**
   * Get user orders
   */
  static async getUserOrders(userId: string, page: number = 1, limit: number = 10) {
    try {
      const offset = (page - 1) * limit;

      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM remquip_orders WHERE user_id = ?',
        [userId]
      );

      const total = countResult[0].total;

      const [orders] = await db.query(
        'SELECT * FROM remquip_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offset]
      );

      const ordersWithDetails = await Promise.all(
        orders.map(async (order: any) => {
          const [items] = await db.query(
            'SELECT * FROM remquip_order_items WHERE order_id = ?',
            [order.id]
          );

          const [tracking] = await db.query(
            'SELECT * FROM remquip_order_tracking WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
            [order.id]
          );

          return {
            ...order,
            items,
            tracking: tracking[0] || null
          };
        })
      );

      return {
        success: true,
        data: ordersWithDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[OrderService] Get user orders error:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string) {
    try {
      const [orders] = await db.query(
        'SELECT * FROM remquip_orders WHERE id = ?',
        [orderId]
      );

      if (orders.length === 0) {
        throw new Error('Order not found');
      }

      const order = orders[0];

      // Get items
      const [items] = await db.query(
        'SELECT * FROM remquip_order_items WHERE order_id = ?',
        [orderId]
      );

      // Get tracking
      const [tracking] = await db.query(
        'SELECT * FROM remquip_order_tracking WHERE order_id = ? ORDER BY created_at DESC',
        [orderId]
      );

      return {
        success: true,
        data: {
          ...order,
          items,
          tracking
        }
      };
    } catch (error) {
      console.error('[OrderService] Get order by ID error:', error);
      throw error;
    }
  }

  /**
   * Create order
   */
  static async createOrder(userId: string, data: any) {
    try {
      const orderId = uuid();
      const { items, shippingAddress, billingAddress, notes } = data;

      // Calculate total
      let total = 0;
      for (const item of items) {
        const [products] = await db.query(
          'SELECT price FROM remquip_products WHERE id = ?',
          [item.productId]
        );
        total += products[0].price * item.quantity;
      }

      // Create order
      await db.query(
        `INSERT INTO remquip_orders 
        (id, user_id, total, shipping_address, billing_address, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [orderId, userId, total, JSON.stringify(shippingAddress), JSON.stringify(billingAddress), notes]
      );

      // Add items
      for (const item of items) {
        const itemId = uuid();
        await db.query(
          `INSERT INTO remquip_order_items 
          (id, order_id, product_id, quantity, price, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [itemId, orderId, item.productId, item.quantity, item.price]
        );
      }

      // Create initial tracking
      const trackingId = uuid();
      await db.query(
        `INSERT INTO remquip_order_tracking 
        (id, order_id, status, location, estimated_delivery, created_at, updated_at)
        VALUES (?, ?, 'order_placed', 'Processing', DATE_ADD(NOW(), INTERVAL 3 DAY), NOW(), NOW())`,
        [trackingId, orderId]
      );

      return {
        success: true,
        message: 'Order created successfully',
        data: { id: orderId }
      };
    } catch (error) {
      console.error('[OrderService] Create order error:', error);
      throw error;
    }
  }

  /**
   * Update order status (admin)
   */
  static async updateOrderStatus(orderId: string, status: string) {
    try {
      await db.query(
        'UPDATE remquip_orders SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, orderId]
      );

      // Update tracking
      const trackingId = uuid();
      const statusMap: any = {
        pending: 'Order placed',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
      };

      await db.query(
        `INSERT INTO remquip_order_tracking 
        (id, order_id, status, location, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [trackingId, orderId, status, statusMap[status] || status]
      );

      return {
        success: true,
        message: 'Order status updated successfully'
      };
    } catch (error) {
      console.error('[OrderService] Update order status error:', error);
      throw error;
    }
  }

  /**
   * Add order note (admin)
   */
  static async addOrderNote(orderId: string, adminId: string, note: string) {
    try {
      const noteId = uuid();
      await db.query(
        `INSERT INTO remquip_order_notes 
        (id, order_id, admin_id, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [noteId, orderId, adminId, note]
      );

      return {
        success: true,
        message: 'Note added successfully'
      };
    } catch (error) {
      console.error('[OrderService] Add order note error:', error);
      throw error;
    }
  }

  /**
   * Get order summary for dashboard
   */
  static async getOrderSummary() {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
          SUM(total) as total_revenue
        FROM remquip_orders
      `);

      return {
        success: true,
        data: stats[0]
      };
    } catch (error) {
      console.error('[OrderService] Get order summary error:', error);
      throw error;
    }
  }
}
