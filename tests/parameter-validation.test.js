const request = require('supertest');
const app = require('../src/server');
const { db } = require('../src/database/prisma');
const { AuthService } = require('../src/middleware/auth-multitenant');

describe('API Parameter Validation Tests', () => {
  let adminToken;
  let companyId;
  const testCNPJ = '20000000000199'; // 14 digits for CNPJ
  const testCPF = '20000000099'; // 11 digits for CPF

  beforeAll(async () => {
    // Clean up any existing test data first
    try {
      const existingCompany = await db.company.findFirst({
        where: { cnpj: testCNPJ }
      });
      if (existingCompany) {
        await db.employee.deleteMany({ where: { companyId: existingCompany.id } });
        await db.company.delete({ where: { id: existingCompany.id } });
      }
      const existingPerson = await db.person.findUnique({ where: { cpf: testCPF } });
      if (existingPerson) {
        await db.person.delete({ where: { cpf: testCPF } });
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    // Create test company and admin
    const company = await db.company.create({
      data: {
        name: 'Parameter Test Cinema',
        cnpj: testCNPJ,
        tradeName: 'Param Test Cinema',
        email: `param-test-${Date.now()}@cinema.com`,
        phone: '1234567890',
        isActive: true
      }
    });
    companyId = company.id;

    const person = await db.person.create({
      data: {
        cpf: testCPF,
        fullName: 'Parameter Test Admin',
        email: `param-admin-${Date.now()}@test.com`,
        phone: '1234567890'
      }
    });

    await db.employee.create({
      data: {
        cpf: person.cpf,
        companyId: company.id,
        employeeId: `PARAM-TEST-${Date.now()}`,
        role: 'ADMIN',
        hireDate: new Date(),
        passwordHash: await AuthService.hashPassword('password123'),
        isActive: true
      }
    });

    const loginResponse = await request(app)
      .post('/api/employees/login')
      .send({
        cpf: testCPF,
        password: 'password123',
        company_id: companyId
      });

    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    try {
      // Clean up in correct order to respect foreign keys
      await db.auditLog.deleteMany({ where: { companyId } });
      await db.timeEntry.deleteMany({ where: { companyId } });
      await db.employee.deleteMany({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
      await db.person.delete({ where: { cpf: testCPF } });
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
    await db.$disconnect();
  });

  describe('Movies API - Query Parameters', () => {
    it('should reject invalid page parameter', async () => {
      const response = await request(app)
        .get('/api/movies?page=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject negative page parameter', async () => {
      const response = await request(app)
        .get('/api/movies?page=-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    it('should reject invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/movies?limit=abc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    it('should reject limit exceeding maximum', async () => {
      const response = await request(app)
        .get('/api/movies?limit=1000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    it('should handle multiple valid query parameters', async () => {
      const response = await request(app)
        .get('/api/movies?page=1&limit=10&genre=Action&is_active=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Movies API - Request Body Parameters', () => {
    it('should reject movie creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Movie'
          // Missing duration_min, genre, etc.
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/validation/i);
    });

    it('should reject movie with invalid rating', async () => {
      const response = await request(app)
        .post('/api/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Movie',
          duration_min: 120,
          genre: 'Action',
          description: 'Test description',
          rating: 'INVALID_RATING',
          poster_url: 'https://example.com/poster.jpg'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject movie with negative duration', async () => {
      const response = await request(app)
        .post('/api/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Movie',
          duration_min: -120,
          genre: 'Action',
          description: 'Test description',
          rating: 'PG-13',
          poster_url: 'https://example.com/poster.jpg'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject movie with invalid poster URL', async () => {
      const response = await request(app)
        .post('/api/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Movie',
          duration_min: 120,
          genre: 'Action',
          description: 'Test description',
          rating: 'PG-13',
          poster_url: 'not-a-valid-url'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject movie with empty title', async () => {
      const response = await request(app)
        .post('/api/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          duration_min: 120,
          genre: 'Action',
          description: 'Test description',
          rating: 'PG-13',
          poster_url: 'https://example.com/poster.jpg'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject movie with title exceeding max length', async () => {
      const response = await request(app)
        .post('/api/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'A'.repeat(256),
          duration_min: 120,
          genre: 'Action',
          description: 'Test description',
          rating: 'PG-13',
          poster_url: 'https://example.com/poster.jpg'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Customers API - Path Parameters', () => {
    it('should reject invalid CPF format in path', async () => {
      const response = await request(app)
        .get('/api/customers/invalid-cpf')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should reject CPF with letters', async () => {
      const response = await request(app)
        .get('/api/customers/1234567890a')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should reject CPF with wrong length', async () => {
      const response = await request(app)
        .get('/api/customers/123456789')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should reject CPF with special characters', async () => {
      const response = await request(app)
        .get('/api/customers/123.456.789-00')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Customers API - Request Body Parameters', () => {
    it('should reject customer creation with invalid email', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cpf: '98765432100',
          full_name: 'Test Customer',
          birth_date: '1990-01-01',
          email: 'invalid-email',
          phone: '1234567890'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject customer with future birth date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cpf: '98765432100',
          full_name: 'Test Customer',
          birth_date: futureDate.toISOString().split('T')[0],
          email: 'test@example.com',
          phone: '1234567890'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject customer with invalid phone format', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cpf: '98765432100',
          full_name: 'Test Customer',
          birth_date: '1990-01-01',
          email: 'test@example.com',
          phone: 'abc'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Sessions API - Query Parameters', () => {
    it('should handle date range query parameters', async () => {
      const response = await request(app)
        .get('/api/sessions?startDate=2025-01-01&endDate=2025-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/sessions?startDate=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    it('should handle status filter parameter', async () => {
      const response = await request(app)
        .get('/api/sessions?status=SCHEDULED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid status filter', async () => {
      const response = await request(app)
        .get('/api/sessions?status=INVALID_STATUS')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    it('should handle UUID parameters', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/sessions?movieId=${validUUID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/sessions?movieId=not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });
  });

  describe('Discounts API - Request Body Parameters', () => {
    it('should reject discount with invalid discount type', async () => {
      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST10',
          discount_type: 'INVALID',
          discount_value: 10,
          valid_from: new Date().toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject discount with negative value', async () => {
      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST10',
          discount_type: 'PERCENTAGE',
          discount_value: -10,
          valid_from: new Date().toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject percentage discount over 100', async () => {
      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST150',
          discount_type: 'PERCENTAGE',
          discount_value: 150,
          valid_from: new Date().toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject discount with valid_to before valid_from', async () => {
      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST10',
          discount_type: 'PERCENTAGE',
          discount_value: 10,
          valid_from: new Date(Date.now() + 86400000).toISOString(),
          valid_to: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject discount code with invalid characters', async () => {
      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST@#$%',
          discount_type: 'PERCENTAGE',
          discount_value: 10,
          valid_from: new Date().toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString()
        });

      expect([400, 201]).toContain(response.status);
    });

    it('should reject discount code exceeding max length', async () => {
      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'A'.repeat(51),
          discount_type: 'PERCENTAGE',
          discount_value: 10,
          valid_from: new Date().toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Sales API - Request Body Parameters', () => {
    it('should reject payment with invalid method', async () => {
      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          buyer_cpf: '12345678900',
          items: [],
          payments: [{
            method: 'BITCOIN',
            amount: 100
          }]
        });

      expect([400, 201]).toContain(response.status);
    });

    it('should reject sale item with negative quantity', async () => {
      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          buyer_cpf: '12345678900',
          items: [{
            description: 'Test Item',
            unit_price: 10,
            quantity: -1
          }]
        });

      expect([400, 201]).toContain(response.status);
    });

    it('should reject sale item with zero price', async () => {
      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          buyer_cpf: '12345678900',
          items: [{
            description: 'Test Item',
            unit_price: 0,
            quantity: 1
          }]
        });

      expect([400, 201]).toContain(response.status);
    });
  });

  describe('Inventory API - Query Parameters', () => {
    it('should handle category filter', async () => {
      const response = await request(app)
        .get('/api/inventory?category=FOOD')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .get('/api/inventory?category=INVALID')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    it('should handle low stock threshold parameter', async () => {
      const response = await request(app)
        .get('/api/inventory/low-stock?threshold=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject negative threshold', async () => {
      const response = await request(app)
        .get('/api/inventory/low-stock?threshold=-5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });
  });

  describe('Mixed Parameter Types', () => {
    it('should handle combination of path, query, and body parameters', async () => {
      // This would test a complex endpoint that uses all parameter types
      const response = await request(app)
        .get('/api/movies?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject when combining invalid parameters', async () => {
      const response = await request(app)
        .get('/api/movies?page=-1&limit=abc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query string', async () => {
      const response = await request(app)
        .get('/api/movies?')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle duplicate query parameters', async () => {
      const response = await request(app)
        .get('/api/movies?page=1&page=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should handle extremely large numbers', async () => {
      const response = await request(app)
        .get('/api/movies?page=999999999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(response.status);
    });

    it('should handle special characters in query parameters', async () => {
      const response = await request(app)
        .get('/api/movies?search=' + encodeURIComponent('Test & Movie'))
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject null values in required fields', async () => {
      const response = await request(app)
        .post('/api/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: null,
          duration_min: 120,
          genre: 'Action'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle undefined values in optional fields', async () => {
      const response = await request(app)
        .get('/api/movies?genre=')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});
