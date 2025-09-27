/**
 * Multi-Tenant Query Utilities
 * Helper functions for tenant-scoped database queries
 */

/**
 * Add company filter to Prisma query where clause
 * @param {string} companyId - Company UUID
 * @param {Object} existingWhere - Existing where clause
 * @returns {Object} Updated where clause with company filter
 */
const addCompanyFilter = (companyId, existingWhere = {}) => {
  return {
    ...existingWhere,
    companyId
  };
};

/**
 * Add company filter for compound key tables (like Customer, Employee)
 * @param {string} companyId - Company UUID
 * @param {Object} existingWhere - Existing where clause
 * @returns {Object} Updated where clause with company filter
 */
const addCompoundKeyFilter = (companyId, existingWhere = {}) => {
  return {
    ...existingWhere,
    companyId
  };
};

/**
 * Tenant-scoped query builder for common operations
 */
class TenantQueryBuilder {
  constructor(companyId) {
    this.companyId = companyId;
  }

  /**
   * Build where clause for single-tenant tables
   * @param {Object} filters - Additional filters
   * @returns {Object} Complete where clause
   */
  where(filters = {}) {
    return addCompanyFilter(this.companyId, filters);
  }

  /**
   * Build where clause for compound key tables
   * @param {Object} filters - Additional filters
   * @returns {Object} Complete where clause
   */
  compoundWhere(filters = {}) {
    return addCompoundKeyFilter(this.companyId, filters);
  }

  /**
   * Build create data with company context
   * @param {Object} data - Create data
   * @returns {Object} Data with companyId
   */
  createData(data) {
    return {
      ...data,
      companyId: this.companyId
    };
  }

  /**
   * Build update data (excludes companyId to prevent changes)
   * @param {Object} data - Update data
   * @returns {Object} Filtered update data
   */
  updateData(data) {
    const { companyId, ...updateData } = data;
    return updateData;
  }

  /**
   * Pagination with tenant context
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {Object} Skip and take values
   */
  paginate(page = 1, limit = 50) {
    const skip = (Math.max(1, page) - 1) * limit;
    return { skip, take: Math.min(limit, 100) }; // Max 100 items per page
  }

  /**
   * Build include clause for related company data
   * @param {Object} include - Additional includes
   * @returns {Object} Complete include clause
   */
  includeWithCompany(include = {}) {
    return {
      ...include,
      company: {
        select: {
          id: true,
          name: true,
          tradeName: true,
          isActive: true
        }
      }
    };
  }
}

/**
 * Common tenant-scoped queries
 */
const TenantQueries = {
  /**
   * Find employee by compound key (cpf + companyId)
   * @param {Object} db - Prisma client
   * @param {string} companyId - Company UUID
   * @param {string} cpf - Employee CPF
   * @param {Object} options - Query options (include, select, etc.)
   */
  findEmployee: async (db, companyId, cpf, options = {}) => {
    return db.employee.findFirst({
      where: { cpf, companyId },
      ...options
    });
  },

  /**
   * Find customer by compound key (cpf + companyId)
   * @param {Object} db - Prisma client
   * @param {string} companyId - Company UUID
   * @param {string} cpf - Customer CPF
   * @param {Object} options - Query options
   */
  findCustomer: async (db, companyId, cpf, options = {}) => {
    return db.customer.findFirst({
      where: { cpf, companyId },
      ...options
    });
  },

  /**
   * Find inventory item by compound key (companyId + sku)
   * @param {Object} db - Prisma client
   * @param {string} companyId - Company UUID
   * @param {string} sku - Item SKU
   * @param {Object} options - Query options
   */
  findInventoryItem: async (db, companyId, sku, options = {}) => {
    return db.inventoryItem.findFirst({
      where: { companyId, sku },
      ...options
    });
  },

  /**
   * Find discount code by compound key (companyId + code)
   * @param {Object} db - Prisma client
   * @param {string} companyId - Company UUID
   * @param {string} code - Discount code
   * @param {Object} options - Query options
   */
  findDiscountCode: async (db, companyId, code, options = {}) => {
    return db.discountCode.findFirst({
      where: { companyId, code },
      ...options
    });
  },

  /**
   * Get company statistics
   * @param {Object} db - Prisma client
   * @param {string} companyId - Company UUID
   */
  getCompanyStats: async (db, companyId) => {
    const [
      employeeCount,
      customerCount,
      movieCount,
      roomCount,
      activeSessionCount,
      totalSales,
      inventoryItemCount
    ] = await Promise.all([
      db.employee.count({ where: { companyId, isActive: true } }),
      db.customer.count({ where: { companyId } }),
      db.movie.count({ where: { companyId, isActive: true } }),
      db.room.count({ where: { companyId, isActive: true } }),
      db.session.count({ where: { companyId, status: 'SCHEDULED' } }),
      db.sale.aggregate({
        where: { companyId, status: 'FINALIZED' },
        _sum: { grandTotal: true },
        _count: true
      }),
      db.inventoryItem.count({ where: { companyId, isActive: true } })
    ]);

    return {
      employees: employeeCount,
      customers: customerCount,
      movies: movieCount,
      rooms: roomCount,
      activeSessions: activeSessionCount,
      totalSalesAmount: totalSales._sum.grandTotal || 0,
      totalSalesCount: totalSales._count,
      inventoryItems: inventoryItemCount
    };
  },

  /**
   * Check subscription limits
   * @param {Object} db - Prisma client
   * @param {string} companyId - Company UUID
   */
  checkSubscriptionUsage: async (db, companyId) => {
    const company = await db.company.findFirst({
      where: { id: companyId },
      include: { subscription: true }
    });

    if (!company?.subscription) {
      return { withinLimits: true, usage: {} };
    }

    const [employeeCount, roomCount] = await Promise.all([
      db.employee.count({ where: { companyId, isActive: true } }),
      db.room.count({ where: { companyId, isActive: true } })
    ]);

    const subscription = company.subscription;
    const usage = {
      employees: {
        current: employeeCount,
        limit: subscription.maxEmployees,
        percentage: (employeeCount / subscription.maxEmployees) * 100
      },
      rooms: {
        current: roomCount,
        limit: subscription.maxRooms,
        percentage: (roomCount / subscription.maxRooms) * 100
      }
    };

    const withinLimits = employeeCount <= subscription.maxEmployees &&
                        roomCount <= subscription.maxRooms;

    return { withinLimits, usage, subscription };
  }
};

/**
 * Middleware to add tenant query builder to request
 */
const addTenantQuery = (req, res, next) => {
  if (req.employee?.companyId) {
    req.tenant = new TenantQueryBuilder(req.employee.companyId);
  }
  next();
};

/**
 * Validation helpers for multi-tenant operations
 */
const TenantValidators = {
  /**
   * Validate that employee belongs to company
   * @param {Object} db - Prisma client
   * @param {string} companyId - Company UUID
   * @param {string} employeeCpf - Employee CPF
   */
  validateEmployeeBelongsToCompany: async (db, companyId, employeeCpf) => {
    const employee = await db.employee.findFirst({
      where: { cpf: employeeCpf, companyId }
    });

    if (!employee) {
      throw new Error('Employee not found in company');
    }

    return employee;
  },

  /**
   * Validate that resource belongs to company
   * @param {Object} db - Prisma client
   * @param {string} table - Table name
   * @param {string} resourceId - Resource ID
   * @param {string} companyId - Company UUID
   */
  validateResourceBelongsToCompany: async (db, table, resourceId, companyId) => {
    const resource = await db[table].findFirst({
      where: { id: resourceId, companyId }
    });

    if (!resource) {
      throw new Error(`${table} not found in company`);
    }

    return resource;
  },

  /**
   * Validate unique constraint within company
   * @param {Object} db - Prisma client
   * @param {string} table - Table name
   * @param {Object} criteria - Uniqueness criteria
   * @param {string} companyId - Company UUID
   * @param {string} excludeId - ID to exclude from check (for updates)
   */
  validateUniqueInCompany: async (db, table, criteria, companyId, excludeId = null) => {
    const where = {
      ...criteria,
      companyId,
      ...(excludeId && { id: { not: excludeId } })
    };

    const existing = await db[table].findFirst({ where });

    if (existing) {
      const fields = Object.keys(criteria).join(', ');
      throw new Error(`${fields} already exists in company`);
    }

    return true;
  }
};

module.exports = {
  addCompanyFilter,
  addCompoundKeyFilter,
  TenantQueryBuilder,
  TenantQueries,
  addTenantQuery,
  TenantValidators
};