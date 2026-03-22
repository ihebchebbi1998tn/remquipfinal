import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AuthService, DecodedToken } from './auth-service';
import { ProductService } from './product-service';
import { OrderService } from './order-service';
import { UserService } from './user-service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== AUTH MIDDLEWARE ====================
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
      token?: string;
    }
  }
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const decoded = AuthService.verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  req.user = decoded;
  req.token = token;
  next();
};

const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const result = await AuthService.register(email, password, firstName, lastName);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[Register] Error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error: any) {
    console.error('[Login] Error:', error);
    res.status(401).json({ success: false, message: error.message });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await AuthService.logout(req.user!.userId);
    res.json(result);
  } catch (error: any) {
    console.error('[Logout] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await AuthService.getCurrentUser(req.user!.userId);
    res.json(result);
  } catch (error: any) {
    console.error('[Get current user] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Refresh token
app.post('/api/auth/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const newAccessToken = AuthService.refreshAccessToken(refreshToken);
    if (!newAccessToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (error: any) {
    console.error('[Refresh token] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PRODUCT ROUTES ====================

// Get all products
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const result = await ProductService.getProducts(page, limit, search);
    res.json(result);
  } catch (error: any) {
    console.error('[Get products] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get featured products
app.get('/api/products/featured', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 4;
    const result = await ProductService.getFeaturedProducts(limit);
    res.json(result);
  } catch (error: any) {
    console.error('[Get featured products] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const result = await ProductService.getProductById(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('[Get product by ID] Error:', error);
    res.status(404).json({ success: false, message: error.message });
  }
});

// Get products by category
app.get('/api/products/category/:categoryId', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await ProductService.getProductsByCategory(req.params.categoryId, page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('[Get products by category] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create product (admin)
app.post('/api/products', authenticateToken, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const result = await ProductService.createProduct(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[Create product] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update product (admin)
app.patch('/api/products/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const result = await ProductService.updateProduct(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    console.error('[Update product] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete product (admin)
app.delete('/api/products/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const result = await ProductService.deleteProduct(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('[Delete product] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ORDER ROUTES ====================

// Get all orders (admin)
app.get('/api/orders', authenticateToken, requireRole(['admin', 'manager', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters = {
      status: req.query.status as string,
      userId: req.query.userId as string,
      search: req.query.search as string
    };

    const result = await OrderService.getOrders(page, limit, filters);
    res.json(result);
  } catch (error: any) {
    console.error('[Get orders] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user orders
app.get('/api/users/:userId/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    // User can only see their own orders
    if (req.user!.userId !== req.params.userId && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await OrderService.getUserOrders(req.params.userId, page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('[Get user orders] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get order by ID
app.get('/api/orders/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await OrderService.getOrderById(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error('[Get order] Error:', error);
    res.status(404).json({ success: false, message: error.message });
  }
});

// Create order
app.post('/api/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await OrderService.createOrder(req.user!.userId, req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[Create order] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status (admin)
app.patch('/api/orders/:id/status', authenticateToken, requireRole(['admin', 'manager', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status required' });
    }

    const result = await OrderService.updateOrderStatus(req.params.id, status);
    res.json(result);
  } catch (error: any) {
    console.error('[Update order status] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add order note (admin)
app.post('/api/orders/:id/notes', authenticateToken, requireRole(['admin', 'manager', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ success: false, message: 'Note required' });
    }

    const result = await OrderService.addOrderNote(req.params.id, req.user!.userId, note);
    res.json(result);
  } catch (error: any) {
    console.error('[Add order note] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== USER ROUTES ====================

// Get user profile
app.get('/api/users/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await UserService.getUserProfile(req.user!.userId);
    res.json(result);
  } catch (error: any) {
    console.error('[Get user profile] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user profile
app.patch('/api/users/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Users can only update their own profile
    if (req.user!.userId !== req.params.id && req.user!.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const result = await UserService.updateUserProfile(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    console.error('[Update user profile] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update password
app.post('/api/users/:id/password', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user!.userId !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { oldPassword, newPassword } = req.body;
    const result = await UserService.updatePassword(req.params.id, oldPassword, newPassword);
    res.json(result);
  } catch (error: any) {
    console.error('[Update password] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add address
app.post('/api/users/:userId/addresses', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user!.userId !== req.params.userId && req.user!.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const result = await UserService.addAddress(req.params.userId, req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[Add address] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users (admin)
app.get('/api/users', authenticateToken, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await UserService.getAllUsers(page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('[Get all users] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user role (super_admin)
app.patch('/api/users/:id/role', authenticateToken, requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const result = await UserService.updateUserRole(req.params.id, role);
    res.json(result);
  } catch (error: any) {
    console.error('[Update user role] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADMIN CONTACTS ROUTES ====================

// Get all admin contacts
app.get('/api/admin-contacts', async (req: Request, res: Response) => {
  try {
    const result = await UserService.getAdminContacts();
    res.json(result);
  } catch (error: any) {
    console.error('[Get admin contacts] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get admin contacts by department
app.get('/api/admin-contacts/department/:department', async (req: Request, res: Response) => {
  try {
    const result = await UserService.getAdminContactsByDepartment(req.params.department);
    res.json(result);
  } catch (error: any) {
    console.error('[Get admin contacts by department] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DASHBOARD ROUTES ====================

// Get order summary
app.get('/api/dashboard/orders/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await OrderService.getOrderSummary();
    res.json(result);
  } catch (error: any) {
    console.error('[Get order summary] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Server is running' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error handler]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`REMQUIP Backend API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
