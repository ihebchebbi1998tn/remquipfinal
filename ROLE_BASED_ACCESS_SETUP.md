# Role-Based Access Control & User Dashboard - Complete Setup Guide

## Overview

This document provides a complete setup guide for:
1. **Database Schema** - All 15 tables with relationships
2. **Role-Based Access Control** - Admin permissions system
3. **User Dashboard** - Customer order tracking and admin contacts
4. **API Integration** - All endpoints configured and connected

---

## Database Setup

### Step 1: Execute Migration

Run the comprehensive migration script that creates all necessary tables:

```bash
# Execute from your backend/database folder
mysql -u [username] -p[password] -h [host] remquip < scripts/001-remquip-complete-schema.sql
```

### Step 2: Verify Tables Created

```sql
SHOW TABLES;

-- Expected tables (15 total):
-- 1. remquip_users
-- 2. remquip_admin_contacts
-- 3. remquip_user_sessions
-- 4. remquip_admin_permissions
-- 5. remquip_audit_logs
-- 6. remquip_categories
-- 7. remquip_products
-- 8. remquip_product_images
-- 9. remquip_customer_addresses
-- 10. remquip_orders
-- 11. remquip_order_items
-- 12. remquip_order_tracking
-- 13. remquip_order_notes
-- 14. remquip_discounts
-- 15. remquip_inventory_transactions
```

### Step 3: Update Admin Password

The default super admin has a placeholder password hash. Update it immediately:

```sql
-- First, generate a bcrypt hash of your desired password
-- Using an online tool or your backend language's bcrypt library

UPDATE remquip_users 
SET password_hash = '$2b$10$YOUR_BCRYPT_HASH_HERE'
WHERE email = 'admin@remquip.ca';
```

---

## Database Schema Details

### 1. Users Table (`remquip_users`)
Stores all user accounts with roles:
- **Fields**: id, email, password_hash, first_name, last_name, phone, avatar_url, role, status, email_verified
- **Roles**: customer, admin, manager, super_admin
- **Status**: active, inactive, suspended, pending_verification

### 2. Admin Contacts Table (`remquip_admin_contacts`)
Visible to customers in the dashboard:
- **Fields**: id, user_id, position, department, phone, email, specialization, available
- **Used By**: User Dashboard → Contacts Tab
- **Visibility**: Public to all customers

### 3. User Sessions Table (`remquip_user_sessions`)
Token-based session management:
- **Fields**: id, user_id, access_token, refresh_token, token_expires_at, ip_address, user_agent, device_name
- **Lifetime**: 24 hours (configurable)
- **Auto-cleanup**: Expired tokens are automatically invalidated

### 4. Admin Permissions Table (`remquip_admin_permissions`)
Granular permissions for admin users:
- **Fields**: 30+ boolean permission fields
- **Permissions**: Dashboard, Products, Orders, Customers, Inventory, Discounts, Users, Analytics, CMS, Audit, Settings
- **Linked To**: remquip_users table via user_id
- **Unique**: One permission record per admin user

### 5. Audit Logs Table (`remquip_audit_logs`)
Complete action tracking:
- **Fields**: id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, status
- **Used By**: AdminOverview, Audit page
- **Retention**: Keep for compliance/auditing

### 6-8. Product Tables
- **remquip_categories**: Product categories with hierarchy
- **remquip_products**: Product inventory with pricing and stock
- **remquip_product_images**: Multiple images per product with primary image support

### 9. Customer Addresses Table (`remquip_customer_addresses`)
Multiple address types per customer:
- **Types**: billing, shipping, business
- **Default**: Support default address selection
- **Used By**: Order creation, checkout

### 10-14. Order Tables
- **remquip_orders**: Main order table with statuses
- **remquip_order_items**: Line items (products in order)
- **remquip_order_tracking**: Delivery tracking updates
- **remquip_order_notes**: Internal and customer-facing notes
- **remquip_discounts**: Discount codes and promotions

### 15. Inventory Transactions (`remquip_inventory_transactions`)
Audit trail for stock changes:
- **Types**: purchase, sale, adjustment, return, damage
- **Linked to**: Orders for sales tracking
- **Used by**: AdminInventory, analytics

---

## Role-Based Access Control

### Role Hierarchy

```
super_admin (Full access to everything)
    ├── admin (Configurable permissions)
    ├── manager (Department-level access)
    └── customer (Personal orders and profile)
```

### Permission Matrix

Each admin user has individual permissions in `remquip_admin_permissions`:

#### Dashboard Permissions
- `can_view_dashboard` - Access to admin overview

#### Product Management
- `can_manage_products` - Full product control
- `can_view_products` - View only
- `can_create_products` - Create new products
- `can_edit_products` - Edit existing products
- `can_delete_products` - Delete products

#### Order Management
- `can_manage_orders` - Full order control
- `can_view_orders` - View all orders
- `can_edit_orders` - Edit order details
- `can_update_order_status` - Change order status
- `can_delete_orders` - Delete orders

#### Customer Management
- `can_manage_customers` - Full customer control
- `can_view_customers` - View customer list
- `can_edit_customers` - Edit customer info
- `can_delete_customers` - Delete customers

#### Inventory Management
- `can_manage_inventory` - Full inventory control
- `can_view_inventory` - View stock levels
- `can_adjust_inventory` - Adjust stock quantities

#### And more (Discounts, Users, Analytics, CMS, Audit, Settings)

---

## Frontend Implementation

### User Dashboard Route

The user dashboard is now available at `/dashboard`:

```tsx
// Automatically redirects non-authenticated users to /login
// Shows personalized data based on logged-in user
```

### User Dashboard Features

#### Orders Tab
- **View all orders** with status badges
- **Tracking numbers** for shipped orders
- **Estimated delivery dates**
- **Order totals** in user's preferred currency
- **Status colors**: Pending (gray), Confirmed (purple), Processing (yellow), Shipped (blue), Delivered (green), Cancelled (red)

#### Contacts Tab
- **List all available admin contacts**
- **Departments**: Sales, Support, Technical
- **Availability status**: Green dot for available, gray for unavailable
- **Direct contact**: Phone and email links
- **Specializations**: Shows admin expertise area

#### Settings Tab
- **Profile information**: Email, first name, last name (read-only)
- **Manage addresses**: Link to address management (coming soon)
- **Future**: Password change, notification preferences

---

## API Endpoints

### User Dashboard Endpoints

```
GET  /api/user/dashboard/profile              - Get user profile
GET  /api/user/dashboard/orders                - Get user orders (paginated)
GET  /api/user/dashboard/orders/summary        - Get order summary (counts, totals)
GET  /api/user/dashboard/addresses             - Get saved addresses
GET  /api/user/dashboard/settings              - Get user settings
PUT  /api/user/dashboard/settings              - Update user settings
GET  /api/user/dashboard/contacts              - Get all admin contacts
```

### Admin Contacts Endpoints

```
GET  /api/admin-contacts                              - List all contacts
GET  /api/admin-contacts/:id                          - Get specific contact
GET  /api/admin-contacts/department/:department       - Filter by department
GET  /api/admin-contacts/specialization/:specialization - Filter by specialization
GET  /api/admin-contacts/available                    - Get only available contacts
```

### Admin Permissions Endpoints

```
GET  /api/admin/permissions/user/:userId              - Get user permissions
PUT  /api/admin/permissions/user/:userId              - Update user permissions
GET  /api/admin/permissions                           - Get all permission records
```

### Order Tracking Endpoints

```
GET  /api/orders/:id/tracking                   - Get order tracking updates
GET  /api/users/:userId/orders                 - Get user's orders
```

---

## Backend Implementation Checklist

### Phase 1: Database (Complete ✓)
- [x] Create migration script with 15 tables
- [x] Create indexes for performance
- [x] Create default super admin
- [x] Create primary key relationships

### Phase 2: API Endpoints (In Progress)

#### User Dashboard APIs
- [ ] Implement `/api/user/dashboard/*` endpoints
- [ ] Add authentication middleware
- [ ] Add order data fetching
- [ ] Add admin contact listing
- [ ] Implement pagination for orders

#### Admin Permissions APIs
- [ ] Implement `/api/admin/permissions/*` endpoints
- [ ] Create permission checking middleware
- [ ] Add audit logging for permission changes
- [ ] Implement permission inheritance

#### Order Tracking APIs
- [ ] Implement `/api/orders/:id/tracking` endpoint
- [ ] Add tracking status updates
- [ ] Implement real-time updates (WebSocket ready)

### Phase 3: Frontend Implementation (Complete ✓)
- [x] Create UserDashboard component
- [x] Create Orders tab with statuses and tracking
- [x] Create Contacts tab with admin info
- [x] Create Settings tab with profile info
- [x] Add API integration to component
- [x] Add error handling and loading states
- [x] Add route protection with AuthContext

### Phase 4: Admin Panel (In Progress)
- [ ] Create AdminUsers page for user management
- [ ] Create AdminPermissions page for permission assignment
- [ ] Add permission UI for granular control
- [ ] Add audit log viewer
- [ ] Implement admin contact management

---

## Testing Checklist

### User Dashboard Tests
- [ ] Non-authenticated user redirects to login
- [ ] Authenticated user sees personal orders only
- [ ] Orders display correct status badges
- [ ] Tracking numbers appear when available
- [ ] Admin contacts load and display
- [ ] Contacts filter works by department
- [ ] Profile information displays correctly
- [ ] Currency formatting works in user's locale

### Role-Based Access Tests
- [ ] Super admin can access all pages
- [ ] Admin with limited permissions sees only allowed pages
- [ ] Manager with specific permissions sees only their pages
- [ ] Customer cannot access admin routes
- [ ] Non-admin redirects to home from `/admin`
- [ ] Permission changes take effect immediately
- [ ] Audit logs record all permission changes

### API Tests
- [ ] All user dashboard endpoints return correct data
- [ ] Permissions API correctly restricts access
- [ ] Pagination works for orders list
- [ ] Filters work for admin contacts
- [ ] Unauthorized requests return 401/403
- [ ] Error responses include helpful messages

---

## Configuration

### Environment Variables

```env
# API Base URL
VITE_API_URL=http://luccibyey.com.tn/remquip/backend

# Session
SESSION_TIMEOUT_MINUTES=1440  # 24 hours
TOKEN_REFRESH_BEFORE_EXPIRY=300  # Refresh 5 mins before expiry

# Audit Logging
ENABLE_AUDIT_LOGS=true
AUDIT_LOG_RETENTION_DAYS=90
```

### Backend Configuration

```javascript
// Example: Express/Node.js middleware
app.use(requireAuth); // Check if authenticated
app.use(checkPermission('can_view_orders')); // Check permission
app.use(auditLog); // Log the action
```

---

## Troubleshooting

### User can't log in
- [ ] Check `remquip_users` table has user record
- [ ] Verify password hash is correct (use bcrypt)
- [ ] Check `status` field is 'active'
- [ ] Verify `email_verified` is true

### User doesn't see admin dashboard
- [ ] Check user `role` is 'admin', 'manager', or 'super_admin'
- [ ] Verify `remquip_admin_permissions` record exists for user
- [ ] Check specific permission for the page (e.g., `can_view_products`)
- [ ] Clear browser cache and re-login

### Orders not showing in dashboard
- [ ] Verify `remquip_orders` has orders for user
- [ ] Check `user_id` matches logged-in user
- [ ] Verify `/api/user/dashboard/orders` endpoint returns data
- [ ] Check pagination parameters (page, limit)

### Admin contacts not showing
- [ ] Verify `remquip_admin_contacts` has records
- [ ] Check `available` field is true
- [ ] Verify `/api/admin-contacts/available` endpoint works
- [ ] Check authentication token is valid

---

## Security Best Practices

1. **Always** verify authentication before returning user data
2. **Never** return sensitive fields (password_hash, tokens) in API responses
3. **Audit log** all admin actions for compliance
4. **Validate** permissions on every request
5. **Expire** sessions after inactivity
6. **Encrypt** sensitive data in transit (HTTPS)
7. **Hash** passwords with bcrypt (min 10 rounds)
8. **Sanitize** all user inputs to prevent SQL injection
9. **Rate limit** API endpoints to prevent abuse
10. **Monitor** audit logs for suspicious activity

---

## Next Steps

1. **Execute the SQL migration** to create all tables
2. **Update the super admin password** in the database
3. **Implement the backend API endpoints** using the provided endpoints list
4. **Test all user dashboard features** with a test account
5. **Configure admin permissions** for your team
6. **Enable audit logging** for compliance
7. **Set up monitoring** for the audit logs

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API endpoints documentation
3. Check the database schema for relationships
4. Review the frontend component code for integration examples
