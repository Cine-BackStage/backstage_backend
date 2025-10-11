/**
 * Test suite for Inventory Management - US-019, US-020, US-021
 * Tests for audit logs, item master data management, and expiration tracking
 */

const request = require('supertest');
const app = require('../src/server');
const { db } = require('../src/database/prisma');
const jwt = require('jsonwebtoken');

describe('Inventory Audit and Management (US-019, US-020, US-021)', () => {
  let authToken;
  let companyId;
  let employeeCpf;
  let testSku;

  beforeAll(async () => {
    // Create test company
    const company = await db.company.create({
      data: {
        name: 'Test Cinema Inventory',
        cnpj: '87654321000199',
        tradeName: 'Test Inventory Cinema',
        isActive: true
      }
    });
    companyId = company.id;

    // Create test person
    const person = await db.person.create({
      data: {
        cpf: '98765432100',
        fullName: 'Inventory Manager Test',
        email: 'inventory@test.com',
        phone: '11999999999'
      }
    });
    employeeCpf = person.cpf;

    // Create test employee (manager role for permissions)
    await db.employee.create({
      data: {
        cpf: employeeCpf,
        companyId,
        employeeId: 'INV001',
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

    // Create test inventory items
    testSku = 'TEST-SKU-001';
    await db.inventoryItem.create({
      data: {
        sku: testSku,
        companyId,
        name: 'Test Popcorn',
        unitPrice: 10.00,
        qtyOnHand: 50,
        reorderLevel: 20,
        barcode: '1234567890',
        isActive: true,
        food: {
          create: {
            expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
            isCombo: false,
            category: 'SNACKS'
          }
        }
      }
    });

    // Create another item for testing
    await db.inventoryItem.create({
      data: {
        sku: 'TEST-SKU-002',
        companyId,
        name: 'Test Soda',
        unitPrice: 8.00,
        qtyOnHand: 15,
        reorderLevel: 30,
        isActive: true,
        food: {
          create: {
            expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now (critical)
            isCombo: false,
            category: 'BEVERAGES'
          }
        }
      }
    });

    // Create collectable item
    await db.inventoryItem.create({
      data: {
        sku: 'TEST-COLL-001',
        companyId,
        name: 'Test Movie Poster',
        unitPrice: 50.00,
        qtyOnHand: 5,
        reorderLevel: 10,
        isActive: true,
        collectable: {
          create: {
            category: 'POSTERS',
            brand: 'Cinema Art'
          }
        }
      }
    });

    // Create some test adjustments
    await db.inventoryAdjustment.create({
      data: {
        companyId,
        sku: testSku,
        delta: -5,
        reason: 'DAMAGE',
        actorCpf: employeeCpf,
        notes: 'Test damage adjustment'
      }
    });

    await db.inventoryAdjustment.create({
      data: {
        companyId,
        sku: testSku,
        delta: 10,
        reason: 'RESTOCK',
        actorCpf: employeeCpf,
        notes: 'Test restock adjustment'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await db.inventoryAdjustment.deleteMany({ where: { companyId } });
    await db.food.deleteMany({ where: { companyId } });
    await db.collectable.deleteMany({ where: { companyId } });
    await db.inventoryItem.deleteMany({ where: { companyId } });
    await db.employee.deleteMany({ where: { companyId } });
    await db.person.delete({ where: { cpf: employeeCpf } });
    await db.company.delete({ where: { id: companyId } });
    await db.$disconnect();
  });

  // ===== US-019: View inventory audit logs =====

  describe('US-019: View inventory adjustment history', () => {
    it('should get all adjustment history', async () => {
      const response = await request(app)
        .get('/api/inventory/adjustments/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter adjustments by SKU', async () => {
      const response = await request(app)
        .get(`/api/inventory/adjustments/history?sku=${testSku}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach(adj => {
        expect(adj.sku).toBe(testSku);
      });
    });

    it('should filter adjustments by reason', async () => {
      const response = await request(app)
        .get('/api/inventory/adjustments/history?reason=DAMAGE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(adj => {
        expect(adj.reason).toBe('DAMAGE');
      });
    });

    it('should filter adjustments by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/inventory/adjustments/history?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should include item and actor details in adjustments', async () => {
      const response = await request(app)
        .get('/api/inventory/adjustments/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const adjustment = response.body.data[0];
      expect(adjustment.item).toBeDefined();
      expect(adjustment.item.name).toBeDefined();
      expect(adjustment.actor).toBeDefined();
      expect(adjustment.actor.person.fullName).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/inventory/adjustments/history?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });

  describe('US-019: View inventory audit logs', () => {
    it('should get inventory audit logs', async () => {
      const response = await request(app)
        .get('/api/inventory/audit/logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter audit logs by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/inventory/audit/logs?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ===== US-020: Manage item master data =====

  describe('US-020: Create inventory item', () => {
    it('should create a new food item', async () => {
      const newItem = {
        sku: 'FOOD-NEW-001',
        name: 'New Snack Item',
        unitPrice: 12.50,
        qtyOnHand: 100,
        reorderLevel: 25,
        barcode: '9999999999',
        itemType: 'food',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isCombo: false,
        foodCategory: 'SNACKS'
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newItem)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sku).toBe(newItem.sku);
      expect(response.body.data.name).toBe(newItem.name);
      expect(response.body.data.food).toBeDefined();
      expect(response.body.data.food.category).toBe(newItem.foodCategory);
    });

    it('should create a new collectable item', async () => {
      const newItem = {
        sku: 'COLL-NEW-001',
        name: 'New Collectable',
        unitPrice: 45.00,
        qtyOnHand: 10,
        reorderLevel: 5,
        itemType: 'collectable',
        collectableCategory: 'MERCHANDISE',
        brand: 'Test Brand'
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newItem)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collectable).toBeDefined();
      expect(response.body.data.collectable.brand).toBe(newItem.brand);
    });

    it('should reject duplicate SKU', async () => {
      const duplicateItem = {
        sku: testSku,
        name: 'Duplicate Item',
        unitPrice: 10.00,
        qtyOnHand: 10,
        reorderLevel: 5,
        itemType: 'general'
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateItem)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidItem = {
        name: 'Invalid Item'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidItem)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('US-020: Update inventory item', () => {
    it('should update item master data', async () => {
      const updates = {
        name: 'Updated Popcorn Name',
        unitPrice: 12.00,
        reorderLevel: 25
      };

      const response = await request(app)
        .patch(`/api/inventory/${testSku}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(parseFloat(response.body.data.unitPrice)).toBe(updates.unitPrice);
    });

    it('should update food-specific fields', async () => {
      const updates = {
        expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        foodCategory: 'PREMIUM_SNACKS'
      };

      const response = await request(app)
        .patch(`/api/inventory/${testSku}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .patch('/api/inventory/NONEXISTENT-SKU')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('US-020: Get item by SKU', () => {
    it('should retrieve item details with history', async () => {
      const response = await request(app)
        .get(`/api/inventory/${testSku}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sku).toBe(testSku);
      expect(response.body.data.adjustments).toBeDefined();
      expect(response.body.data.isLowStock).toBeDefined();
      expect(response.body.data.stockStatus).toBeDefined();
    });

    it('should return 404 for non-existent SKU', async () => {
      const response = await request(app)
        .get('/api/inventory/NONEXISTENT-SKU')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('US-020: Activate/Deactivate items', () => {
    it('should deactivate an item', async () => {
      const response = await request(app)
        .patch(`/api/inventory/${testSku}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should activate an item', async () => {
      const response = await request(app)
        .patch(`/api/inventory/${testSku}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  // ===== US-021: Track expiration dates =====

  describe('US-021: Track expiration dates', () => {
    it('should get expiring items within default days', async () => {
      const response = await request(app)
        .get('/api/inventory/expiring')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.expiringItems).toBeInstanceOf(Array);
      expect(response.body.data.expiredItems).toBeInstanceOf(Array);
      expect(response.body.summary).toBeDefined();
    });

    it('should get expiring items with custom days parameter', async () => {
      const response = await request(app)
        .get('/api/inventory/expiring?days=7')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.expiringItems.forEach(item => {
        expect(item.daysRemaining).toBeLessThanOrEqual(7);
        expect(item.priority).toBeDefined();
        expect(item.action).toBeDefined();
      });
    });

    it('should classify items by priority correctly', async () => {
      const response = await request(app)
        .get('/api/inventory/expiring?days=30')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Find the item expiring in 2 days
      const criticalItem = response.body.data.expiringItems.find(
        item => item.daysRemaining <= 3
      );

      if (criticalItem) {
        expect(criticalItem.priority).toBe('CRITICAL');
        expect(criticalItem.action).toBe('REMOVE_IMMEDIATELY');
      }
    });

    it('should include summary statistics', async () => {
      const response = await request(app)
        .get('/api/inventory/expiring?days=30')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary.expiringInNext7Days).toBeDefined();
      expect(response.body.summary.expiringInNext30Days).toBeDefined();
      expect(response.body.summary.expired).toBeDefined();
      expect(response.body.summary.criticalAction).toBeDefined();
    });

    it('should validate days parameter', async () => {
      const response = await request(app)
        .get('/api/inventory/expiring?days=200')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ===== Authorization Tests =====

  describe('Authorization checks', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/api/inventory/adjustments/history')
        .expect(401);

      await request(app)
        .get('/api/inventory/audit/logs')
        .expect(401);

      await request(app)
        .post('/api/inventory')
        .send({ sku: 'TEST' })
        .expect(401);
    });
  });
});
