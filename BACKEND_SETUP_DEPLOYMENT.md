# REMQUIP Backend API - Complete Implementation Guide

## Overview

The REMQUIP backend is a fully-typed TypeScript/Express.js API with the following components:

- **Auth Service**: JWT-based authentication with token refresh
- **Product Service**: Product management, search, and filtering
- **Order Service**: Order creation, tracking, and management
- **User Service**: User profiles, addresses, admin contacts
- **Database**: MySQL with connection pooling
- **Security**: Role-based access control with 4 roles (customer, admin, manager, super_admin)

## Project Structure

```
Backend/
├── auth-service.ts          # Authentication & token management
├── database.ts              # Database connection pool
├── product-service.ts       # Product operations
├── order-service.ts         # Order operations
├── user-service.ts          # User & admin operations
├── server.ts                # Express app & routes
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── .env.example             # Environment template
└── README.md                # Backend documentation
```

## Installation & Setup

### Prerequisites

- Node.js 16+ and npm
- MySQL 5.7+
- TypeScript knowledge

### Step 1: Install Dependencies

```bash
cd Backend
npm install
```

### Step 2: Create Database

Execute the SQL migration:

```bash
mysql -u root -p < ../scripts/001-remquip-complete-schema.sql
```

### Step 3: Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env with your database credentials
# Required fields:
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET, JWT_REFRESH_SECRET
# - CORS_ORIGIN (your frontend URL)
```

### Step 4: Build & Run

```bash
# Development mode (with ts-node)
npm run dev

# Production build
npm run build
npm start

# The API will be available at http://localhost:3000
```

## API Endpoints Reference

### Authentication (Public)

```
POST   /api/auth/register           Register new user
POST   /api/auth/login              Login user
POST   /api/auth/logout             Logout (requires token)
GET    /api/auth/me                 Get current user (requires token)
POST   /api/auth/refresh            Refresh access token
```

### Products (Public read, Admin write)

```
GET    /api/products                Get all products (paginated)
GET    /api/products/featured       Get featured products
GET    /api/products/:id            Get product details
GET    /api/products/category/:id   Get products by category
POST   /api/products                Create product (admin only)
PATCH  /api/products/:id            Update product (admin only)
DELETE /api/products/:id            Delete product (admin only)
```

### Orders

```
GET    /api/orders                  Get all orders (admin only)
GET    /api/users/:userId/orders    Get user's orders
GET    /api/orders/:id              Get order details
POST   /api/orders                  Create order
PATCH  /api/orders/:id/status       Update status (admin only)
POST   /api/orders/:id/notes        Add note (admin only)
```

### Users

```
GET    /api/users                   Get all users (admin only)
GET    /api/users/profile           Get current user's profile
PATCH  /api/users/:id               Update user profile
POST   /api/users/:id/password      Change password
POST   /api/users/:userId/addresses Add address
PATCH  /api/users/:id/role          Update user role (super_admin only)
```

### Admin Contacts

```
GET    /api/admin-contacts          Get all available admins
GET    /api/admin-contacts/department/:dept  Get admins by department
```

### Dashboard

```
GET    /api/dashboard/orders/summary Get order statistics
```

## Authentication Flow

### Token Generation (Login)

1. User posts email & password to `/api/auth/login`
2. Backend validates credentials
3. Backend generates JWT access & refresh tokens
4. Tokens stored in database session
5. Tokens returned to frontend

### Token Usage

All authenticated requests must include:

```
Authorization: Bearer <access_token>
```

### Token Refresh

When access token expires:

1. Frontend calls `/api/auth/refresh` with refresh token
2. Backend validates refresh token
3. Backend issues new access token
4. Frontend updates Authorization header

### Token Expiry

- Access Token: 24 hours
- Refresh Token: 7 days
- Session: Expires with refresh token

## Role-Based Access Control

### Roles & Permissions

**Customer** (Default)
- View products
- Create orders
- View own orders
- Manage own profile & addresses
- Contact admins

**Admin**
- All customer permissions
- View all orders
- Update order status
- Add order notes
- View all users
- Manage products
- Manage inventory

**Manager**
- All admin permissions
- Manage other admins
- Generate reports
- Advanced filtering

**Super Admin**
- All permissions
- Assign roles
- Delete users/products
- System configuration

### Implementing Role Checks

In routes, use the `requireRole` middleware:

```typescript
app.post('/api/products', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  (req, res) => {
    // Only admins can reach here
  }
);
```

## Database Connection

The `db` module provides:

```typescript
// Execute query
const [rows, fields] = await db.query(sql, params);

// Execute transaction
await db.transaction(async (conn) => {
  // All queries use connection with automatic rollback on error
});

// Get connection for custom operations
const conn = await db.getConnection();
```

## Error Handling

All endpoints return standardized responses:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "pagination": { page, limit, total, pages }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description"
}
```

### Status Codes

- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

## Testing with cURL

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response includes `accessToken` - copy this value

### Get Products

```bash
curl http://localhost:3000/api/products?page=1&limit=20
```

### Get Current User

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Change JWT_REFRESH_SECRET in production
- [ ] Use HTTPS in production
- [ ] Set CORS_ORIGIN to frontend URL only
- [ ] Enable database SSL connections
- [ ] Implement rate limiting
- [ ] Add request logging & monitoring
- [ ] Enable SQL query logging (dev only)
- [ ] Validate all input data
- [ ] Use environment variables for secrets
- [ ] Implement request timeout (30s)
- [ ] Add request size limits

## Performance Optimization

### Database Indexes

All tables have indexes on:
- Primary keys
- Foreign keys
- Frequently searched fields (email, status, role)
- Date fields for sorting

### Connection Pooling

MySQL uses connection pool:
- Max connections: 10
- Queue limit: unlimited
- Keep alive enabled

### Caching Opportunities

Consider implementing:
- Redis for session storage
- Cache for featured products
- Cache for admin contacts
- Cache for order summary

## Monitoring & Logging

All endpoints log:
- Timestamp
- HTTP method
- Route path
- Errors with stack traces

Logs are sent to console in development. In production, integrate:
- Sentry for error tracking
- DataDog for performance monitoring
- ELK Stack for log aggregation
- CloudWatch for AWS deployments

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --cwd Backend
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Environment Variables (Production)

Set these in your hosting platform:
- DB_HOST
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- JWT_REFRESH_SECRET
- CORS_ORIGIN
- NODE_ENV=production

## Troubleshooting

### Connection Error to Database

Check:
- MySQL is running
- Database credentials in .env
- Network access to database host
- Database exists

### 401 Unauthorized

- Token may have expired
- Token invalid or malformed
- Token not in Authorization header
- Secret key mismatch

### 403 Forbidden

- User doesn't have required role
- Trying to access other user's resource
- Admin route accessed by non-admin

### Port Already in Use

```bash
# Change PORT in .env
# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

## Advanced Features (Future)

- [ ] Email verification on registration
- [ ] Password reset via email
- [ ] Two-factor authentication
- [ ] File uploads to S3
- [ ] Webhook support
- [ ] GraphQL API
- [ ] API versioning
- [ ] Rate limiting per user/IP
- [ ] Advanced filtering & aggregation
- [ ] Real-time notifications (WebSocket)

## Support & Documentation

- Backend tests: `npm run test`
- Type checking: `npm run typecheck`
- API docs: Auto-generated from comments
- DB schema: See `scripts/001-remquip-complete-schema.sql`
