# REMQUIP Backend Integration - Quick Start Testing Guide

## Before You Start

1. **Backend Running**: Ensure `http://luccibyey.com.tn/remquip/backend` is accessible
2. **Test Credentials**: Have a valid test user account ready
3. **Network Access**: Backend should accept requests from your frontend URL

---

## Test 1: Login Flow (5 minutes)

### Step 1: Open Login Page
```
Navigate to: /login
```

### Step 2: Test Valid Login
```
Email: your-test@example.com
Password: your-test-password
Expected: Redirect to /account, token appears in console
```

### Step 3: Verify Token Storage
Open Browser DevTools → Application → LocalStorage:
```
Look for: remquip_auth_token = "eyJ0eXAi..."
```

### Step 4: Check Network Requests
Open DevTools → Network tab:
```
POST /api/auth/login
Headers: Content-Type: application/json
Body: {"email":"...","password":"..."}
Response: {success: true, data: {token: "...", user: {...}}}
Status: 200
```

### Step 5: Test Invalid Login
```
Email: wrong@example.com
Password: wrong
Expected: Error message displayed, no redirect
```

---

## Test 2: Session Persistence (3 minutes)

### Step 1: Login Successfully
Complete Test 1 successfully

### Step 2: Refresh Page
```
Press F5 or Cmd+R to reload
Expected: User stays logged in, no redirect to login
```

### Step 3: Check Console
```
Look for: [v0] Token found in storage
Look for: [v0] User verified: your-email@example.com
```

---

## Test 3: Data Loading (5 minutes)

### Test 3A: HomePage Products
```
Navigate to: /
Expected: Featured products load from API, not hardcoded
```

### Step 1: Check Network
Open DevTools → Network tab:
```
Look for: GET /api/products/featured
Status: 200
Response contains: data array with products
```

### Step 2: Check Console
```
Look for: [v0] Fetching featured products and categories
Look for: [v0] Fetched X products
```

### Test 3B: Products Page
```
Navigate to: /products
Expected: Product grid loads with real data
```

### Step 1: Network Verification
```
Look for: GET /api/products?page=1&limit=100
Status: 200
```

### Test 3C: AdminOverview
```
Navigate to: /admin
Expected: Stats, recent orders, activity log from API
```

### Step 1: Check Network
```
Look for: GET /api/dashboard/stats
Look for: GET /api/orders
Look for: GET /api/dashboard/activity-log
All should have Status: 200
```

---

## Test 4: Authorization Header (3 minutes)

### Step 1: Login First
Complete Test 1

### Step 2: Open Any Page Requiring Data
Navigate to /products

### Step 3: Check Network Requests
Open DevTools → Network → Click any API request:
```
Request Headers should show:
Authorization: Bearer eyJ0eXAi...
Content-Type: application/json
```

### Step 4: Verify Token Format
```
Should be: Bearer <your-token>
NOT: <your-token>
NOT: Token <your-token>
```

---

## Test 5: Error Handling (5 minutes)

### Step 5A: 401 Unauthorized Response
```
1. Login successfully
2. Open DevTools → Application → LocalStorage
3. Edit remquip_auth_token to a fake value
4. Refresh page /admin
5. Expected: Redirect to /login, error message shown
6. Check console for: [v0] Token verification failed
```

### Step 5B: Network Error
```
1. Open DevTools → Network tab
2. Right-click → Throttling → Offline
3. Try to load /products
4. Expected: Error message shown, fallback to demo data
5. Re-enable network
```

### Step 5C: Server Error (500)
```
Note: Can't test without backend returning 500
Expected: User-friendly error message
```

---

## Test 6: Logout (2 minutes)

### Step 1: Login First
Complete Test 1

### Step 2: Click Logout Button
```
Look for logout in user menu or account page
Click it
```

### Step 3: Verify Token Cleared
```
DevTools → Application → LocalStorage
remquip_auth_token should be gone
```

### Step 4: Check Redirect
```
Expected: Redirected to /login
Expected: Console shows: [v0] Logout complete
```

---

## Test 7: Admin Operations (5 minutes)

### Step 7A: Admin Products (if creating/editing)
```
Navigate to: /admin/products
Look for: Products listed from API
Network: GET /api/products?page=1&limit=50
```

### Step 7B: Admin Orders
```
Navigate to: /admin/orders
Look for: Orders from /api/orders
Status updates: Try changing order status
Expected: Mutation call to PATCH /api/orders/:id/status
Cache invalidates and list updates
```

---

## Quick Troubleshooting

### "Can't login"
1. Check backend is running at http://luccibyey.com.tn/remquip/backend
2. Verify test credentials are correct
3. Check browser console for error message
4. Look for CORS errors in Network tab

### "Products not loading"
1. Check /api/products endpoint returns data
2. Response format should have: data array, pagination object
3. Check Network tab status code (should be 200)
4. Should fallback to demo data if API fails

### "Token not in requests"
1. Check localStorage has remquip_auth_token
2. Value should start with "eyJ..."
3. Check Network tab Authorization header
4. Try logging out and back in

### "Not staying logged in"
1. Check remquip_auth_token in localStorage persists
2. Verify /api/users/profile endpoint works
3. Token should be valid when retrieved
4. Check browser storage privacy settings

### "Redirect to login happens immediately"
1. Token might be invalid
2. Backend might be returning 401 for all requests
3. Check Authorization header format: "Bearer <token>"
4. Check token expiry/validity on backend

---

## Success Checklist

After running all tests, you should be able to check off:

```
Authentication
✅ Login with valid credentials works
✅ Invalid credentials show error
✅ Token stored in localStorage
✅ Bearer token in API requests
✅ Logout clears token
✅ Page reload keeps user logged in

Data Loading
✅ HomePage products from API
✅ ProductsPage products from API
✅ AdminOverview stats from API
✅ Admin pages load data
✅ Category filters work
✅ Search functionality works

Error Handling
✅ 401 redirects to login
✅ Network errors handled gracefully
✅ Server errors show user message
✅ Fallback to demo data works

API Integration
✅ All API calls have Authorization header
✅ Bearer token format correct
✅ Pagination works on product lists
✅ Admin mutations work (create/update/delete)
✅ Cache invalidation happens on mutations
```

---

## Next Steps

1. **If all tests pass**: Your backend integration is complete
2. **If some tests fail**: Use troubleshooting guide above
3. **For production**: 
   - Enable HTTPS
   - Set up error tracking
   - Configure token refresh (optional)
   - Test under load

---

## Getting Help

**Check these files for details**:
- `INTEGRATION_COMPLETE.md` - Complete testing checklist
- `BACKEND_INTEGRATION_SUMMARY.md` - Full technical overview
- `.env` - Configuration settings
- `src/contexts/AuthContext.tsx` - Auth logic
- `src/lib/api.ts` - API service

**Console Logs** (Look for `[v0]` prefix):
- Login events
- API calls
- Session changes
- Token operations

---

## Estimated Time: 30-45 minutes total

This quick start tests all critical functionality to ensure your backend integration is working correctly. If you complete all tests successfully, your application is ready for further development or deployment.
