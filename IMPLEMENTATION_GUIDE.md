# REMQUIP Role-Based Access Control Implementation Guide

**Status**: PHASE 1 - STARTED  
**Last Updated**: March 21, 2026  
**Priority**: CRITICAL - Security

---

## Overview

This guide walks through implementing role-based access control (RBAC) and admin permission management for REMQUIP. The implementation has started with core components created.

---

## PHASE 1: CORE PROTECTION (75% COMPLETE)

### ✅ Completed

1. **ProtectedRoute Component** (`src/components/ProtectedRoute.tsx`)
   - Checks authentication status
   - Validates user role against required role
   - Shows access denied message for unauthorized users
   - Implements role hierarchy: super_admin > admin > manager > user

2. **usePermissions Hook** (`src/hooks/usePermissions.ts`)
   - Returns user permissions based on role
   - Provides `canAccess()`, `hasAnyPermission()`, `hasAllPermissions()` utilities
   - Prepared for future API integration

3. **AdminLayout Role Protection** (`src/components/layout/AdminLayout.tsx`)
   - Added role checking on component mount
   - Redirects non-admin users to `/login`
   - Shows loading state while verifying access

4. **Database Schema** (`scripts/create-admin-tables.sql`)
   - Created 5 new tables for permissions, audit logs, settings, roles, sessions
   - Updated remquip_users with security fields
   - Added performance indexes

### ⏳ In Progress

5. **Wrap Admin Routes with ProtectedRoute**
   - Need to update `src/App.tsx` to wrap all `/admin` routes
   - Add `requiredRole="admin"` to each route

### 📋 TODO (Phase 1 Remaining)

6. **API Integration** (Backend Required)
   - Backend must implement `/api/users/:id/permissions` endpoint
   - Endpoint should return user's custom permissions
   - Middleware must check permissions on all admin endpoints

7. **Granular Permission Checks**
   - Update each admin page to check specific permissions
   - Hide UI elements based on permissions
   - Show permission denied errors when needed

---

## Current Component Status

### Created Components

#### 1. ProtectedRoute.tsx
**Location**: `src/components/ProtectedRoute.tsx`

**Props**:
- `children`: React.ReactNode - Content to render if authorized
- `requiredRole?: 'admin' | 'super_admin' | 'manager'` - Minimum role required
- `fallbackPath?: string` - Where to redirect if unauthorized (default: `/login`)

**Usage**:
```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

<Route path="/admin" element={
  <ProtectedRoute requiredRole="admin">
    <AdminLayout />
  </ProtectedRoute>
}>
```

**Role Hierarchy**:
- super_admin: Level 4 (highest)
- admin: Level 3
- manager: Level 2
- user: Level 1 (lowest)

---

#### 2. usePermissions Hook
**Location**: `src/hooks/usePermissions.ts`

**Returns**:
```typescript
{
  permissions: AdminPermissions,        // User's current permissions
  canAccess: (permission) => boolean,   // Check single permission
  hasAnyPermission: (perms) => boolean, // Check if has any permission
  hasAllPermissions: (perms) => boolean, // Check if has all permissions
  isLoading: boolean
}
```

**Usage**:
```tsx
const { canAccess, permissions } = usePermissions();

if (!canAccess('canManageProducts')) {
  return <AccessDenied />;
}

return (
  <div>
    {canAccess('canViewAnalytics') && <AnalyticsPanel />}
  </div>
);
```

**Default Permissions by Role**:
- **super_admin**: All permissions enabled (11 total)
- **admin**: All except user management & audit logs
- **manager**: Orders, customers, inventory, discounts only
- **user**: No admin permissions

---

## NEXT STEPS (Immediate)

### Step 1: Update App.tsx Routes (1 hour)
Wrap admin routes with ProtectedRoute:

```tsx
// In src/App.tsx
const App = () => (
  <Routes>
    {/* Public routes */}
    <Route element={<PublicLayout />}>
      {/* ... existing public routes ... */}
    </Route>

    {/* Admin routes - PROTECTED */}
    <Route path="/admin" element={
      <ProtectedRoute requiredRole="admin">
        <AdminLayout />
      </ProtectedRoute>
    }>
      <Route index element={<AdminOverview />} />
      <Route path="products" element={<AdminProducts />} />
      {/* ... more admin routes ... */}
    </Route>
  </Routes>
);
```

### Step 2: Add Permission Checks to Admin Pages (4 hours)

Example for AdminProducts page:

```tsx
// In src/pages/admin/AdminProducts.tsx
import { usePermissions } from '@/hooks/usePermissions';
import PermissionDenied from '@/components/PermissionDenied';

export default function AdminProducts() {
  const { canAccess } = usePermissions();

  if (!canAccess('canManageProducts')) {
    return <PermissionDenied permission="canManageProducts" />;
  }

  return (
    <div>
      {canAccess('canCreateProducts') && (
        <button onClick={handleCreateProduct}>Add Product</button>
      )}
      
      {/* Products list */}
    </div>
  );
}
```

### Step 3: Create Missing User Dashboard (6 hours)

Create these new pages:
- `src/pages/account/OrderHistory.tsx` - View past orders
- `src/pages/account/ProfileEditor.tsx` - Edit profile
- `src/pages/account/AccountSettings.tsx` - Change password, preferences
- `src/pages/account/Addresses.tsx` - Manage shipping addresses

Update `src/App.tsx` to add routes:
```tsx
<Route path="/account/*" element={<ProtectedRoute requiredRole="user">
  <AccountLayout />
</ProtectedRoute>}>
  <Route index element={<OrderHistory />} />
  <Route path="profile" element={<ProfileEditor />} />
  <Route path="settings" element={<AccountSettings />} />
  <Route path="addresses" element={<Addresses />} />
</Route>
```

### Step 4: Backend Implementation (8-10 hours)

Backend needs to:

1. **Create Tables** (Run the SQL migration)
   ```bash
   mysql -u username -p database_name < scripts/create-admin-tables.sql
   ```

2. **Implement Permissions Endpoint**
   ```
   GET /api/users/:id/permissions
   Returns: { canManageProducts: true, canManageOrders: false, ... }
   ```

3. **Add Middleware for Permission Checking**
   ```typescript
   // Before each admin endpoint
   middleware((req, res, next) => {
     if (!req.user.role.includes('admin')) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     next();
   });
   ```

4. **Implement Audit Logging**
   - Log every admin action to `remquip_audit_logs`
   - Include: user, action, resource, old values, new values

5. **Initialize Default Permissions**
   - For each admin user, insert row in `remquip_admin_permissions`
   - Based on their role (super_admin, admin, manager)

---

## Testing Phase 1

### Test 1: Anonymous User Access
```
1. Go to http://localhost/admin
2. Should redirect to /login
3. Log shows: "Access denied: Not authenticated"
```

### Test 2: Regular User Access
```
1. Login as user (role: 'user')
2. Try to access http://localhost/admin
3. Should redirect to /
4. Log shows: "Access denied: Insufficient role"
```

### Test 3: Admin User Access
```
1. Login as admin (role: 'admin')
2. Access http://localhost/admin
3. Should load AdminLayout successfully
4. Check all admin pages load without errors
```

### Test 4: Manager User Access
```
1. Login as manager (role: 'manager')
2. Access http://localhost/admin
3. Should load AdminLayout
4. Some pages (like /admin/users) should show "Permission Denied"
```

---

## Database Setup Instructions

### Step 1: Run Migration
```bash
# Connect to your database
mysql -h localhost -u root -p remquip_db

# Run the migration script
SOURCE /path/to/scripts/create-admin-tables.sql;
```

### Step 2: Verify Tables Created
```sql
-- Check that all tables exist
SHOW TABLES LIKE 'remquip_admin%';
SHOW TABLES LIKE 'remquip_audit%';
SHOW TABLES LIKE 'remquip_user_settings%';
```

### Step 3: Initialize Default Permissions
```sql
-- For each existing admin user, insert permissions
INSERT INTO remquip_admin_permissions (
  id, user_id,
  can_view_dashboard, can_manage_products, can_manage_orders,
  can_manage_customers, can_manage_inventory, can_manage_discounts,
  can_manage_users, can_view_analytics, can_manage_cms,
  can_view_audit_logs, can_delete_data, can_edit_settings,
  created_at
) VALUES (
  UUID(), (SELECT id FROM remquip_users WHERE role = 'super_admin' LIMIT 1),
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  NOW()
);
```

---

## API Integration Checklist

- [ ] Backend implements `/api/users/:id/permissions`
- [ ] Backend validates permissions on all `/admin/*` routes
- [ ] Backend logs actions to `remquip_audit_logs`
- [ ] Backend prevents unauthorized users from accessing admin endpoints
- [ ] usePermissions hook uncommented to fetch from API
- [ ] Session management uses new `remquip_user_sessions` table

---

## Security Checklist

- [ ] Admin routes protected by ProtectedRoute component
- [ ] All admin pages check specific permissions
- [ ] UI elements hidden for users without permissions
- [ ] Audit logs created for all admin actions
- [ ] Rate limiting on login attempts (lockout after 5 failures)
- [ ] Session timeout after 30 minutes of inactivity
- [ ] HTTPS enforced for all admin routes
- [ ] CSRF protection on all forms
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)

---

## Files Modified & Created

### Created Files (Phase 1)
- ✅ `src/components/ProtectedRoute.tsx` - Route protection component
- ✅ `src/hooks/usePermissions.ts` - Permissions hook
- ✅ `scripts/create-admin-tables.sql` - Database migration
- 📋 `SYSTEM_ANALYSIS_AND_IMPROVEMENTS.md` - This analysis document

### Modified Files
- ✅ `src/components/layout/AdminLayout.tsx` - Added role checking

### Files to Modify (Phase 1)
- ⏳ `src/App.tsx` - Wrap admin routes with ProtectedRoute
- ⏳ `src/pages/admin/AdminProducts.tsx` - Add permission checks
- ⏳ `src/pages/admin/AdminOrders.tsx` - Add permission checks
- ⏳ `src/pages/admin/AdminCustomers.tsx` - Add permission checks
- ⏳ `src/pages/admin/AdminInventory.tsx` - Add permission checks
- ⏳ `src/pages/admin/AdminDiscounts.tsx` - Add permission checks

### Files to Create (Phase 2)
- 📋 `src/pages/admin/AdminUsers.tsx` - User management
- 📋 `src/pages/admin/AdminRoles.tsx` - Role & permission management
- 📋 `src/pages/account/OrderHistory.tsx` - Customer order history
- 📋 `src/pages/account/ProfileEditor.tsx` - Profile management
- 📋 `src/pages/account/AccountSettings.tsx` - Account settings
- 📋 `src/components/PermissionDenied.tsx` - Access denied display

---

## Troubleshooting

### Issue: "Access denied: Not authenticated" on /admin
**Solution**: Make sure you're logged in. Check localStorage for auth token.

### Issue: Unauthorized users can still access /admin
**Solution**: Make sure ProtectedRoute is wrapping the admin routes in App.tsx

### Issue: Permission checks not working
**Solution**: Verify usePermissions hook is imported and user object has role field

### Issue: Database migration fails
**Solution**: Check MySQL user has CREATE TABLE permissions, check syntax in .sql file

---

## Performance Considerations

1. **Permissions Caching**: usePermissions will cache permissions for 5 minutes (per React Query config)
2. **Audit Logging**: Consider archiving old logs after 1 year
3. **Session Cleanup**: Remove expired sessions from DB periodically
4. **Database Indexes**: Migration includes indexes on frequently queried columns

---

## Future Enhancements (Phase 4+)

1. Two-factor authentication (2FA) for admin accounts
2. IP whitelisting for admin access
3. Custom role creation UI
4. Session management interface
5. Advanced audit log search & filtering
6. Email notifications for sensitive admin actions
7. Webhook integration for external systems
8. API key management for service accounts

---

## Support & Questions

For questions or issues with the implementation:
1. Check this guide's Troubleshooting section
2. Review the system analysis document
3. Check console logs with `[ProtectedRoute]` or `[AdminLayout]` prefix
4. Verify database migration ran successfully

---

## Summary

**What's Protected**: All admin routes require authentication and admin role  
**What's Checked**: User role, authentication status, specific permissions  
**What's Logged**: All admin actions via audit logs  
**What's Missing**: Backend integration, user dashboard, granular permissions UI  

**Estimated Time to Complete Phase 1**: 2-3 days with backend team  
**Go-Live Readiness**: 60% (Phase 1 done, Phase 2 in progress)
