const Joi = require('joi');
const EmployeeMultiTenant = require('../models/EmployeeMultiTenant');
const { AuthService } = require('../middleware/auth-multitenant');

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

      const employee = await EmployeeMultiTenant.authenticateEmployee(value.employeeId, value.password);
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

      const result = await EmployeeMultiTenant.getAllEmployees(value);

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

      const employee = await EmployeeMultiTenant.getEmployeeByCpf(value.cpf);

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

      const employee = await EmployeeMultiTenant.updateEmployee(req.params.cpf, value);

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

      const result = await EmployeeMultiTenant.getTimeEntries(value);

      res.json({
        success: true,
        message: 'Time entries retrieved successfully',
        data: result.entries,
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

      const result = await EmployeeMultiTenant.getActivityLogs(value);

      res.json({
        success: true,
        message: 'Activity logs retrieved successfully',
        data: result.logs,
        pagination: result.pagination
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

      const metrics = await EmployeeMultiTenant.getEmployeeMetrics(
        req.params.cpf,
        value.startDate,
        value.endDate
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
      const employee = await EmployeeMultiTenant.getEmployeeByCpf(req.employee.cpf);

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
}

module.exports = EmployeeController;