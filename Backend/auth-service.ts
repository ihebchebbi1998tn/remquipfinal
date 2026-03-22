import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { db } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'remquip-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'remquip-refresh-secret-2026';
const TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: any;
}

export interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare plain password with hash
   */
  static async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate JWT tokens
   */
  static generateTokens(userId: string, email: string, role: string): AuthTokens {
    const accessToken = jwt.sign(
      { userId, email, role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId, email },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_EXPIRY,
      user: { userId, email, role }
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): DecodedToken | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded as DecodedToken;
    } catch (error) {
      console.error('[AuthService] Token verification failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static refreshAccessToken(refreshToken: string): string | null {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const newAccessToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email, role: decoded.role },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );
      return newAccessToken;
    } catch (error) {
      console.error('[AuthService] Refresh token verification failed:', error);
      return null;
    }
  }

  /**
   * Register new user
   */
  static async register(email: string, password: string, firstName: string, lastName: string) {
    try {
      // Check if user exists
      const [existingUser] = await db.query(
        'SELECT id FROM remquip_users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const userId = uuid();
      await db.query(
        `INSERT INTO remquip_users 
        (id, email, password_hash, first_name, last_name, role, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, 'customer', 'active', NOW(), NOW())`,
        [userId, email, passwordHash, firstName, lastName]
      );

      // Get user data
      const [users] = await db.query(
        'SELECT id, email, first_name, last_name, role FROM remquip_users WHERE id = ?',
        [userId]
      );

      const user = users[0];
      const tokens = this.generateTokens(user.id, user.email, user.role);

      // Store session
      const sessionId = uuid();
      await db.query(
        `INSERT INTO remquip_user_sessions 
        (id, user_id, access_token, refresh_token, token_expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW(), NOW())`,
        [sessionId, user.id, tokens.accessToken, tokens.refreshToken]
      );

      return {
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          },
          tokens
        }
      };
    } catch (error) {
      console.error('[AuthService] Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(email: string, password: string) {
    try {
      // Find user
      const [users] = await db.query(
        'SELECT * FROM remquip_users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = users[0];

      // Check password
      const passwordMatch = await this.comparePasswords(password, user.password_hash);
      if (!passwordMatch) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await db.query(
        'UPDATE remquip_users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );

      // Generate tokens
      const tokens = this.generateTokens(user.id, user.email, user.role);

      // Store session
      const sessionId = uuid();
      await db.query(
        `INSERT INTO remquip_user_sessions 
        (id, user_id, access_token, refresh_token, token_expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW(), NOW())`,
        [sessionId, user.id, tokens.accessToken, tokens.refreshToken]
      );

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          },
          tokens
        }
      };
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(userId: string) {
    try {
      await db.query(
        'DELETE FROM remquip_user_sessions WHERE user_id = ?',
        [userId]
      );

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(userId: string) {
    try {
      const [users] = await db.query(
        'SELECT id, email, first_name, last_name, role, status, avatar_url FROM remquip_users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatar_url
        }
      };
    } catch (error) {
      console.error('[AuthService] Get current user error:', error);
      throw error;
    }
  }
}
