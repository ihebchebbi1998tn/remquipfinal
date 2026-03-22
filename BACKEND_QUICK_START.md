# REMQUIP Backend - Quick Start Guide

## Installation (5 minutes)

```bash
# 1. Install dependencies
cd Backend
npm install

# 2. Setup database (from root directory)
mysql -u root -p < scripts/001-remquip-complete-schema.sql

# 3. Configure environment
cp .env.example .env

# Edit .env with your values:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=remquip
# JWT_SECRET=your_secret_key_here
```

## Start Server (2 minutes)

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start

# Server runs on http://localhost:3000
```

## Verify It Works

```bash
# Health check
curl http://localhost:3000/api/health

# Should return:
# {"success":true,"message":"Server is running"}
```

## Core API Calls

### 1. Register User

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

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": "24h"
    }
  }
}
```

### 2. Login User

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:** Same as register - includes tokens

### 3. Get Current User

```bash
# Save token from login response
TOKEN="your_access_token_here"

curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Products

```bash
curl "http://localhost:3000/api/products?page=1&limit=20"
```

### 5. Create Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {"productId": "prod-id-1", "quantity": 2, "price": 99.99},
      {"productId": "prod-id-2", "quantity": 1, "price": 149.99}
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "billingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    }
  }'
```

### 6. Get User Orders

```bash
curl "http://localhost:3000/api/users/$USER_ID/orders?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## Admin Operations

### Create Product (Admin Only)

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Product Name",
    "sku": "SKU-001",
    "description": "Product description",
    "price": 99.99,
    "cost": 50.00,
    "categoryId": "cat-id",
    "stockQuantity": 100,
    "isActive": true,
    "isFeatured": true
  }'
```

### Update Order Status (Admin Only)

```bash
curl -X PATCH "http://localhost:3000/api/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status": "shipped"}'
```

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (check input) |
| 401 | Unauthorized (check token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 500 | Server error (check logs) |

## Troubleshooting

### Port 3000 Already in Use

```bash
# Kill process using port 3000
lsof -i :3000
kill -9 <PID>

# Or change PORT in .env
PORT=3001
npm run dev
```

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

Check:
1. MySQL is running: `mysql -u root -p`
2. Database credentials in .env
3. Database created: `mysql -u root -p < scripts/001-remquip-complete-schema.sql`

### Token Expired Error

```json
{"success": false, "message": "Invalid or expired token"}
```

Solution: Use refresh token to get new access token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token"}'
```

## Environment Variables

### Required

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=remquip
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret
```

### Optional

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

## File Structure

```
Backend/
├── auth-service.ts      ← Authentication logic
├── database.ts          ← Database connection
├── product-service.ts   ← Product operations
├── order-service.ts     ← Order operations
├── user-service.ts      ← User operations
├── server.ts            ← Express app & routes
├── package.json         ← Dependencies
├── tsconfig.json        ← TypeScript config
├── .env.example         ← Environment template
└── dist/                ← Compiled output (after build)
```

## Useful Commands

```bash
# Development with auto-reload
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Start production server
npm start

# Install new package
npm install package-name
```

## Role-Based Access

### Customer
- View products
- Create orders
- View own orders
- Manage profile

### Admin
- Everything customer can do
- View all orders
- Update order status
- Manage products
- Manage users

### Manager
- Everything admin can do
- Advanced reporting

### Super Admin
- All permissions
- Assign roles
- System settings

## Next Steps

1. ✅ Start server: `npm run dev`
2. ✅ Test register/login
3. ✅ Create test products
4. ✅ Create test orders
5. ✅ Connect frontend to http://localhost:3000

## Documentation Links

- Full setup guide: `BACKEND_SETUP_DEPLOYMENT.md`
- Implementation details: `BACKEND_IMPLEMENTATION_COMPLETE.md`
- Database schema: `scripts/001-remquip-complete-schema.sql`
- Frontend integration: `src/lib/api.ts` (already configured)

## Support

If you encounter issues:

1. Check logs in terminal
2. Verify .env configuration
3. Check database connection
4. Review error messages
5. Check documentation files

---

**Ready to go!** Start with `npm run dev` and test the API 🚀
