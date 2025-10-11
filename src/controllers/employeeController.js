const Joi = require('joi');
const EmployeeMultiTenant = require('../models/EmployeeMultiTenant');
const { AuthService } = require('../middleware/auth-multitenant');
const { db } = require('../database/prisma');

class EmployeeController {
  // US-022: Create employee account
  static async createEmployee(req, res) {
    try {
      const schema = Joi.object({
        // Person data
        cpf: Joi.string().length(11).pattern(/^\d+$/).required(),
        fullName: Joi.string().min(2).max(200).required(),
        email: Joi.string().email().max(200).required(),
        phone: Joi.string().max(20).optional(),

        // Employee data
        employeeId: Joi.string().max(20).required(),
        role: Joi.string().valid('CASHIER', 'MANAGER', 'ADMIN', 'MAINTENANCE', 'SECURITY').required(),
        hireDate: Joi.date().optional(),
        isActive: Joi.boolean().optional(),
        password: Joi.string().min(6).optional(),
        permissions: Joi.object().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      const personData = {
        cpf: value.cpf,
        fullName: value.fullName,
        email: value.email,
        phone: value.phone
      };

      const employeeData = {
        employeeId: value.employeeId,
        role: value.role,
        hireDate: value.hireDate,
        isActive: value.isActive,
        password: value.password,
        permissions: value.permissions
      };

      const employee = await EmployeeMultiTenant.createEmployee(employeeData, personData);

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: {
          cpf: employee.cpf,
          employeeId: employee.employeeId,
          role: employee.role,
          hireDate: employee.hireDate,
          isActive: employee.isActive,
          fullName: employee.person.fullName,
          email: employee.person.email,
          phone: employee.person.phone,
          createdAt: employee.createdAt
        }
      });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create employee'
      });
    }
  }

  // Employee authentication
  static async login(req, res) {
    try {
      const schema = Joi.object({
        companyId: Joi.string().uuid().optional(),
        employeeId: Joi.string().required(),
        password: Joi.string().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      // If companyId not provided, try to find employee across all companies
      let employee;
      if (value.companyId) {
        employee = await EmployeeMultiTenant.authenticateLogin(value.companyId, value.employeeId, value.password);
      } else {
        // Search across all active companies
        const allCompanies = await db.company.findMany({ where: { isActive: true }, select: { id: true } });
        for (const company of allCompanies) {
          try {
            employee = await EmployeeMultiTenant.authenticateLogin(company.id, value.employeeId, value.password);
            if (employee) break;
          } catch (e) {
            // Continue searching
            continue;
          }
        }
        if (!employee) {
          throw new Error('Invalid credentials');
        }
      }

      const token = AuthService.generateToken(employee);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          employee: {
            cpf: employee.cpf,
            employeeId: employee.employeeId,
            role: employee.role,
            fullName: employee.person.fullName,
            email: employee.person.email,
            permissions: employee.permissions,
            lastLogin: employee.lastLogin
          }
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed'
      });
    }
  }

  // Get all employees with filters
  static async getAllEmployees(req, res) {
    try {
      const schema = Joi.object({
        isActive: Joi.boolean().optional(),
        role: Joi.string().valid('CASHIER', 'MANAGER', 'ADMIN', 'MAINTENANCE', 'SECURITY').optional(),
        search: Joi.string().max(200).optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      const companyId = req.employee.companyId;
      const result = await EmployeeMultiTenant.listEmployees(
        companyId,
        {
          role: value.role,
          search: value.search,
          isActive: value.isActive
        },
        {
          page: value.page || 1,
          limit: value.limit || 50
        }
      );

      res.json({
        success: true,
        message: 'Employees retrieved successfully',
        data: result.employees,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employees'
      });
    }
  }

  // Get employee by CPF
  static async getEmployeeByCpf(req, res) {
    try {
      const schema = Joi.object({
        cpf: Joi.string().length(11).pattern(/^\d+$/).required()
      });

      const { error, value } = schema.validate(req.params);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CPF format'
        });
      }

      const companyId = req.employee.companyId;
      const employee = await EmployeeMultiTenant.findByCpf(companyId, value.cpf);

      res.json({
        success: true,
        message: 'Employee retrieved successfully',
        data: employee
      });
    } catch (error) {
      if (error.message === 'Employee not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      console.error('Get employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee'
      });
    }
  }

  // Update employee
  static async updateEmployee(req, res) {
    try {
      const paramSchema = Joi.object({
        cpf: Joi.string().length(11).pattern(/^\d+$/).required()
      });

      const bodySchema = Joi.object({
        fullName: Joi.string().min(2).max(200).optional(),
        email: Joi.string().email().max(200).optional(),
        phone: Joi.string().max(20).optional(),
        role: Joi.string().valid('CASHIER', 'MANAGER', 'ADMIN', 'MAINTENANCE', 'SECURITY').optional(),
        isActive: Joi.boolean().optional(),
        password: Joi.string().min(6).optional(),
        permissions: Joi.object().optional()
      });

      const { error: paramError } = paramSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CPF format'
        });
      }

      const { error: bodyError, value } = bodySchema.validate(req.body);
      if (bodyError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: bodyError.details.map(d => d.message)
        });
      }

      const companyId = req.employee.companyId;
      const employee = await EmployeeMultiTenant.updateEmployee(companyId, req.params.cpf, value);

      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: {
          cpf: employee.cpf,
          employeeId: employee.employeeId,
          role: employee.role,
          hireDate: employee.hireDate,
          isActive: employee.isActive,
          fullName: employee.person.fullName,
          email: employee.person.email,
          phone: employee.person.phone,
          permissions: employee.permissions,
          updatedAt: employee.updatedAt
        }
      });
    } catch (error) {
      if (error.message === 'Employee not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      console.error('Update employee error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update employee'
      });
    }
  }

  // US-023: Clock in/out functionality
  static async clockIn(req, res) {
    try {
      const schema = Joi.object({
        notes: Joi.string().max(500).optional(),
        location: Joi.string().max(100).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      const metadata = {
        notes: value.notes,
        location: value.location,
        ipAddress: req.ip || req.connection.remoteAddress
      };

      const timeEntry = await EmployeeMultiTenant.recordTimeEntry(
        req.employee.companyId,
        req.employee.cpf,
        'CLOCK_IN',
        metadata
      );

      res.status(201).json({
        success: true,
        message: 'Clocked in successfully',
        data: {
          id: timeEntry.id,
          employeeName: timeEntry.employee.person.fullName,
          entryType: timeEntry.entryType,
          timestamp: timeEntry.timestamp,
          notes: timeEntry.notes,
          location: timeEntry.location
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to clock in'
      });
    }
  }

  static async clockOut(req, res) {
    try {
      const schema = Joi.object({
        notes: Joi.string().max(500).optional(),
        location: Joi.string().max(100).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      const metadata = {
        notes: value.notes,
        location: value.location,
        ipAddress: req.ip || req.connection.remoteAddress
      };

      const timeEntry = await EmployeeMultiTenant.recordTimeEntry(
        req.employee.companyId,
        req.employee.cpf,
        'CLOCK_OUT',
        metadata
      );

      res.status(201).json({
        success: true,
        message: 'Clocked out successfully',
        data: {
          id: timeEntry.id,
          employeeName: timeEntry.employee.person.fullName,
          entryType: timeEntry.entryType,
          timestamp: timeEntry.timestamp,
          notes: timeEntry.notes,
          location: timeEntry.location
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to clock out'
      });
    }
  }

  // US-024: Get time entries (employee activity logs)
  static async getTimeEntries(req, res) {
    try {
      const schema = Joi.object({
        employeeCpf: Joi.string().length(11).pattern(/^\d+$/).optional(),
        entryType: Joi.string().valid('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END').optional(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(200).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      const companyId = req.employee.companyId;
      const result = await EmployeeMultiTenant.getTimeEntries(
        companyId,
        value.employeeCpf || null,
        {
          startDate: value.startDate,
          endDate: value.endDate,
          entryType: value.entryType,
          page: value.page || 1,
          limit: value.limit || 100
        }
      );

      res.json({
        success: true,
        message: 'Time entries retrieved successfully',
        data: result.timeEntries,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get time entries error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve time entries'
      });
    }
  }

  // US-024: Get activity logs
  static async getActivityLogs(req, res) {
    try {
      const schema = Joi.object({
        actorCpf: Joi.string().length(11).pattern(/^\d+$/).optional(),
        action: Joi.string().max(100).optional(),
        targetType: Joi.string().max(50).optional(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      const companyId = req.employee.companyId;
      const page = value.page || 1;
      const limit = Math.min(value.limit || 50, 100);
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...(value.actorCpf && { actorCpf: value.actorCpf }),
        ...(value.action && { action: value.action }),
        ...(value.targetType && { targetType: value.targetType }),
        ...((value.startDate || value.endDate) && {
          timestamp: {
            ...(value.startDate && { gte: new Date(value.startDate) }),
            ...(value.endDate && { lte: new Date(value.endDate) })
          }
        })
      };

      const [logs, totalCount] = await Promise.all([
        db.auditLog.findMany({
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
          take: limit
        }),
        db.auditLog.count({ where })
      ]);

      res.json({
        success: true,
        message: 'Activity logs retrieved successfully',
        data: logs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Get activity logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve activity logs'
      });
    }
  }

  // Get employee performance metrics
  static async getEmployeeMetrics(req, res) {
    try {
      const paramSchema = Joi.object({
        cpf: Joi.string().length(11).pattern(/^\d+$/).required()
      });

      const querySchema = Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional()
      });

      const { error: paramError } = paramSchema.validate(req.params);
      if (paramError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CPF format'
        });
      }

      const { error: queryError, value } = querySchema.validate(req.query);
      if (queryError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: queryError.details.map(d => d.message)
        });
      }

      const companyId = req.employee.companyId;
      const metrics = await EmployeeMultiTenant.getPerformanceMetrics(
        companyId,
        req.params.cpf,
        {
          startDate: value.startDate,
          endDate: value.endDate
        }
      );

      res.json({
        success: true,
        message: 'Employee metrics retrieved successfully',
        data: metrics
      });
    } catch (error) {
      console.error('Get employee metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee metrics'
      });
    }
  }

  // Get current employee profile
  static async getCurrentEmployee(req, res) {
    try {
      const companyId = req.employee.companyId;
      const employee = await EmployeeMultiTenant.findByCpf(companyId, req.employee.cpf);

      res.json({
        success: true,
        message: 'Current employee profile retrieved successfully',
        data: employee
      });
    } catch (error) {
      console.error('Get current employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve current employee profile'
      });
    }
  }

  // US-026: Consolidated employee reports
  static async getConsolidatedReport(req, res) {
    try {
      const schema = Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        employeeCpf: Joi.string().length(11).pattern(/^\d+$/).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(d => d.message)
        });
      }

      const companyId = req.employee.companyId;
      const { startDate, endDate, employeeCpf } = value;

      // Build date filter
      const dateFilter = (startDate || endDate) ? {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) })
      } : undefined;

      // Get all employees or specific employee
      const employeeWhere = {
        companyId,
        ...(employeeCpf && { cpf: employeeCpf })
      };

      const employees = await db.employee.findMany({
        where: employeeWhere,
        include: {
          person: true,
          timeEntries: {
            where: dateFilter ? { clockInTime: dateFilter } : {},
            orderBy: { clockInTime: 'desc' }
          },
          actorLogs: {
            where: dateFilter ? { timestamp: dateFilter } : {},
            orderBy: { timestamp: 'desc' },
            take: 100
          }
        }
      });

      // Calculate consolidated metrics for each employee
      const employeeReports = employees.map(emp => {
        // Calculate total hours worked
        const totalHours = emp.timeEntries.reduce((sum, entry) => {
          if (entry.clockOutTime) {
            const hours = (new Date(entry.clockOutTime) - new Date(entry.clockInTime)) / (1000 * 60 * 60);
            return sum + hours;
          }
          return sum;
        }, 0);

        // Count activities by action type
        const activityBreakdown = emp.actorLogs.reduce((acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {});

        // Calculate attendance metrics
        const totalShifts = emp.timeEntries.length;
        const completedShifts = emp.timeEntries.filter(e => e.clockOutTime).length;
        const avgHoursPerShift = totalShifts > 0 ? totalHours / totalShifts : 0;

        return {
          employee: {
            cpf: emp.cpf,
            employeeId: emp.employeeId,
            fullName: emp.person.fullName,
            email: emp.person.email,
            role: emp.role,
            hireDate: emp.hireDate,
            isActive: emp.isActive
          },
          timeMetrics: {
            totalHoursWorked: Math.round(totalHours * 100) / 100,
            totalShifts,
            completedShifts,
            incompleteShifts: totalShifts - completedShifts,
            averageHoursPerShift: Math.round(avgHoursPerShift * 100) / 100
          },
          activityMetrics: {
            totalActions: emp.actorLogs.length,
            actionBreakdown: activityBreakdown,
            mostCommonAction: Object.entries(activityBreakdown)
              .sort(([, a], [, b]) => b - a)[0]?.[0] || null
          },
          performance: {
            attendanceRate: totalShifts > 0
              ? Math.round((completedShifts / totalShifts) * 10000) / 100
              : 0,
            productivity: emp.actorLogs.length / (totalShifts || 1)
          }
        };
      });

      // Calculate company-wide summary
      const summary = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter(e => e.isActive).length,
        totalHoursWorked: employeeReports.reduce((sum, r) => sum + r.timeMetrics.totalHoursWorked, 0),
        totalActions: employeeReports.reduce((sum, r) => sum + r.activityMetrics.totalActions, 0),
        avgHoursPerEmployee: employees.length > 0
          ? employeeReports.reduce((sum, r) => sum + r.timeMetrics.totalHoursWorked, 0) / employees.length
          : 0,
        avgAttendanceRate: employees.length > 0
          ? employeeReports.reduce((sum, r) => sum + r.performance.attendanceRate, 0) / employees.length
          : 0
      };

      res.json({
        success: true,
        data: {
          employees: employeeReports,
          summary: {
            ...summary,
            totalHoursWorked: Math.round(summary.totalHoursWorked * 100) / 100,
            avgHoursPerEmployee: Math.round(summary.avgHoursPerEmployee * 100) / 100,
            avgAttendanceRate: Math.round(summary.avgAttendanceRate * 100) / 100
          },
          filters: {
            startDate,
            endDate,
            employeeCpf
          }
        }
      });
    } catch (error) {
      console.error('Get consolidated report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate consolidated report',
        error: error.message
      });
    }
  }
}

module.exports = EmployeeController;