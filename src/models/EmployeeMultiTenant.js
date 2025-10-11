/**
 * Multi-Tenant Employee Model
 * Handles all employee-related database operations with company scoping
 */

const { db } = require('../database/prisma');
const { AuthService } = require('../middleware/auth-multitenant');
const { TenantQueries, TenantValidators } = require('../utils/tenant-query');

class EmployeeMultiTenant {
  /**
   * Create a new employee within a company
   * @param {Object} data - Employee data
   * @param {string} data.companyId - Company UUID
   * @param {string} data.cpf - Employee CPF
   * @param {string} data.employeeId - Unique employee ID within company
   * @param {Object} data.person - Person information (fullName, email, phone)
   * @param {string} data.role - Employee role
   * @param {string} data.password - Plain text password
   * @param {Object} data.permissions - Employee permissions
   * @returns {Object} Created employee with person data
   */
  static async createEmployee(data) {
    const {
      companyId,
      cpf,
      employeeId,
      fullName,
      email,
      phone,
      role,
      password,
      permissions = {},
      hireDate = new Date()
    } = data;

    // Validate company exists and is active
    const company = await db.company.findFirst({
      where: { id: companyId, isActive: true },
      include: { subscription: true }
    });

    if (!company) {
      throw new Error('Company not found or inactive');
    }

    // Check subscription limits for employees
    if (company.subscription) {
      const currentEmployeeCount = await db.employee.count({
        where: { companyId, isActive: true }
      });

      if (currentEmployeeCount >= company.subscription.maxEmployees) {
        throw new Error(`Employee limit reached (${company.subscription.maxEmployees})`);
      }
    }

    // Validate unique employee ID within company
    const existingEmployee = await db.employee.findFirst({
      where: { companyId, employeeId }
    });

    if (existingEmployee) {
      throw new Error('Employee ID already exists in company');
    }

    // Validate unique CPF (across all companies for person table)
    const existingPerson = await db.person.findFirst({
      where: { cpf }
    });

    const hashedPassword = await AuthService.hashPassword(password);

    return await db.$transaction(async (tx) => {
      // Create or update person record
      const _person = existingPerson
        ? await tx.person.update({
          where: { cpf },
          data: { fullName, email, phone, updatedAt: new Date() }
        })
        : await tx.person.create({
          data: { cpf, fullName, email, phone }
        });

      // Create employee record
      const employee = await tx.employee.create({
        data: {
          cpf,
          companyId,
          employeeId,
          role,
          hireDate: new Date(hireDate),
          passwordHash: hashedPassword,
          permissions,
          isActive: true
        },
        include: {
          person: true,
          company: {
            select: {
              id: true,
              name: true,
              tradeName: true
            }
          }
        }
      });

      return employee;
    });
  }

  /**
   * Find employee by CPF and company
   * @param {string} companyId - Company UUID
   * @param {string} cpf - Employee CPF
   * @param {Object} options - Query options (include, select, etc.)
   */
  static async findByCpf(companyId, cpf, options = {}) {
    return TenantQueries.findEmployee(db, companyId, cpf, {
      include: {
        person: true,
        company: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            isActive: true
          }
        },
        timeEntries: {
          orderBy: { timestamp: 'desc' },
          take: 5 // Last 5 time entries
        },
        ...options.include
      },
      ...options
    });
  }

  /**
   * Find employee by employee ID and company
   * @param {string} companyId - Company UUID
   * @param {string} employeeId - Employee ID
   */
  static async findByEmployeeId(companyId, employeeId, options = {}) {
    return db.employee.findFirst({
      where: { companyId, employeeId },
      include: {
        person: true,
        company: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            isActive: true
          }
        },
        ...options.include
      },
      ...options
    });
  }

  /**
   * List all employees in a company with filtering and pagination
   * @param {string} companyId - Company UUID
   * @param {Object} filters - Query filters
   * @param {Object} pagination - Pagination options
   */
  static async listEmployees(companyId, filters = {}, pagination = {}) {
    const {
      search,
      role,
      isActive = true,
      page = 1,
      limit = 50
    } = { ...filters, ...pagination };

    const skip = (Math.max(1, page) - 1) * limit;
    const take = Math.min(limit, 100);

    // Build where clause
    const where = {
      companyId,
      ...(isActive !== undefined && { isActive }),
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
          timeEntries: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 1
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

    return {
      employees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Update employee information
   * @param {string} companyId - Company UUID
   * @param {string} cpf - Employee CPF
   * @param {Object} updates - Update data
   */
  static async updateEmployee(companyId, cpf, updates) {
    const {
      fullName,
      email,
      phone,
      role,
      permissions,
      isActive,
      password
    } = updates;

    // Validate employee exists in company
    const employee = await TenantQueries.findEmployee(db, companyId, cpf);
    if (!employee) {
      throw new Error('Employee not found in company');
    }

    return await db.$transaction(async (tx) => {
      // Update person information if provided
      if (fullName || email || phone) {
        await tx.person.update({
          where: { cpf },
          data: {
            ...(fullName && { fullName }),
            ...(email && { email }),
            ...(phone && { phone }),
            updatedAt: new Date()
          }
        });
      }

      // Update employee information
      const employeeUpdates = {
        ...(role && { role }),
        ...(permissions && { permissions }),
        ...(isActive !== undefined && { isActive }),
        ...(password && { passwordHash: await AuthService.hashPassword(password) }),
        updatedAt: new Date()
      };

      const updatedEmployee = await tx.employee.update({
        where: {
          cpf_companyId: { cpf, companyId }
        },
        data: employeeUpdates,
        include: {
          person: true,
          company: {
            select: {
              id: true,
              name: true,
              tradeName: true
            }
          }
        }
      });

      return updatedEmployee;
    });
  }

  /**
   * Authenticate employee login
   * @param {string} companyId - Company UUID
   * @param {string} employeeId - Employee ID
   * @param {string} password - Plain text password
   */
  static async authenticateLogin(companyId, employeeId, password) {
    const employee = await db.employee.findFirst({
      where: {
        companyId,
        employeeId,
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
      throw new Error('Invalid credentials');
    }

    // Check company is active
    if (!employee.company.isActive) {
      throw new Error('Company account is inactive');
    }

    // Verify password
    const isValidPassword = await AuthService.comparePassword(password, employee.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await db.employee.update({
      where: {
        cpf_companyId: { cpf: employee.cpf, companyId }
      },
      data: { lastLogin: new Date() }
    });

    return employee;
  }

  /**
   * Clock in/out functionality
   * @param {string} companyId - Company UUID
   * @param {string} employeeCpf - Employee CPF
   * @param {string} entryType - CLOCK_IN, CLOCK_OUT, BREAK_START, BREAK_END
   * @param {Object} options - Additional options (notes, location, ipAddress)
   */
  static async recordTimeEntry(companyId, employeeCpf, entryType, options = {}) {
    const { notes, location, ipAddress } = options;

    // Validate employee exists in company
    await TenantValidators.validateEmployeeBelongsToCompany(db, companyId, employeeCpf);

    // Check for duplicate entries within 5 minutes (prevent accidental double entries)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEntry = await db.timeEntry.findFirst({
      where: {
        companyId,
        employeeCpf,
        entryType,
        timestamp: { gte: fiveMinutesAgo }
      }
    });

    if (recentEntry) {
      throw new Error(`Duplicate ${entryType} entry within 5 minutes`);
    }

    return await db.timeEntry.create({
      data: {
        companyId,
        employeeCpf,
        entryType,
        notes,
        location,
        ipAddress
      },
      include: {
        employee: {
          include: {
            person: true
          }
        }
      }
    });
  }

  /**
   * Get employee time entries with filtering
   * @param {string} companyId - Company UUID
   * @param {string} employeeCpf - Employee CPF (optional, for managers/admins)
   * @param {Object} filters - Date range and type filters
   */
  static async getTimeEntries(companyId, employeeCpf = null, filters = {}) {
    const {
      startDate,
      endDate,
      entryType,
      page = 1,
      limit = 50
    } = filters;

    const skip = (Math.max(1, page) - 1) * limit;
    const take = Math.min(limit, 100);

    const where = {
      companyId,
      ...(employeeCpf && { employeeCpf }),
      ...(entryType && { entryType }),
      ...(startDate || endDate) && {
        timestamp: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      }
    };

    const [timeEntries, totalCount] = await Promise.all([
      db.timeEntry.findMany({
        where,
        include: {
          employee: {
            include: {
              person: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take
      }),
      db.timeEntry.count({ where })
    ]);

    return {
      timeEntries,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Get employee performance metrics
   * @param {string} companyId - Company UUID
   * @param {string} employeeCpf - Employee CPF
   * @param {Object} dateRange - Start and end dates
   */
  static async getPerformanceMetrics(companyId, employeeCpf, dateRange = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate = new Date()
    } = dateRange;

    // Validate employee exists
    await TenantValidators.validateEmployeeBelongsToCompany(db, companyId, employeeCpf);

    const [timeEntries, salesData, auditLogs] = await Promise.all([
      // Time tracking metrics
      db.timeEntry.findMany({
        where: {
          companyId,
          employeeCpf,
          timestamp: { gte: startDate, lte: endDate }
        },
        orderBy: { timestamp: 'asc' }
      }),

      // Sales performance
      db.sale.aggregate({
        where: {
          companyId,
          cashierCpf: employeeCpf,
          createdAt: { gte: startDate, lte: endDate },
          status: 'FINALIZED'
        },
        _sum: { grandTotal: true },
        _count: true
      }),

      // Activity logs
      db.auditLog.count({
        where: {
          companyId,
          actorCpf: employeeCpf,
          timestamp: { gte: startDate, lte: endDate }
        }
      })
    ]);

    // Calculate time tracking metrics
    const timeTracking = this.calculateTimeMetrics(timeEntries);

    return {
      period: { start: startDate, end: endDate },
      timeTracking,
      sales: {
        totalAmount: salesData._sum.grandTotal || 0,
        totalCount: salesData._count,
        averageAmount: salesData._count > 0 ? (salesData._sum.grandTotal || 0) / salesData._count : 0
      },
      activity: {
        totalActions: auditLogs
      }
    };
  }

  /**
   * Calculate time tracking metrics from time entries
   * @param {Array} timeEntries - Array of time entries
   * @private
   */
  static calculateTimeMetrics(timeEntries) {
    let totalHours = 0;
    let workDays = 0;
    const dailyHours = {};

    // Group entries by date
    const entriesByDate = timeEntries.reduce((acc, entry) => {
      const date = entry.timestamp.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    }, {});

    // Calculate daily work hours
    Object.entries(entriesByDate).forEach(([date, entries]) => {
      const clockIns = entries.filter(e => e.entryType === 'CLOCK_IN');
      const clockOuts = entries.filter(e => e.entryType === 'CLOCK_OUT');

      if (clockIns.length > 0 && clockOuts.length > 0) {
        const dailyMinutes = clockOuts.reduce((total, clockOut, index) => {
          const clockIn = clockIns[index];
          if (clockIn) {
            const diff = clockOut.timestamp.getTime() - clockIn.timestamp.getTime();
            return total + Math.max(0, diff / (1000 * 60));
          }
          return total;
        }, 0);

        const hours = dailyMinutes / 60;
        dailyHours[date] = Math.round(hours * 100) / 100;
        totalHours += hours;
        workDays++;
      }
    });

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      workDays,
      averageHoursPerDay: workDays > 0 ? Math.round((totalHours / workDays) * 100) / 100 : 0,
      dailyBreakdown: dailyHours
    };
  }

  /**
   * Deactivate employee (soft delete)
   * @param {string} companyId - Company UUID
   * @param {string} cpf - Employee CPF
   */
  static async deactivateEmployee(companyId, cpf) {
    const employee = await TenantQueries.findEmployee(db, companyId, cpf);
    if (!employee) {
      throw new Error('Employee not found in company');
    }

    return await db.employee.update({
      where: {
        cpf_companyId: { cpf, companyId }
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      },
      include: {
        person: true
      }
    });
  }

  /**
   * Get company employee statistics
   * @param {string} companyId - Company UUID
   */
  static async getCompanyEmployeeStats(companyId) {
    const [
      totalEmployees,
      activeEmployees,
      roleDistribution,
      recentHires,
      currentlyWorking
    ] = await Promise.all([
      db.employee.count({ where: { companyId } }),
      db.employee.count({ where: { companyId, isActive: true } }),
      db.employee.groupBy({
        by: ['role'],
        where: { companyId, isActive: true },
        _count: true
      }),
      db.employee.count({
        where: {
          companyId,
          hireDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      db.timeEntry.findMany({
        where: {
          companyId,
          entryType: 'CLOCK_IN',
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)) // Today
          }
        },
        distinct: ['employeeCpf']
      })
    ]);

    return {
      total: totalEmployees,
      active: activeEmployees,
      inactive: totalEmployees - activeEmployees,
      roleDistribution: roleDistribution.reduce((acc, item) => {
        acc[item.role] = item._count;
        return acc;
      }, {}),
      recentHires,
      currentlyWorking: currentlyWorking.length
    };
  }
}

module.exports = EmployeeMultiTenant;