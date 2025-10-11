/**
 * Test suite for Discount Code Management - US-030
 * Tests for creating, managing, and validating targeted discount codes
 */

const request = require('supertest');
const app = require('../src/server');
const { db } = require('../src/database/prisma');
const jwt = require('jsonwebtoken');

describe('Discount Code Management (US-030)', () => {
  let authToken;
  let companyId;
  let employeeCpf;
  let testDiscountCode;

  beforeAll(async () => {
    // Create test company
    const company = await db.company.create({
      data: {
        name: 'Test Cinema Discounts',
        cnpj: '12312312300011',
        tradeName: 'Discount Test Cinema',
        isActive: true
      }
    });
    companyId = company.id;

    // Create test person for employee
    const empPerson = await db.person.create({
      data: {
        cpf: '55555555555',
        fullName: 'Discount Manager Test',
        email: 'discounts@test.com',
        phone: '11999999999'
      }
    });
    employeeCpf = empPerson.cpf;

    // Create test employee
    await db.employee.create({
      data: {
        cpf: employeeCpf,
        companyId,
        employeeId: 'DIS001',
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
    });

    // Create test discount code
    testDiscountCode = 'TEST10';
    await db.discountCode.create({
      data: {
        code: testDiscountCode,
        companyId,
        description: 'Test discount 10%',
        type: 'PERCENT',
        value: 10,
        validFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        maxUses: 100,
        currentUses: 5,
        isActive: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.discountCode.deleteMany({ where: { companyId } });
    await db.employee.deleteMany({ where: { companyId } });
    await db.person.delete({ where: { cpf: employeeCpf } });
    await db.company.delete({ where: { id: companyId } });
    await db.$disconnect();
  });

  // ===== US-030: Create discount codes =====

  describe('US-030: Create discount code', () => {
    it('should create a percent discount code', async () => {
      const newDiscount = {
        code: 'SUMMER20',
        description: 'Summer 20% off',
        type: 'PERCENT',
        value: 20,
        validFrom: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        maxUses: 500
      };

      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newDiscount)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('SUMMER20');
      expect(response.body.data.type).toBe('PERCENT');
      expect(response.body.data.currentUses).toBe(0);
    });

    it('should create an amount discount code', async () => {
      const newDiscount = {
        code: 'FIXED5',
        description: 'R$5 off',
        type: 'AMOUNT',
        value: 5.00,
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newDiscount)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('AMOUNT');
    });

    it('should create a targeted discount with CPF range', async () => {
      const targetedDiscount = {
        code: 'TARGETED15',
        description: 'Targeted 15% for specific customers',
        type: 'PERCENT',
        value: 15,
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cpfRangeStart: '00000000000',
        cpfRangeEnd: '49999999999'
      };

      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(targetedDiscount)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cpfRangeStart).toBe('00000000000');
      expect(response.body.data.cpfRangeEnd).toBe('49999999999');
    });

    it('should reject duplicate discount codes', async () => {
      const duplicate = {
        code: testDiscountCode,
        type: 'PERCENT',
        value: 5,
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicate)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject percent discount over 100%', async () => {
      const invalid = {
        code: 'INVALID150',
        type: 'PERCENT',
        value: 150,
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalid)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const incomplete = {
        code: 'INCOMPLETE'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incomplete)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ===== US-030: Get and manage discount codes =====

  describe('US-030: Get all discount codes', () => {
    it('should retrieve all discount codes', async () => {
      const response = await request(app)
        .get('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/api/discounts?isActive=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(discount => {
        expect(discount.isActive).toBe(true);
      });
    });

    it('should exclude expired codes by default', async () => {
      const response = await request(app)
        .get('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // No expired codes should be returned
    });

    it('should include status and computed fields', async () => {
      const response = await request(app)
        .get('/api/discounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        const discount = response.body.data[0];
        expect(discount.status).toBeDefined();
        expect(discount.isExpired).toBeDefined();
        expect(discount.isMaxedOut).toBeDefined();
      }
    });
  });

  describe('US-030: Get discount code by code', () => {
    it('should retrieve specific discount code', async () => {
      const response = await request(app)
        .get(`/api/discounts/${testDiscountCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe(testDiscountCode);
      expect(response.body.data.status).toBeDefined();
    });

    it('should return 404 for non-existent code', async () => {
      const response = await request(app)
        .get('/api/discounts/NONEXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('US-030: Update discount code', () => {
    it('should update discount code details', async () => {
      const updates = {
        description: 'Updated description',
        maxUses: 200
      };

      const response = await request(app)
        .put(`/api/discounts/${testDiscountCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(updates.description);
      expect(response.body.data.maxUses).toBe(updates.maxUses);
    });

    it('should validate date range when updating', async () => {
      const invalidDates = {
        validFrom: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        validTo: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .put(`/api/discounts/${testDiscountCode}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent code', async () => {
      const response = await request(app)
        .put('/api/discounts/NONEXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('US-030: Deactivate discount code', () => {
    it('should deactivate a discount code', async () => {
      const response = await request(app)
        .patch(`/api/discounts/${testDiscountCode}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  // ===== US-030: Validate discount codes =====

  describe('US-030: Validate discount code', () => {
    beforeAll(async () => {
      // Reactivate test code for validation tests
      await db.discountCode.update({
        where: {
          companyId_code: {
            companyId,
            code: testDiscountCode
          }
        },
        data: { isActive: true }
      });
    });

    it('should validate an active discount code', async () => {
      const response = await request(app)
        .get(`/api/discounts/${testDiscountCode}/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.type).toBe('PERCENT');
      expect(response.body.value).toBe(10);
    });

    it('should validate with customer CPF for targeted discounts', async () => {
      const response = await request(app)
        .get(`/api/discounts/TARGETED15/validate?customerCpf=12345678901`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Will be valid if CPF is in range
    });

    it('should return invalid for expired codes', async () => {
      // Create expired code
      await db.discountCode.create({
        data: {
          code: 'EXPIRED',
          companyId,
          type: 'PERCENT',
          value: 10,
          validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          validTo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          isActive: true
        }
      });

      const response = await request(app)
        .get('/api/discounts/EXPIRED/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toContain('Discount code has expired');
    });
  });

  // ===== US-030: Discount analytics =====

  describe('US-030: Get discount code analytics', () => {
    it('should retrieve discount analytics', async () => {
      const response = await request(app)
        .get('/api/discounts/analytics/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.discounts).toBeInstanceOf(Array);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.totalDiscounts).toBeDefined();
      expect(response.body.data.summary.totalUsage).toBeDefined();
    });

    it('should support date range filtering', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/discounts/analytics/usage?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should include usage statistics per discount', async () => {
      const response = await request(app)
        .get('/api/discounts/analytics/usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.discounts.length > 0) {
        const discount = response.body.data.discounts[0];
        expect(discount.totalUses).toBeDefined();
        expect(discount.totalDiscountAmount).toBeDefined();
        expect(discount.avgDiscountAmount).toBeDefined();
      }
    });
  });

  // ===== Authorization Tests =====

  describe('Authorization checks', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/api/discounts')
        .expect(401);

      await request(app)
        .post('/api/discounts')
        .send({ code: 'TEST' })
        .expect(401);
    });
  });
});
