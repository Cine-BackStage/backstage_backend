# Multi-Tenant Migration Guide

## Overview

This guide walks you through migrating your Cinema Management System from single-tenant to multi-tenant architecture. The migration includes database schema changes, authentication updates, and application code modifications.

## 🚨 Important: Backup First!

**ALWAYS backup your database before running any migration:**
```bash
pg_dump -h localhost -p 5432 -U cinema_user -d cinema_management > backup_before_multitenant.sql
```

## Migration Process

### Phase 1: Preparation & Validation

1. **Dry Run** - See what will be executed without making changes:
```bash
npm run migrate:multitenant:dry-run
```

2. **Validate Current State** - Check if migration has already been applied:
```bash
npm run migrate:multitenant:validate
```

### Phase 2: Database Migration

Choose one of these options:

**Option A: Full Automated Migration** (Recommended)
```bash
npm run multitenant:full-migration
```

**Option B: Step-by-Step Migration**
```bash
# 1. Backup current schema
npm run schema:backup

# 2. Run database migration (includes automatic backup)
npm run migrate:multitenant

# 3. Replace Prisma schema
npm run schema:replace

# 4. Generate new Prisma client
npm run build
```

**Option C: Migration without backup** (Only if you've already backed up)
```bash
npm run migrate:multitenant:no-backup
```

### Phase 3: Application Code Updates

The migration creates new multi-tenant versions of key files:
- `src/middleware/auth-multitenant.js` - Updated authentication
- `src/models/EmployeeMultiTenant.js` - Multi-tenant employee model
- `src/utils/tenant-query.js` - Tenant-scoped query utilities

**Update your imports in controllers and routes:**

```javascript
// Old imports
const { AuthService, authenticateEmployee } = require('../middleware/auth');
const EmployeePrisma = require('../models/EmployeePrisma');

// New imports
const { AuthService, authenticateEmployee } = require('../middleware/auth-multitenant');
const EmployeeMultiTenant = require('../models/EmployeeMultiTenant');
```

### Phase 4: Environment Setup

Update your `.env` file if needed (no changes required for default setup):

```env
# Database Configuration (unchanged)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=cinema_management
DB_USER=cinema_user
DB_PASSWORD=cinema_pass

# JWT Configuration (unchanged)
JWT_SECRET=fallback-secret
JWT_EXPIRES_IN=8h
```

## Key Changes After Migration

### 1. Database Schema Changes

#### New Tables:
- `company` - Central tenant entity
- `company_subscription` - Subscription management
- `system_admin` - Cross-tenant administrators

#### Updated Tables:
All business tables now include `company_id`:
- `customer` - Primary key: `[cpf, company_id]`
- `employee` - Primary key: `[cpf, company_id]`
- `inventory_item` - Primary key: `[company_id, sku]`
- `discount_code` - Primary key: `[company_id, code]`
- All other tables have `company_id` foreign key

### 2. Authentication Changes

#### Token Structure (Before):
```json
{
  "cpf": "12345678901",
  "employeeId": "ADMIN001",
  "role": "ADMIN",
  "permissions": {"all": true}
}
```

#### Token Structure (After):
```json
{
  "cpf": "12345678901",
  "companyId": "uuid-here",
  "employeeId": "ADMIN001",
  "role": "ADMIN",
  "permissions": {"all": true},
  "company": {
    "id": "uuid-here",
    "name": "Cinema Company"
  }
}
```

### 3. Request Context Changes

All authenticated requests now include:
```javascript
// Employee context
req.employee = {
  cpf: "12345678901",
  companyId: "uuid-here",
  employeeId: "ADMIN001",
  role: "ADMIN",
  // ... other fields
};

// Company context
req.company = {
  id: "uuid-here",
  name: "Cinema Company",
  cnpj: "00.000.000/0001-00",
  isActive: true,
  subscription: { /* subscription details */ }
};

// Tenant ID for queries
req.tenantId = "uuid-here";
```

### 4. Database Query Changes

#### Before (Single-tenant):
```javascript
const employees = await db.employee.findMany({
  where: { isActive: true }
});
```

#### After (Multi-tenant):
```javascript
const employees = await db.employee.findMany({
  where: {
    companyId: req.employee.companyId,
    isActive: true
  }
});

// Or use the tenant query builder
const employees = await db.employee.findMany({
  where: req.tenant.where({ isActive: true })
});
```

## Default Company Setup

The migration creates a default company with:
- **ID**: `00000000-0000-0000-0000-000000000001`
- **Name**: "Default Cinema Company"
- **CNPJ**: "00.000.000/0001-00"
- **Plan**: Enterprise (unlimited)

All existing data is automatically assigned to this default company.

## New Features Available

### 1. Company Management
```javascript
// Create new company
const company = await db.company.create({
  data: {
    name: "New Cinema Chain",
    cnpj: "12.345.678/0001-99",
    // ... other fields
  }
});
```

### 2. Subscription Limits
```javascript
// Automatically enforced in employee creation
const employee = await EmployeeMultiTenant.createEmployee({
  companyId: "company-uuid",
  // ... employee data
}); // Will throw error if subscription limit reached
```

### 3. Cross-tenant Administration
```javascript
// System admin can manage all companies
app.get('/admin/companies', authenticateSystemAdmin, (req, res) => {
  // Access all companies
});
```

## Testing the Migration

### 1. Generate New Tokens
```bash
# Generate token for default company
npm run token

# The token will now include company context
```

### 2. Test API Endpoints
```bash
# Test employee endpoint
curl -H "Authorization: Bearer YOUR_NEW_TOKEN" \
     http://localhost:3000/api/employees/me
```

### 3. Verify Data Isolation
Create a second company and verify data separation:
```javascript
// All queries are automatically scoped to employee's company
// No cross-company data leakage
```

## Rollback Procedure

If you need to rollback:

1. **Stop the application**
2. **Restore database from backup:**
```bash
psql -h localhost -p 5432 -U cinema_user -d cinema_management < backup_before_multitenant.sql
```
3. **Restore original schema:**
```bash
cp prisma/schema-backup.prisma prisma/schema.prisma
npm run build
```

## Troubleshooting

### Migration Fails
- Check database connection
- Ensure database user has sufficient permissions
- Review error logs for specific issues

### Authentication Errors After Migration
- Generate new tokens with updated structure
- Update client applications to use new token format
- Verify company_id is present in tokens

### Data Not Visible
- Verify tokens contain correct company_id
- Check that queries include company scoping
- Confirm employee belongs to correct company

## Performance Considerations

### Indexes Added
The migration adds comprehensive indexes for multi-tenant queries:
- `idx_*_company` - Company-based filtering
- `idx_*_company_active` - Company + status filtering
- `idx_*_company_*` - Combined filtering indexes

### Query Performance
- All queries now include company_id filtering
- Compound indexes ensure efficient lookups
- Consider query patterns in your specific use case

## Security Enhancements

### Row-Level Security
- Complete data isolation between companies
- Company context enforced at middleware level
- No cross-tenant data access possible

### Subscription Enforcement
- Employee limits enforced automatically
- Room limits checked before creation
- Subscription status validated on each request

## Next Steps

1. **Test thoroughly** in staging environment
2. **Update frontend** applications for new token structure
3. **Plan company onboarding** process
4. **Set up subscription management**
5. **Configure monitoring** for multi-tenant metrics

The migration transforms your system into a robust multi-tenant SaaS platform ready to serve multiple cinema companies with complete data isolation and subscription-based billing.