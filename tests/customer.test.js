/**
 * Test suite for Customer Management - US-027, US-028, US-029, US-031
 * Tests for customer profiles, analytics, loyalty program, and retention reports
 */

const request = require('supertest');
const app = require('../src/server');
const { db } = require('../src/database/prisma');
const jwt = require('jsonwebtoken');

describe('Customer Management (US-027, US-028, US-029, US-031)', () => {
  let authToken;
  let companyId;
  let employeeCpf;
  let testCustomerCpf;

  beforeAll(async () => {
    // Clean up any existing test data first
    const existingCompany = await db.company.findFirst({
      where: { cnpj: '98765432000177' }
    });

    if (existingCompany) {
      await db.timeEntry.deleteMany({ where: { companyId: existingCompany.id } });
      await db.auditLog.deleteMany({ where: { companyId: existingCompany.id } });
      await db.customer.deleteMany({ where: { companyId: existingCompany.id } });
      await db.employee.deleteMany({ where: { companyId: existingCompany.id } });
      await db.company.delete({ where: { id: existingCompany.id } });
    }

    // Clean up test persons
    await db.person.deleteMany({ where: { cpf: { in: ['11111111111', '22222222222'] } } }).catch(() => {});
    await db.person.deleteMany({ where: { cpf: { startsWith: '333' } } }).catch(() => {});

    // Create test company
    const company = await db.company.create({
      data: {
        name: 'Test Cinema Customers',
        cnpj: '98765432000177',
        tradeName: 'Customer Test Cinema',
        isActive: true
      }
    });
    companyId = company.id;

    // Create test person for employee
    const empPerson = await db.person.create({
      data: {
        cpf: '11111111111',
        fullName: 'Manager Test',
        email: 'manager@test.com',
        phone: '11999999999'
      }
    });
    employeeCpf = empPerson.cpf;

    // Create test employee
    await db.employee.create({
      data: {
        cpf: employeeCpf,
        companyId,
        employeeId: 'MGR001',
        role: 'MANAGER',
        hireDate: new Date(),
        isActive: true,
        passwordHash: 'hashedpassword'
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      { cpf: employeeCpf, companyId, role: 'MANAGER' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test customer person
    testCustomerCpf = '22222222222';
    const customerPerson = await db.person.create({
      data: {
        cpf: testCustomerCpf,
        fullName: 'Test Customer',
        email: 'customer@test.com',
        phone: '11988888888'
      }
    });

    // Create test customer
    await db.customer.create({
      data: {
        cpf: testCustomerCpf,
        companyId,
        birthDate: new Date('1990-01-01'),
        loyaltyPoints: 100
      }
    });
  });

  afterAll(async () => {
    try {
      // Cleanup in correct order
      if (companyId) {
        await db.timeEntry.deleteMany({ where: { companyId } });
        await db.auditLog.deleteMany({ where: { companyId } });
        await db.customer.deleteMany({ where: { companyId } });
        await db.employee.deleteMany({ where: { companyId } });
        await db.company.delete({ where: { id: companyId } });
      }
      if (employeeCpf) {
        await db.person.delete({ where: { cpf: employeeCpf } }).catch(() => {});
      }
      await db.person.deleteMany({ where: { cpf: { startsWith: '333' } } });
      if (testCustomerCpf) {
        await db.person.delete({ where: { cpf: testCustomerCpf } }).catch(() => {});
      }
      await db.$disconnect();
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  });

  // ===== US-027: Create customer profiles =====

  describe('US-027: Create customer profile', () => {
    it('should create a new customer successfully', async () => {
      const newCustomer = {
        cpf: '33333333333',
        fullName: 'New Customer Test',
        email: 'newcustomer@test.com',
        phone: '11977777777',
        birthDate: '1995-05-15'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCustomer)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cpf).toBe(newCustomer.cpf);
      expect(response.body.data.person.fullName).toBe(newCustomer.fullName);
      expect(response.body.data.loyaltyPoints).toBe(0);
    });

    it('should reject duplicate customer for same company', async () => {
      const duplicate = {
        cpf: testCustomerCpf,
        fullName: 'Duplicate Customer',
        email: 'duplicate@test.com',
        phone: '11966666666'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicate)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already registered');
    });

    it('should validate CPF format', async () => {
      const invalidCustomer = {
        cpf: '123', // Invalid CPF
        fullName: 'Invalid Customer',
        email: 'invalid@test.com',
        phone: '11955555555'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCustomer)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const incompleteCustomer = {
        cpf: '44444444444'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteCustomer)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('US-027: Get all customers', () => {
    it('should retrieve all customers for company', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/customers?search=Test%20Customer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/customers?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('US-027: Update customer profile', () => {
    it('should update customer information', async () => {
      const updates = {
        fullName: 'Updated Customer Name',
        email: 'updated@test.com'
      };

      const response = await request(app)
        .put(`/api/customers/${testCustomerCpf}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.person.fullName).toBe(updates.fullName);
      expect(response.body.data.person.email).toBe(updates.email);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .put('/api/customers/99999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fullName: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ===== US-028: View customer analytics =====

  describe('US-028: Get customer by CPF with analytics', () => {
    it('should retrieve customer with analytics', async () => {
      const response = await request(app)
        .get(`/api/customers/${testCustomerCpf}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cpf).toBe(testCustomerCpf);
      expect(response.body.data.analytics).toBeDefined();
      expect(response.body.data.analytics.totalSpent).toBeDefined();
      expect(response.body.data.analytics.totalPurchases).toBeDefined();
      expect(response.body.data.analytics.loyaltyTier).toBeDefined();
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .get('/api/customers/99999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('US-028: Get customer purchase history', () => {
    it('should retrieve customer purchase history', async () => {
      const response = await request(app)
        .get(`/api/customers/${testCustomerCpf}/purchase-history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/customers/${testCustomerCpf}/purchase-history?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/customers/${testCustomerCpf}/purchase-history?page=1&limit=5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  // ===== US-029: Loyalty points system =====

  describe('US-029: Add loyalty points', () => {
    it('should add loyalty points to customer', async () => {
      const pointsData = {
        points: 50,
        reason: 'Test purchase reward'
      };

      const response = await request(app)
        .post(`/api/customers/${testCustomerCpf}/loyalty/add`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(pointsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pointsAdded).toBe(50);
      expect(response.body.data.newPoints).toBeGreaterThan(response.body.data.previousPoints);
    });

    it('should validate points value', async () => {
      const invalidData = {
        points: -10 // Negative points
      };

      const response = await request(app)
        .post(`/api/customers/${testCustomerCpf}/loyalty/add`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/customers/99999999999/loyalty/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ points: 10 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('US-029: Redeem loyalty points', () => {
    it('should redeem loyalty points from customer', async () => {
      const redeemData = {
        points: 20,
        reason: 'Test discount redemption'
      };

      const response = await request(app)
        .post(`/api/customers/${testCustomerCpf}/loyalty/redeem`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(redeemData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pointsRedeemed).toBe(20);
      expect(response.body.data.remainingPoints).toBeLessThan(response.body.data.previousPoints);
    });

    it('should reject redemption with insufficient points', async () => {
      const excessiveData = {
        points: 999999,
        reason: 'Excessive redemption attempt'
      };

      const response = await request(app)
        .post(`/api/customers/${testCustomerCpf}/loyalty/redeem`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(excessiveData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient');
    });

    it('should require reason for redemption', async () => {
      const noReasonData = {
        points: 10
        // Missing reason
      };

      const response = await request(app)
        .post(`/api/customers/${testCustomerCpf}/loyalty/redeem`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(noReasonData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ===== US-031: Customer retention reports =====

  describe('US-031: Get customer retention report', () => {
    it('should retrieve retention analytics', async () => {
      const response = await request(app)
        .get('/api/customers/reports/retention')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCustomers).toBeDefined();
      expect(response.body.data.activeCustomers).toBeDefined();
      expect(response.body.data.retentionRate).toBeDefined();
      expect(response.body.data.segments).toBeDefined();
      expect(response.body.data.loyaltyProgram).toBeDefined();
    });

    it('should include customer segments', async () => {
      const response = await request(app)
        .get('/api/customers/reports/retention')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.segments.vip).toBeDefined();
      expect(response.body.data.segments.regular).toBeDefined();
      expect(response.body.data.segments.occasional).toBeDefined();
      expect(response.body.data.segments.onetime).toBeDefined();
    });

    it('should include loyalty program statistics', async () => {
      const response = await request(app)
        .get('/api/customers/reports/retention')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.loyaltyProgram.participants).toBeDefined();
      expect(response.body.data.loyaltyProgram.participationRate).toBeDefined();
    });

    it('should support date range filtering', async () => {
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/customers/reports/retention?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ===== Authorization Tests =====

  describe('Authorization checks', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/api/customers')
        .expect(401);

      await request(app)
        .post('/api/customers')
        .send({ cpf: '12345678901' })
        .expect(401);

      await request(app)
        .get('/api/customers/12345678901')
        .expect(401);
    });
  });
});
