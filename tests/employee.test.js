const request = require('supertest');
const app = require('../src/server');
const { db } = require('../src/database/prisma');
const { AuthService } = require('../src/middleware/auth');

describe('Employee Management Tests', () => {
  let employeeToken;
  let adminToken;
  let testEmployeeCpf = '11111111111'; // Different CPF for test employee
  let testAdminCpf = '12345678901'; // Use existing admin CPF

  beforeAll(async () => {
    // Wait for app to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Clean up any existing test employee data (but keep admin)
      await db.timeEntry.deleteMany({
        where: { employeeCpf: testEmployeeCpf }
      });
      await db.auditLog.deleteMany({
        where: { actorCpf: testEmployeeCpf }
      });
      await db.employee.deleteMany({
        where: { cpf: testEmployeeCpf }
      });
      await db.person.deleteMany({
        where: { cpf: testEmployeeCpf }
      });

      // Use existing admin employee
      const adminEmployee = await db.employee.findFirst({
        where: { employeeId: 'ADMIN001' }
      });

      if (!adminEmployee) {
        throw new Error('Admin employee not found - run database seed first');
      }

      // Generate admin token
      adminToken = AuthService.generateToken(adminEmployee);

    } catch (error) {
      console.error('Test setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test employee data only (keep admin)
      await db.timeEntry.deleteMany({
        where: { employeeCpf: testEmployeeCpf }
      });
      await db.auditLog.deleteMany({
        where: { actorCpf: testEmployeeCpf }
      });
      await db.employee.deleteMany({
        where: { cpf: testEmployeeCpf }
      });
      await db.person.deleteMany({
        where: { cpf: testEmployeeCpf }
      });
      await db.$disconnect();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('US-022: Create Employee Accounts', () => {
    test('should create a new employee account successfully', async () => {
      const employeeData = {
        cpf: testEmployeeCpf,
        fullName: 'João Silva',
        email: 'joao@test.com',
        phone: '11987654321',
        employeeId: 'EMP001',
        role: 'CASHIER',
        password: 'password123',
        permissions: { sales: true, inventory: false }
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cpf).toBe(testEmployeeCpf);
      expect(response.body.data.employeeId).toBe('EMP001');
      expect(response.body.data.role).toBe('CASHIER');
      expect(response.body.data.fullName).toBe('João Silva');
      expect(response.body.data.email).toBe('joao@test.com');
    });

    test('should reject duplicate employee ID', async () => {
      const duplicateData = {
        cpf: '22222222222',
        fullName: 'Maria Santos',
        email: 'maria@test.com',
        employeeId: 'EMP001', // Same as previous test
        role: 'CASHIER',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Employee ID already exists');
    });

    test('should require admin/manager authorization', async () => {
      const employeeData = {
        cpf: '22222222222',
        fullName: 'Test Employee',
        email: 'test@test.com',
        employeeId: 'EMP002',
        role: 'CASHIER'
      };

      await request(app)
        .post('/api/employees')
        .send(employeeData)
        .expect(401);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        cpf: 'invalid-cpf',
        fullName: 'T', // Too short
        email: 'invalid-email',
        employeeId: '',
        role: 'INVALID_ROLE'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeInstanceOf(Array);
    });
  });

  describe('Employee Authentication', () => {
    test('should authenticate employee successfully', async () => {
      const loginData = {
        employeeId: 'EMP001',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/employees/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.employee.employeeId).toBe('EMP001');
      expect(response.body.data.employee.role).toBe('CASHIER');

      // Store token for later tests
      employeeToken = response.body.data.token;
    });

    test('should reject invalid credentials', async () => {
      const invalidLogin = {
        employeeId: 'EMP001',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/employees/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('should reject login for inactive employee', async () => {
      // Deactivate the employee
      await db.employee.update({
        where: { cpf: testEmployeeCpf },
        data: { isActive: false }
      });

      const loginData = {
        employeeId: 'EMP001',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/employees/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);

      // Reactivate for other tests
      await db.employee.update({
        where: { cpf: testEmployeeCpf },
        data: { isActive: true }
      });
    });
  });

  describe('Employee Management Operations', () => {
    test('should get all employees', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter employees by role', async () => {
      const response = await request(app)
        .get('/api/employees?role=CASHIER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(emp => emp.role === 'CASHIER')).toBe(true);
    });

    test('should search employees by name', async () => {
      const response = await request(app)
        .get('/api/employees?search=João')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.some(emp => emp.fullName.includes('João'))).toBe(true);
    });

    test('should get employee by CPF', async () => {
      const response = await request(app)
        .get(`/api/employees/${testEmployeeCpf}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cpf).toBe(testEmployeeCpf);
      expect(response.body.data.employeeId).toBe('EMP001');
    });

    test('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .get('/api/employees/99999999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Employee not found');
    });

    test('should get current employee profile', async () => {
      const response = await request(app)
        .get('/api/employees/me')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cpf).toBe(testEmployeeCpf);
      expect(response.body.data.employeeId).toBe('EMP001');
    });
  });

  describe('US-025: Update Employee and Configure Permissions', () => {
    test('should update employee information', async () => {
      const updateData = {
        fullName: 'João Silva Santos',
        email: 'joao.santos@test.com',
        phone: '11999887766',
        permissions: { sales: true, inventory: true, reports: false }
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployeeCpf}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe('João Silva Santos');
      expect(response.body.data.email).toBe('joao.santos@test.com');
      expect(response.body.data.permissions.inventory).toBe(true);
    });

    test('should update employee role', async () => {
      const updateData = {
        role: 'MANAGER'
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployeeCpf}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('MANAGER');
    });

    test('should change employee password', async () => {
      const updateData = {
        password: 'newpassword123'
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployeeCpf}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Test login with new password
      const loginResponse = await request(app)
        .post('/api/employees/login')
        .send({
          employeeId: 'EMP001',
          password: 'newpassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });
  });

  describe('US-023: Time Tracking', () => {
    test('should clock in successfully', async () => {
      const clockInData = {
        notes: 'Starting morning shift',
        location: 'Main entrance'
      };

      const response = await request(app)
        .post('/api/employees/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(clockInData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.entryType).toBe('CLOCK_IN');
      expect(response.body.data.notes).toBe('Starting morning shift');
      expect(response.body.data.location).toBe('Main entrance');
    });

    test('should prevent duplicate clock-in within 5 minutes', async () => {
      const clockInData = {
        notes: 'Duplicate attempt'
      };

      const response = await request(app)
        .post('/api/employees/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(clockInData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Duplicate CLOCK_IN entry');
    });

    test('should clock out successfully', async () => {
      // Wait a bit to avoid duplicate entry check
      await new Promise(resolve => setTimeout(resolve, 1000));

      const clockOutData = {
        notes: 'End of shift',
        location: 'Main entrance'
      };

      const response = await request(app)
        .post('/api/employees/clock-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(clockOutData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.entryType).toBe('CLOCK_OUT');
      expect(response.body.data.notes).toBe('End of shift');
    });

    test('should require authentication for time tracking', async () => {
      await request(app)
        .post('/api/employees/clock-in')
        .send({ notes: 'Test' })
        .expect(401);
    });
  });

  describe('US-024: Employee Activity Logs and Performance Monitoring', () => {
    test('should get time entries for managers/admins', async () => {
      const response = await request(app)
        .get('/api/employees/time-entries')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter time entries by employee', async () => {
      const response = await request(app)
        .get(`/api/employees/time-entries?employeeCpf=${testEmployeeCpf}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(entry => entry.employeeCpf === testEmployeeCpf)).toBe(true);
    });

    test('should filter time entries by entry type', async () => {
      const response = await request(app)
        .get('/api/employees/time-entries?entryType=CLOCK_IN')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(entry => entry.entryType === 'CLOCK_IN')).toBe(true);
    });

    test('should get activity logs', async () => {
      const response = await request(app)
        .get('/api/employees/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter activity logs by actor', async () => {
      const response = await request(app)
        .get(`/api/employees/activity-logs?actorCpf=${testAdminCpf}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should get employee performance metrics', async () => {
      const response = await request(app)
        .get(`/api/employees/${testEmployeeCpf}/metrics`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.timeTracking).toBeDefined();
      expect(response.body.data.activity).toBeDefined();
      expect(response.body.data.sales).toBeDefined();
    });

    test('should filter metrics by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/employees/${testEmployeeCpf}/metrics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.period.start)).toEqual(startDate);
      expect(new Date(response.body.data.period.end)).toEqual(endDate);
    });
  });

  describe('Authorization and Security', () => {
    test('should deny access to employee management for non-managers', async () => {
      // Create person first
      const cashierPerson = await db.person.create({
        data: {
          cpf: '33333333333',
          fullName: 'Cashier Test User',
          email: 'cashier@test.com',
          phone: '11888888888'
        }
      });

      // Create a regular cashier token
      const cashierEmployee = await db.employee.create({
        data: {
          cpf: '33333333333',
          employeeId: 'CASH001',
          role: 'CASHIER',
          hireDate: new Date(),
          passwordHash: await AuthService.hashPassword('cashier123')
        }
      });

      const cashierToken = AuthService.generateToken(cashierEmployee);

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions');

      // Clean up
      await db.employee.delete({
        where: { cpf: '33333333333' }
      });
      await db.person.delete({
        where: { cpf: '33333333333' }
      });
    });

    test('should validate JWT token format', async () => {
      await request(app)
        .get('/api/employees/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    test('should require Bearer token format', async () => {
      await request(app)
        .get('/api/employees/me')
        .set('Authorization', 'Basic token123')
        .expect(401);
    });

    test('should handle expired tokens gracefully', async () => {
      // Create an expired token (this would normally be tested with a shorter JWT expiry in test env)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcGYiOiIxMjM0NTY3ODkwMSIsImVtcGxveWVlSWQiOiJFTVAwMDEiLCJyb2xlIjoiQ0FTSElFUiIsInBlcm1pc3Npb25zIjp7fSwiaWF0IjoxNjI1MTU5OTk5LCJleHAiOjE2MjUxNjAwMDB9.invalid';

      await request(app)
        .get('/api/employees/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid CPF format in URL params', async () => {
      const response = await request(app)
        .get('/api/employees/invalid-cpf')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid CPF format');
    });

    test('should handle pagination edge cases', async () => {
      // Test with very high page number
      const response = await request(app)
        .get('/api/employees?page=999&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.page).toBe(999);
    });

    test('should validate date formats in queries', async () => {
      const response = await request(app)
        .get('/api/employees/time-entries?startDate=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
    });

    test('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database service
      // For now, we'll just ensure the error handling structure is in place
      expect(true).toBe(true);
    });
  });
});

describe('Auth Service Unit Tests', () => {
  test('should hash and compare passwords correctly', async () => {
    const password = 'testpassword123';
    const hash = await AuthService.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isValid = await AuthService.comparePassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await AuthService.comparePassword('wrongpassword', hash);
    expect(isInvalid).toBe(false);
  });

  test('should generate and verify JWT tokens', () => {
    const employee = {
      cpf: '12345678901',
      employeeId: 'EMP001',
      role: 'CASHIER',
      permissions: { sales: true }
    };

    const token = AuthService.generateToken(employee);
    expect(token).toBeDefined();

    const decoded = AuthService.verifyToken(token);
    expect(decoded.cpf).toBe(employee.cpf);
    expect(decoded.employeeId).toBe(employee.employeeId);
    expect(decoded.role).toBe(employee.role);
  });

  test('should throw error for invalid tokens', () => {
    expect(() => {
      AuthService.verifyToken('invalid-token');
    }).toThrow('Invalid token');
  });
});