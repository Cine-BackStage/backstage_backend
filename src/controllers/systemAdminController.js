/**
 * System Admin Controller
 * Cross-tenant administrative operations
 */

const { db } = require('../database/prisma');
const { SystemAdminAuth } = require('../../scripts/generate-sysadmin-token');
const bcrypt = require('bcryptjs');
const Joi = require('joi');

// Validation schemas
const systemAdminLoginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  password: Joi.string().required().min(6)
});

const createCompanySchema = Joi.object({
  name: Joi.string().required().min(2).max(200),
  cnpj: Joi.string().required().pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/),
  tradeName: Joi.string().optional().max(200),
  address: Joi.string().optional().max(500),
  city: Joi.string().optional().max(100),
  state: Joi.string().optional().length(2),
  zipCode: Joi.string().optional().max(10),
  phone: Joi.string().optional().max(20),
  email: Joi.string().optional().email().max(200),
  website: Joi.string().optional().uri().max(200),
  subscriptionPlan: Joi.string().valid('BASIC', 'PREMIUM', 'ENTERPRISE').default('BASIC'),
  maxEmployees: Joi.number().integer().min(1).default(50),
  maxRooms: Joi.number().integer().min(1).default(10),
  monthlyFee: Joi.number().min(0).default(99.99)
});

const updateCompanySchema = Joi.object({
  name: Joi.string().optional().min(2).max(200),
  tradeName: Joi.string().optional().max(200),
  address: Joi.string().optional().max(500),
  city: Joi.string().optional().max(100),
  state: Joi.string().optional().length(2),
  zipCode: Joi.string().optional().max(10),
  phone: Joi.string().optional().max(20),
  email: Joi.string().optional().email().max(200),
  website: Joi.string().optional().uri().max(200),
  isActive: Joi.boolean().optional()
});

const updateSubscriptionSchema = Joi.object({
  plan: Joi.string().valid('BASIC', 'PREMIUM', 'ENTERPRISE').optional(),
  maxEmployees: Joi.number().integer().min(1).optional(),
  maxRooms: Joi.number().integer().min(1).optional(),
  monthlyFee: Joi.number().min(0).optional(),
  isActive: Joi.boolean().optional(),
  endDate: Joi.date().optional().allow(null)
});

/**
 * System Admin Login
 */
const login = async (req, res) => {
  try {
    const { error, value } = systemAdminLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details
      });
    }

    const { username, password } = value;

    // Find system admin
    const admin = await db.systemAdmin.findFirst({
      where: {
        username,
        isActive: true
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await db.systemAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    // Generate token
    const token = SystemAdminAuth.generateToken(admin);

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          lastLogin: new Date()
        }
      }
    });

  } catch (error) {
    console.error('System admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get all companies (system admin view)
 */
const getAllCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      isActive
    } = req.query;

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100);

    // Build where clause
    const where = {
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { tradeName: { contains: search, mode: 'insensitive' } },
          { cnpj: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [companies, totalCount] = await Promise.all([
      db.company.findMany({
        where,
        include: {
          subscription: true,
          _count: {
            select: {
              employees: true,
              customers: true,
              movies: true,
              rooms: true,
              sales: true
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' }
        ],
        skip,
        take
      }),
      db.company.count({ where })
    ]);

    res.json({
      success: true,
      data: companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve companies'
    });
  }
};

/**
 * Get company details by ID
 */
const getCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await db.company.findFirst({
      where: { id: companyId },
      include: {
        subscription: true,
        _count: {
          select: {
            employees: true,
            customers: true,
            movies: true,
            rooms: true,
            sessions: true,
            sales: true,
            inventoryItems: true,
            discountCodes: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Get additional statistics
    const [salesStats, recentActivity] = await Promise.all([
      db.sale.aggregate({
        where: {
          companyId,
          status: 'FINALIZED',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        _sum: { grandTotal: true },
        _count: true
      }),
      db.auditLog.findMany({
        where: { companyId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          actor: {
            include: { person: true }
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        ...company,
        stats: {
          ...company._count,
          salesLast30Days: {
            totalAmount: salesStats._sum.grandTotal || 0,
            totalCount: salesStats._count
          }
        },
        recentActivity
      }
    });

  } catch (error) {
    console.error('Get company by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve company details'
    });
  }
};

/**
 * Create new company
 */
const createCompany = async (req, res) => {
  try {
    const { error, value } = createCompanySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details
      });
    }

    const {
      subscriptionPlan,
      maxEmployees,
      maxRooms,
      monthlyFee,
      ...companyData
    } = value;

    // Check if CNPJ already exists
    const existingCompany = await db.company.findFirst({
      where: { cnpj: companyData.cnpj }
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'CNPJ already exists'
      });
    }

    // Create company with subscription in transaction
    const result = await db.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: companyData
      });

      const subscription = await tx.companySubscription.create({
        data: {
          companyId: company.id,
          plan: subscriptionPlan,
          startDate: new Date(),
          maxEmployees,
          maxRooms,
          monthlyFee,
          isActive: true
        }
      });

      return { company, subscription };
    });

    res.status(201).json({
      success: true,
      data: {
        ...result.company,
        subscription: result.subscription
      }
    });

  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company'
    });
  }
};

/**
 * Update company
 */
const updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { error, value } = updateCompanySchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details
      });
    }

    // Check if company exists
    const existingCompany = await db.company.findFirst({
      where: { id: companyId }
    });

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const updatedCompany = await db.company.update({
      where: { id: companyId },
      data: {
        ...value,
        updatedAt: new Date()
      },
      include: {
        subscription: true
      }
    });

    res.json({
      success: true,
      data: updatedCompany
    });

  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company'
    });
  }
};

/**
 * Update company subscription
 */
const updateSubscription = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { error, value } = updateSubscriptionSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details
      });
    }

    // Check if company exists
    const existingCompany = await db.company.findFirst({
      where: { id: companyId },
      include: { subscription: true }
    });

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (!existingCompany.subscription) {
      return res.status(404).json({
        success: false,
        message: 'Company subscription not found'
      });
    }

    const updatedSubscription = await db.companySubscription.update({
      where: { companyId },
      data: {
        ...value,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updatedSubscription
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
};

/**
 * Get platform statistics
 */
const getPlatformStats = async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      totalEmployees,
      totalCustomers,
      totalSales,
      subscriptionDistribution,
      recentCompanies
    ] = await Promise.all([
      db.company.count(),
      db.company.count({ where: { isActive: true } }),
      db.employee.count({ where: { isActive: true } }),
      db.customer.count(),
      db.sale.aggregate({
        where: { status: 'FINALIZED' },
        _sum: { grandTotal: true },
        _count: true
      }),
      db.companySubscription.groupBy({
        by: ['plan'],
        where: { isActive: true },
        _count: true
      }),
      db.company.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          subscription: true,
          _count: {
            select: { employees: true, customers: true }
          }
        }
      })
    ]);

    const monthlyRevenue = await db.companySubscription.aggregate({
      where: { isActive: true },
      _sum: { monthlyFee: true }
    });

    res.json({
      success: true,
      data: {
        platform: {
          totalCompanies,
          activeCompanies,
          inactiveCompanies: totalCompanies - activeCompanies
        },
        users: {
          totalEmployees,
          totalCustomers
        },
        sales: {
          totalAmount: totalSales._sum.grandTotal || 0,
          totalCount: totalSales._count
        },
        revenue: {
          monthlyRecurring: monthlyRevenue._sum.monthlyFee || 0
        },
        subscriptions: subscriptionDistribution.reduce((acc, item) => {
          acc[item.plan] = item._count;
          return acc;
        }, {}),
        recentCompanies
      }
    });

  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform statistics'
    });
  }
};

/**
 * Get company employees (cross-tenant access)
 */
const getCompanyEmployees = async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      page = 1,
      limit = 50,
      role,
      isActive = true,
      search
    } = req.query;

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100);

    const where = {
      companyId,
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(role && { role }),
      ...(search && {
        OR: [
          { employeeId: { contains: search, mode: 'insensitive' } },
          { person: { fullName: { contains: search, mode: 'insensitive' } } },
          { person: { email: { contains: search, mode: 'insensitive' } } }
        ]
      })
    };

    const [employees, totalCount] = await Promise.all([
      db.employee.findMany({
        where,
        include: {
          person: true,
          company: {
            select: { name: true, tradeName: true }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { person: { fullName: 'asc' } }
        ],
        skip,
        take
      }),
      db.employee.count({ where })
    ]);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get company employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve company employees'
    });
  }
};

/**
 * Get cross-tenant audit logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      companyId,
      action,
      startDate,
      endDate
    } = req.query;

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100);

    const where = {
      ...(companyId && { companyId }),
      ...(action && { action: { contains: action, mode: 'insensitive' } }),
      ...(startDate || endDate) && {
        timestamp: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      }
    };

    const [auditLogs, totalCount] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          company: {
            select: { name: true, tradeName: true }
          },
          actor: {
            include: { person: true }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take
      }),
      db.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs'
    });
  }
};

const deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Deactivate company instead of deleting
    const company = await db.company.update({
      where: { id: companyId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Company deactivated successfully',
      data: company
    });

  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate company'
    });
  }
};

const getCompanyCustomers = async (req, res) => {
  try {
    const { companyId } = req.params;

    const customers = await db.customer.findMany({
      where: { companyId },
      include: {
        person: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: customers
    });

  } catch (error) {
    console.error('Get company customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve company customers'
    });
  }
};

module.exports = {
  login,
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  updateSubscription,
  getPlatformStats,
  getCompanyEmployees,
  getCompanyCustomers,
  getAuditLogs
};