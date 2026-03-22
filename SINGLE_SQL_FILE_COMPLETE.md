# REMQUIP - Complete Database Schema (Single SQL File)

## File Location
**`scripts/remquip-database-complete.sql`** (706 lines)

This is your **COMPLETE, FINAL, PRODUCTION-READY** single SQL migration file containing ALL tables needed for the entire REMQUIP platform.

---

## What's Included

### 20 Database Tables

**User Management (4 tables)**
1. `remquip_users` - User accounts with 4 roles
2. `remquip_user_sessions` - Token-based sessions
3. `remquip_user_addresses` - Shipping/billing addresses
4. `remquip_admin_contacts` - Admin contact info

**Admin System (1 table)**
5. `remquip_admin_permissions` - 27 granular permissions

**Products (4 tables)**
6. `remquip_categories` - Product categories
7. `remquip_products` - Core products with pricing tiers
8. `remquip_product_images` - Product images
9. `remquip_product_variants` - Product variants

**Promotions (1 table)**
10. `remquip_discounts` - Discount codes

**Orders (4 tables)**
11. `remquip_orders` - Customer orders
12. `remquip_order_items` - Order line items
13. `remquip_order_notes` - Order communication
14. `remquip_order_tracking` - Delivery tracking

**Inventory (1 table)**
15. `remquip_inventory_logs` - Stock transaction log

**Content & Analytics (5 tables)**
16. `remquip_audit_logs` - Admin action logging
17. `remquip_cms_pages` - Website content pages
18. `remquip_cms_sections` - Page sections
19. `remquip_customer_settings` - User preferences
20. `remquip_analytics` - Analytics snapshots

---

## Features

✓ Full referential integrity with foreign keys  
✓ Optimized indexes for performance  
✓ UTF-8 character support (international ready)  
✓ Proper enum types for status fields  
✓ JSON support for flexible data storage  
✓ Timestamps for all entities  
✓ Audit trails for compliance  
✓ Role-based permission system  
✓ Multi-level address management  
✓ Complete order lifecycle tracking  
✓ Product variant support  
✓ Discount/promotion system  
✓ CMS/content management  
✓ Session management with tokens  
✓ Analytics data collection  

---

## Installation

```bash
# 1. Connect to MySQL
mysql -u root -p

# 2. Run the migration
source /path/to/scripts/remquip-database-complete.sql

# Or from command line:
mysql -u root -p < scripts/remquip-database-complete.sql
```

---

## User Roles (Built In)

1. **customer** - Regular user, can view products and orders
2. **admin** - Can manage products, orders, customers, inventory
3. **manager** - Can manage staff and some settings
4. **super_admin** - Full access to everything including audit logs

---

## Key Features

### Authentication
- Token-based JWT support
- Session management
- Token refresh capability
- Password hashing ready

### User Dashboard
- Order history with tracking
- Address management
- Settings/preferences
- Admin contact directory

### Admin System
- Granular permissions (27 types)
- Role hierarchy
- Permission override capability
- Audit logging of all actions

### Product Management
- Categories with hierarchy
- Product variants
- Multiple images per product
- Pricing tiers (retail, wholesale, distributor)
- Stock tracking

### Order Management
- Complete order lifecycle
- Delivery tracking
- Order notes/communication
- Payment status tracking
- Tax and shipping calculations

### Inventory
- Transaction logging
- Movement tracking
- Low-stock alerts support
- Quantity history

### Analytics
- Daily metrics snapshots
- Revenue tracking
- Top products
- Customer metrics

---

## Relationships (All Enforced)

```
Users ──┬─→ Sessions
        ├─→ Addresses
        ├─→ Orders
        ├─→ Permissions
        ├─→ Contacts
        ├─→ Settings
        ├─→ Products (created_by)
        ├─→ Audit Logs
        └─→ CMS Pages

Products ──┬─→ Categories
           ├─→ Images
           ├─→ Variants
           ├─→ Inventory Logs
           ├─→ Order Items
           └─→ Analytics

Orders ──┬─→ Customers (Users)
         ├─→ Order Items
         ├─→ Order Notes
         ├─→ Tracking
         ├─→ Addresses (shipping/billing)
         └─→ Discounts

Categories ──→ Products
          └─→ Subcategories (self-join)

CMS Pages ──→ Sections
         └─→ Audit Trail
```

---

## Size & Performance

- **Total Lines**: 706
- **Total Tables**: 20
- **Total Indexes**: 40+
- **Foreign Keys**: 30+
- **Enum Types**: 15+
- **Estimated DB Size**: < 100MB for first 10,000 orders

---

## Next Steps

1. **Execute the SQL file** in your MySQL database
2. **Update backend** to use these tables
3. **Connect frontend APIs** (already prepared)
4. **Run migrations** on production database
5. **Verify all endpoints** work with new schema

---

## Support

All tables are documented with comments explaining:
- Purpose of each table
- Relationships and constraints
- Indexing strategy
- Data types and limits

The schema is production-ready and fully normalized for:
- Data integrity
- Query performance
- Scalability
- Compliance/audit
- User privacy

---

## Status: ✓ COMPLETE AND READY

Everything you need is in this single SQL file. No additional tables needed. Production-ready.
