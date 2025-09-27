const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../database/prisma');

class AuthService {
  /**
   * Generate JWT token for multi-tenant employee
   * @param {Object} employee - Employee object with company information
   * @returns {string} JWT token
   */
  static generateToken(employee) {
    const payload = {
      cpf: employee.cpf,
      companyId: employee.companyId,
      employeeId: employee.employeeId,
      role: employee.role,
      permissions: employee.permissions || {},
      // Add company context for enhanced security
      company: {
        id: employee.companyId,
        name: employee.company?.name
      }
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Hash password for storage
   * @param {string} password - Plain text password
   * @returns {string} Hashed password
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {boolean} Password match result
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate company access and subscription
   * @param {string} companyId - Company UUID
   * @returns {Object} Company with subscription info
   */
  static async validateCompanyAccess(companyId) {
    const company = await db.company.findFirst({
      where: {
        id: companyId,
        isActive: true
      },
      include: {
        subscription: true
      }
    });

    if (!company) {
      throw new Error('Company not found or inactive');
    }

    // Check subscription status
    if (company.subscription && !company.subscription.isActive) {
      throw new Error('Company subscription is inactive');
    }

    // Check subscription expiry
    if (company.subscription?.endDate && new Date() > company.subscription.endDate) {
      throw new Error('Company subscription has expired');
    }

    return company;
  }
}

/**
 * Multi-tenant employee authentication middleware
 * Validates JWT token and enforces company-level access control
 */
const authenticateEmployee = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);

    // Validate required token fields for multi-tenancy
    if (!decoded.cpf || !decoded.companyId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format - missing company context'
      });
    }

    // Verify employee still exists and is active in the company
    const employee = await db.employee.findFirst({
      where: {
        cpf: decoded.cpf,
        companyId: decoded.companyId,
        isActive: true
      },
      include: {
        person: true,
        company: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Employee not found or inactive'
      });
    }

    // Validate company access and subscription
    try {
      await AuthService.validateCompanyAccess(employee.companyId);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Attach employee and company info to request
    req.employee = {
      cpf: employee.cpf,
      companyId: employee.companyId,
      employeeId: employee.employeeId,
      role: employee.role,
      permissions: employee.permissions || {},
      fullName: employee.person.fullName,
      email: employee.person.email,
      isActive: employee.isActive
    };

    req.company = {
      id: employee.company.id,
      name: employee.company.name,
      cnpj: employee.company.cnpj,
      isActive: employee.company.isActive,
      subscription: employee.company.subscription
    };

    // Add tenant context for all database queries
    req.tenantId = employee.companyId;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Role-based authorization middleware for multi-tenant environment
 * @param {...string} allowedRoles - Roles allowed to access the resource
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.employee.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: req.employee.role
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 * @param {string} permission - Required permission
 * @param {boolean} requireAll - Whether all permissions are required (default: false)
 */
const authorizePermissions = (requiredPermissions, requireAll = false) => {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { permissions } = req.employee;

    // Admin role has all permissions
    if (req.employee.role === 'ADMIN' || permissions.all) {
      return next();
    }

    const permissionsToCheck = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    const hasPermissions = requireAll
      ? permissionsToCheck.every(permission => permissions[permission])
      : permissionsToCheck.some(permission => permissions[permission]);

    if (!hasPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: permissionsToCheck,
        requireAll
      });
    }

    next();
  };
};

/**
 * Company-level resource authorization
 * Ensures that resources belong to the authenticated user's company
 * @param {string} resourceCompanyIdField - Field name containing the resource's company ID
 */
const authorizeCompanyResource = (resourceCompanyIdField = 'companyId') => {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Extract company ID from request body, params, or query
    const resourceCompanyId = req.body[resourceCompanyIdField]
      || req.params[resourceCompanyIdField]
      || req.query[resourceCompanyIdField];

    // If no company ID is provided, use the employee's company (for creation scenarios)
    if (!resourceCompanyId) {
      req.body[resourceCompanyIdField] = req.employee.companyId;
      return next();
    }

    // Verify the resource belongs to the employee's company
    if (resourceCompanyId !== req.employee.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - resource belongs to different company'
      });
    }

    next();
  };
};

/**
 * Subscription limits enforcement middleware
 * @param {string} limitType - Type of limit to check (employees, rooms, etc.)
 * @param {Function} countFunction - Function to count current usage
 */
const enforceSubscriptionLimits = (limitType, countFunction) => {
  return async (req, res, next) => {
    try {
      if (!req.company?.subscription) {
        return next(); // Skip if no subscription info
      }

      const subscription = req.company.subscription;
      const limitField = `max${limitType.charAt(0).toUpperCase() + limitType.slice(1)}s`;
      const maxAllowed = subscription[limitField];

      if (!maxAllowed || maxAllowed === 0) {
        return next(); // No limit configured
      }

      const currentCount = await countFunction(req.employee.companyId);

      if (currentCount >= maxAllowed) {
        return res.status(403).json({
          success: false,
          message: `Subscription limit exceeded for ${limitType}`,
          limit: maxAllowed,
          current: currentCount
        });
      }

      next();
    } catch (error) {
      console.error('Subscription limit check failed:', error);
      next(); // Continue on error to avoid blocking operations
    }
  };
};

/**
 * Multi-tenant audit logging middleware
 * Logs all authenticated actions with company context
 */
const auditLogger = (action, targetType) => {
  return async (req, res, next) => {
    // Continue with request processing
    next();

    // Log audit entry asynchronously (don't block response)
    setImmediate(async () => {
      try {
        if (!req.employee) return;

        const metadata = {
          method: req.method,
          url: req.originalUrl,
          userAgent: req.get('User-Agent'),
          body: req.method !== 'GET' ? req.body : undefined,
          query: req.query
        };

        await db.auditLog.create({
          data: {
            companyId: req.employee.companyId,
            actorCpf: req.employee.cpf,
            action,
            targetType,
            targetId: req.params.id || req.params.cpf || req.params.sku,
            metadataJson: metadata,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          }
        });
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    });
  };
};

/**
 * System admin authentication middleware
 * For cross-tenant administrative operations
 */
const authenticateSystemAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyToken(token);

    // System admin tokens have different structure
    if (!decoded.adminId || decoded.type !== 'system_admin') {
      return res.status(401).json({
        success: false,
        message: 'System admin token required'
      });
    }

    // Verify system admin exists and is active
    const admin = await db.systemAdmin.findFirst({
      where: {
        id: decoded.adminId,
        isActive: true
      }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'System admin not found or inactive'
      });
    }

    req.systemAdmin = {
      id: admin.id,
      username: admin.username,
      email: admin.email
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  AuthService,
  authenticateEmployee,
  authenticateSystemAdmin,
  authorizeRoles,
  authorizePermissions,
  authorizeCompanyResource,
  enforceSubscriptionLimits,
  auditLogger
};