import { v4 as uuid } from 'uuid';
import { db } from './database';
import { AuthService } from './auth-service';

export class UserService {
  /**
   * Get user profile
   */
  static async getUserProfile(userId: string) {
    try {
      const [users] = await db.query(
        `SELECT id, email, first_name, last_name, phone, avatar_url, role, status 
        FROM remquip_users WHERE id = ?`,
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];

      // Get addresses
      const [addresses] = await db.query(
        'SELECT * FROM remquip_user_addresses WHERE user_id = ?',
        [userId]
      );

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          role: user.role,
          status: user.status,
          addresses
        }
      };
    } catch (error) {
      console.error('[UserService] Get user profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, data: any) {
    try {
      const { firstName, lastName, phone, avatarUrl } = data;

      await db.query(
        `UPDATE remquip_users 
        SET first_name = ?, last_name = ?, phone = ?, avatar_url = ?, updated_at = NOW()
        WHERE id = ?`,
        [firstName, lastName, phone, avatarUrl, userId]
      );

      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('[UserService] Update user profile error:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      // Get user
      const [users] = await db.query(
        'SELECT password_hash FROM remquip_users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      // Verify old password
      const passwordMatch = await AuthService.comparePasswords(
        oldPassword,
        users[0].password_hash
      );

      if (!passwordMatch) {
        throw new Error('Invalid current password');
      }

      // Hash new password
      const newPasswordHash = await AuthService.hashPassword(newPassword);

      // Update password
      await db.query(
        'UPDATE remquip_users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, userId]
      );

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('[UserService] Update password error:', error);
      throw error;
    }
  }

  /**
   * Add user address
   */
  static async addAddress(userId: string, data: any) {
    try {
      const addressId = uuid();
      const { street, city, state, postalCode, country, isDefault } = data;

      // If this is default, unset others
      if (isDefault) {
        await db.query(
          'UPDATE remquip_user_addresses SET is_default = false WHERE user_id = ?',
          [userId]
        );
      }

      await db.query(
        `INSERT INTO remquip_user_addresses 
        (id, user_id, street, city, state, postal_code, country, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [addressId, userId, street, city, state, postalCode, country, isDefault ? 1 : 0]
      );

      return {
        success: true,
        message: 'Address added successfully',
        data: { id: addressId }
      };
    } catch (error) {
      console.error('[UserService] Add address error:', error);
      throw error;
    }
  }

  /**
   * Update user address
   */
  static async updateAddress(userId: string, addressId: string, data: any) {
    try {
      const { street, city, state, postalCode, country, isDefault } = data;

      // If this is default, unset others
      if (isDefault) {
        await db.query(
          'UPDATE remquip_user_addresses SET is_default = false WHERE user_id = ?',
          [userId]
        );
      }

      await db.query(
        `UPDATE remquip_user_addresses 
        SET street = ?, city = ?, state = ?, postal_code = ?, country = ?, is_default = ?, updated_at = NOW()
        WHERE id = ? AND user_id = ?`,
        [street, city, state, postalCode, country, isDefault ? 1 : 0, addressId, userId]
      );

      return {
        success: true,
        message: 'Address updated successfully'
      };
    } catch (error) {
      console.error('[UserService] Update address error:', error);
      throw error;
    }
  }

  /**
   * Delete user address
   */
  static async deleteAddress(userId: string, addressId: string) {
    try {
      await db.query(
        'DELETE FROM remquip_user_addresses WHERE id = ? AND user_id = ?',
        [addressId, userId]
      );

      return {
        success: true,
        message: 'Address deleted successfully'
      };
    } catch (error) {
      console.error('[UserService] Delete address error:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin)
   */
  static async getAllUsers(page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const [countResult] = await db.query('SELECT COUNT(*) as total FROM remquip_users');
      const total = countResult[0].total;

      const [users] = await db.query(
        `SELECT id, email, first_name, last_name, role, status, created_at 
        FROM remquip_users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[UserService] Get all users error:', error);
      throw error;
    }
  }

  /**
   * Update user role (super_admin only)
   */
  static async updateUserRole(userId: string, role: string) {
    try {
      const validRoles = ['customer', 'admin', 'manager', 'super_admin'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role');
      }

      await db.query(
        'UPDATE remquip_users SET role = ?, updated_at = NOW() WHERE id = ?',
        [role, userId]
      );

      return {
        success: true,
        message: 'User role updated successfully'
      };
    } catch (error) {
      console.error('[UserService] Update user role error:', error);
      throw error;
    }
  }

  /**
   * Get admin contacts visible to customers
   */
  static async getAdminContacts() {
    try {
      const [contacts] = await db.query(`
        SELECT 
          ac.id, ac.user_id, ac.position, ac.department, ac.phone, ac.email, 
          ac.specialization, ac.bio, ac.photo_url, ac.available,
          u.first_name, u.last_name
        FROM remquip_admin_contacts ac
        JOIN remquip_users u ON ac.user_id = u.id
        WHERE ac.available = true
        ORDER BY ac.department, ac.specialization
      `);

      return {
        success: true,
        data: contacts
      };
    } catch (error) {
      console.error('[UserService] Get admin contacts error:', error);
      throw error;
    }
  }

  /**
   * Get admin contacts by department
   */
  static async getAdminContactsByDepartment(department: string) {
    try {
      const [contacts] = await db.query(`
        SELECT 
          ac.id, ac.user_id, ac.position, ac.department, ac.phone, ac.email, 
          ac.specialization, ac.bio, ac.photo_url,
          u.first_name, u.last_name
        FROM remquip_admin_contacts ac
        JOIN remquip_users u ON ac.user_id = u.id
        WHERE ac.department = ? AND ac.available = true
        ORDER BY ac.specialization
      `, [department]);

      return {
        success: true,
        data: contacts
      };
    } catch (error) {
      console.error('[UserService] Get admin contacts by department error:', error);
      throw error;
    }
  }

  /**
   * Create admin contact
   */
  static async createAdminContact(userId: string, data: any) {
    try {
      const contactId = uuid();
      const { position, department, phone, email, specialization, bio, photoUrl } = data;

      await db.query(
        `INSERT INTO remquip_admin_contacts 
        (id, user_id, position, department, phone, email, specialization, bio, photo_url, available, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
        [contactId, userId, position, department, phone, email, specialization, bio, photoUrl]
      );

      return {
        success: true,
        message: 'Admin contact created successfully',
        data: { id: contactId }
      };
    } catch (error) {
      console.error('[UserService] Create admin contact error:', error);
      throw error;
    }
  }
}
