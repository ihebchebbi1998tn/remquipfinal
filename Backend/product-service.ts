import { v4 as uuid } from 'uuid';
import { db } from './database';

export class ProductService {
  /**
   * Get all products with pagination
   */
  static async getProducts(page: number = 1, limit: number = 20, search?: string) {
    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM remquip_products';
      const params: any[] = [];

      if (search) {
        query += ' WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM remquip_products ${search ? 'WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?' : ''}`,
        search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
      );

      const total = countResult[0].total;

      // Get paginated results
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [products] = await db.query(query, params);

      // Get images for each product
      const productsWithImages = await Promise.all(
        products.map(async (product: any) => {
          const [images] = await db.query(
            'SELECT * FROM remquip_product_images WHERE product_id = ? ORDER BY is_primary DESC',
            [product.id]
          );
          return {
            ...product,
            images: images
          };
        })
      );

      return {
        success: true,
        data: productsWithImages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[ProductService] Get products error:', error);
      throw error;
    }
  }

  /**
   * Get featured products
   */
  static async getFeaturedProducts(limit: number = 4) {
    try {
      const [products] = await db.query(
        'SELECT * FROM remquip_products WHERE is_featured = true LIMIT ?',
        [limit]
      );

      // Get images for each product
      const productsWithImages = await Promise.all(
        products.map(async (product: any) => {
          const [images] = await db.query(
            'SELECT * FROM remquip_product_images WHERE product_id = ? ORDER BY is_primary DESC',
            [product.id]
          );
          return {
            ...product,
            images: images
          };
        })
      );

      return {
        success: true,
        data: productsWithImages
      };
    } catch (error) {
      console.error('[ProductService] Get featured products error:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(productId: string) {
    try {
      const [products] = await db.query(
        'SELECT * FROM remquip_products WHERE id = ?',
        [productId]
      );

      if (products.length === 0) {
        throw new Error('Product not found');
      }

      const product = products[0];

      // Get images
      const [images] = await db.query(
        'SELECT * FROM remquip_product_images WHERE product_id = ? ORDER BY is_primary DESC',
        [productId]
      );

      return {
        success: true,
        data: {
          ...product,
          images: images
        }
      };
    } catch (error) {
      console.error('[ProductService] Get product by ID error:', error);
      throw error;
    }
  }

  /**
   * Create product (admin only)
   */
  static async createProduct(data: any) {
    try {
      const productId = uuid();
      const {
        name,
        sku,
        description,
        price,
        cost,
        categoryId,
        stockQuantity,
        isActive = true,
        isFeatured = false
      } = data;

      await db.query(
        `INSERT INTO remquip_products 
        (id, name, sku, description, price, cost, category_id, stock_quantity, is_active, is_featured, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [productId, name, sku, description, price, cost, categoryId, stockQuantity, isActive, isFeatured]
      );

      return {
        success: true,
        message: 'Product created successfully',
        data: { id: productId }
      };
    } catch (error) {
      console.error('[ProductService] Create product error:', error);
      throw error;
    }
  }

  /**
   * Update product (admin only)
   */
  static async updateProduct(productId: string, data: any) {
    try {
      const {
        name,
        description,
        price,
        cost,
        stockQuantity,
        isActive,
        isFeatured
      } = data;

      await db.query(
        `UPDATE remquip_products 
        SET name = ?, description = ?, price = ?, cost = ?, stock_quantity = ?, is_active = ?, is_featured = ?, updated_at = NOW()
        WHERE id = ?`,
        [name, description, price, cost, stockQuantity, isActive, isFeatured, productId]
      );

      return {
        success: true,
        message: 'Product updated successfully'
      };
    } catch (error) {
      console.error('[ProductService] Update product error:', error);
      throw error;
    }
  }

  /**
   * Delete product (admin only)
   */
  static async deleteProduct(productId: string) {
    try {
      // Delete associated images
      await db.query('DELETE FROM remquip_product_images WHERE product_id = ?', [productId]);

      // Delete product
      await db.query('DELETE FROM remquip_products WHERE id = ?', [productId]);

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    } catch (error) {
      console.error('[ProductService] Delete product error:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(categoryId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM remquip_products WHERE category_id = ?',
        [categoryId]
      );

      const total = countResult[0].total;

      const [products] = await db.query(
        'SELECT * FROM remquip_products WHERE category_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [categoryId, limit, offset]
      );

      const productsWithImages = await Promise.all(
        products.map(async (product: any) => {
          const [images] = await db.query(
            'SELECT * FROM remquip_product_images WHERE product_id = ? ORDER BY is_primary DESC',
            [product.id]
          );
          return { ...product, images };
        })
      );

      return {
        success: true,
        data: productsWithImages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[ProductService] Get products by category error:', error);
      throw error;
    }
  }

  /**
   * Get low stock products (admin)
   */
  static async getLowStockProducts(threshold: number = 50) {
    try {
      const [products] = await db.query(
        'SELECT * FROM remquip_products WHERE stock_quantity <= ? AND is_active = true ORDER BY stock_quantity ASC',
        [threshold]
      );

      return {
        success: true,
        data: products
      };
    } catch (error) {
      console.error('[ProductService] Get low stock products error:', error);
      throw error;
    }
  }
}
