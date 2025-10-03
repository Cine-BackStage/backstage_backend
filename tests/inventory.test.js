const request = require('supertest');
const app = require('../src/server');
const { db } = require('../src/database/prisma');
const { AuthService } = require('../src/middleware/auth');

describe('Inventory Management Tests', () => {
  let managerToken;
  let cashierToken;
  let companyId;
  let testSku1 = 'TEST-FOOD-001';
  let testSku2 = 'TEST-COLL-001';
  let testSku3 = 'TEST-EXPIRING-001';

  beforeAll(async () => {
    // Wait for app to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Get existing manager employee
      const manager = await db.employee.findFirst({
        where: { role: 'MANAGER' },
        include: { person: true }
      });

      if (!manager) {
        throw new Error('Manager employee not found - run database seed first');
      }

      companyId = manager.companyId;
      managerToken = AuthService.generateToken(manager);

      // Get existing cashier employee
      const cashier = await db.employee.findFirst({
        where: { role: 'CASHIER', companyId }
      });

      if (!cashier) {
        throw new Error('Cashier employee not found - run database seed first');
      }

      cashierToken = AuthService.generateToken(cashier);

      // Clean up test inventory items
      await db.inventoryAuditLog.deleteMany({
        where: {
          inventoryItem: {
            sku: { in: [testSku1, testSku2, testSku3] }
          }
        }
      });
      await db.inventoryAdjustment.deleteMany({
        where: {
          inventoryItem: {
            sku: { in: [testSku1, testSku2, testSku3] }
          }
        }
      });
      await db.inventoryItem.deleteMany({
        where: { sku: { in: [testSku1, testSku2, testSku3] } }
      });

    } catch (error) {
      console.error('Test setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await db.inventoryAuditLog.deleteMany({
        where: {
          inventoryItem: {
            sku: { in: [testSku1, testSku2, testSku3] }
          }
        }
      });
      await db.inventoryAdjustment.deleteMany({
        where: {
          inventoryItem: {
            sku: { in: [testSku1, testSku2, testSku3] }
          }
        }
      });
      await db.inventoryItem.deleteMany({
        where: { sku: { in: [testSku1, testSku2, testSku3] } }
      });
      await db.$disconnect();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('US-020: CRUD Operations', () => {
    test('should create a food inventory item successfully', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 30);

      const itemData = {
        sku: testSku1,
        name: 'Large Popcorn Combo',
        description: 'Large popcorn with drink',
        itemType: 'food',
        qtyOnHand: 50,
        reorderLevel: 20,
        unitCost: 3.50,
        unitPrice: 15.00,
        expiryDate: tomorrow.toISOString().split('T')[0],
        isCombo: true,
        category: 'SNACKS'
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(itemData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sku).toBe(testSku1);
      expect(response.body.data.name).toBe('Large Popcorn Combo');
      expect(response.body.data.itemType).toBe('food');
      expect(response.body.data.qtyOnHand).toBe(50);
      expect(response.body.data.food).toBeDefined();
      expect(response.body.data.food.isCombo).toBe(true);
      expect(response.body.data.food.category).toBe('SNACKS');
    });

    test('should create a collectable inventory item successfully', async () => {
      const itemData = {
        sku: testSku2,
        name: 'Movie Poster - Classic Edition',
        description: 'Collectible movie poster',
        itemType: 'collectable',
        qtyOnHand: 10,
        reorderLevel: 5,
        unitCost: 20.00,
        unitPrice: 50.00,
        category: 'POSTERS',
        brand: 'Cinema Classics'
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(itemData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sku).toBe(testSku2);
      expect(response.body.data.itemType).toBe('collectable');
      expect(response.body.data.collectable).toBeDefined();
      expect(response.body.data.collectable.brand).toBe('Cinema Classics');
      expect(response.body.data.collectable.category).toBe('POSTERS');
    });

    test('should reject duplicate SKU', async () => {
      const itemData = {
        sku: testSku1,
        name: 'Duplicate Item',
        itemType: 'general',
        qtyOnHand: 10,
        reorderLevel: 5,
        unitCost: 5.00,
        unitPrice: 10.00
      };

      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(itemData)
        .expect(409);
    });

    test('should get inventory item by SKU', async () => {
      const response = await request(app)
        .get(`/api/inventory/${testSku1}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sku).toBe(testSku1);
      expect(response.body.data.name).toBe('Large Popcorn Combo');
      expect(response.body.data.recentAdjustments).toBeDefined();
    });

    test('should update inventory item', async () => {
      const updateData = {
        name: 'Large Popcorn Combo - Updated',
        unitPrice: 16.00,
        reorderLevel: 25
      };

      const response = await request(app)
        .patch(`/api/inventory/${testSku1}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Large Popcorn Combo - Updated');
      expect(parseFloat(response.body.data.unitPrice)).toBe(16.00);
      expect(response.body.data.reorderLevel).toBe(25);
    });

    test('should deactivate inventory item', async () => {
      const response = await request(app)
        .patch(`/api/inventory/${testSku2}/deactivate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    test('should activate inventory item', async () => {
      const response = await request(app)
        .patch(`/api/inventory/${testSku2}/activate`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('US-017: Inventory Listing and Low-Stock Alerts', () => {
    test('should get all inventory items', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalItems).toBeGreaterThan(0);
    });

    test('should filter inventory by item type', async () => {
      const response = await request(app)
        .get('/api/inventory?itemType=food')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.items.forEach(item => {
        expect(item.itemType).toBe('food');
      });
    });

    test('should filter inventory by category', async () => {
      const response = await request(app)
        .get('/api/inventory?category=SNACKS')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should search inventory items', async () => {
      const response = await request(app)
        .get('/api/inventory?search=Popcorn')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    test('should get low-stock alerts', async () => {
      // First, create a low-stock item
      const lowStockItem = {
        sku: 'TEST-LOW-STOCK',
        name: 'Low Stock Item',
        itemType: 'general',
        qtyOnHand: 2,
        reorderLevel: 20,
        unitCost: 5.00,
        unitPrice: 10.00
      };

      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(lowStockItem);

      const response = await request(app)
        .get('/api/inventory/alerts/low-stock')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alerts).toBeDefined();
      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(response.body.summary).toBeDefined();

      // Clean up
      await db.inventoryItem.delete({
        where: { sku: 'TEST-LOW-STOCK' }
      });
    });

    test('should filter low-stock alerts by priority', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/low-stock?priority=HIGH')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.alerts.length > 0) {
        response.body.alerts.forEach(alert => {
          expect(alert.priority).toBe('HIGH');
        });
      }
    });

    test('cashier should be able to view low-stock alerts', async () => {
      const response = await request(app)
        .get('/api/inventory/alerts/low-stock')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('US-018: Stock Adjustments', () => {
    test('should record positive stock adjustment (restock)', async () => {
      const adjustmentData = {
        qtyChange: 100,
        reason: 'RESTOCK',
        notes: 'Weekly restock delivery'
      };

      const response = await request(app)
        .post(`/api/inventory/${testSku1}/adjust`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(adjustmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qtyChange).toBe(100);
      expect(response.body.data.reason).toBe('RESTOCK');
      expect(response.body.item.qtyOnHand).toBe(150); // 50 + 100
    });

    test('should record negative stock adjustment (damage)', async () => {
      const adjustmentData = {
        qtyChange: -10,
        reason: 'DAMAGE',
        notes: 'Items damaged during storage'
      };

      const response = await request(app)
        .post(`/api/inventory/${testSku1}/adjust`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(adjustmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qtyChange).toBe(-10);
      expect(response.body.data.reason).toBe('DAMAGE');
      expect(response.body.item.qtyOnHand).toBe(140); // 150 - 10
    });

    test('should reject adjustment that results in negative stock', async () => {
      const adjustmentData = {
        qtyChange: -200,
        reason: 'DAMAGE',
        notes: 'Too much damage'
      };

      const response = await request(app)
        .post(`/api/inventory/${testSku1}/adjust`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(adjustmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient stock');
    });

    test('cashier should be able to record adjustments', async () => {
      const adjustmentData = {
        qtyChange: -5,
        reason: 'DAMAGE',
        notes: 'Damaged items at counter'
      };

      const response = await request(app)
        .post(`/api/inventory/${testSku1}/adjust`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send(adjustmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('US-019: Adjustment History and Audit Logs', () => {
    test('should get adjustment history for all items', async () => {
      const response = await request(app)
        .get('/api/inventory/adjustments/history')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.adjustments).toBeDefined();
      expect(Array.isArray(response.body.adjustments)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter adjustment history by SKU', async () => {
      const response = await request(app)
        .get(`/api/inventory/adjustments/history?sku=${testSku1}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.adjustments.forEach(adj => {
        expect(adj.itemSku).toBe(testSku1);
      });
    });

    test('should filter adjustment history by reason', async () => {
      const response = await request(app)
        .get('/api/inventory/adjustments/history?reason=DAMAGE')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.adjustments.length > 0) {
        response.body.adjustments.forEach(adj => {
          expect(adj.reason).toBe('DAMAGE');
        });
      }
    });

    test('should get audit logs for inventory operations', async () => {
      const response = await request(app)
        .get('/api/inventory/audit/logs')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.logs).toBeDefined();
      expect(Array.isArray(response.body.logs)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter audit logs by SKU', async () => {
      const response = await request(app)
        .get(`/api/inventory/audit/logs?sku=${testSku1}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.logs.length > 0) {
        response.body.logs.forEach(log => {
          expect(log.itemSku).toBe(testSku1);
        });
      }
    });

    test('should filter audit logs by action type', async () => {
      const response = await request(app)
        .get('/api/inventory/audit/logs?action=CREATE')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.logs.length > 0) {
        response.body.logs.forEach(log => {
          expect(log.action).toBe('CREATE');
        });
      }
    });

    test('non-manager should not access audit logs', async () => {
      await request(app)
        .get('/api/inventory/audit/logs')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403);
    });
  });

  describe('US-021: Expiration Tracking', () => {
    beforeAll(async () => {
      // Create an expiring food item
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const expiringItem = {
        sku: testSku3,
        name: 'Expiring Food Item',
        description: 'Item expiring soon',
        itemType: 'food',
        qtyOnHand: 20,
        reorderLevel: 10,
        unitCost: 2.00,
        unitPrice: 5.00,
        expiryDate: twoDaysFromNow.toISOString().split('T')[0],
        category: 'PERISHABLE'
      };

      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(expiringItem);
    });

    test('should get expiring items within 7 days', async () => {
      const response = await request(app)
        .get('/api/inventory/expiring?days=7')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.expiringItems).toBeDefined();
      expect(Array.isArray(response.body.expiringItems)).toBe(true);
      expect(response.body.expiredItems).toBeDefined();
      expect(response.body.summary).toBeDefined();

      // Should include our test item
      const testItem = response.body.expiringItems.find(
        item => item.sku === testSku3
      );
      expect(testItem).toBeDefined();
      expect(testItem.daysRemaining).toBeLessThanOrEqual(7);
      expect(testItem.priority).toBeDefined();
      expect(testItem.action).toBeDefined();
    });

    test('should get expiring items within 3 days', async () => {
      const response = await request(app)
        .get('/api/inventory/expiring?days=3')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const testItem = response.body.expiringItems.find(
        item => item.sku === testSku3
      );
      expect(testItem).toBeDefined();
    });

    test('cashier should be able to view expiring items', async () => {
      const response = await request(app)
        .get('/api/inventory/expiring?days=7')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authorization Tests', () => {
    test('cashier should not be able to create items', async () => {
      const itemData = {
        sku: 'UNAUTH-TEST',
        name: 'Unauthorized Item',
        itemType: 'general',
        qtyOnHand: 10,
        reorderLevel: 5,
        unitCost: 5.00,
        unitPrice: 10.00
      };

      await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send(itemData)
        .expect(403);
    });

    test('cashier should not be able to update items', async () => {
      await request(app)
        .patch(`/api/inventory/${testSku1}`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    test('cashier should not be able to deactivate items', async () => {
      await request(app)
        .patch(`/api/inventory/${testSku1}/deactivate`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403);
    });

    test('unauthenticated request should be rejected', async () => {
      await request(app)
        .get('/api/inventory')
        .expect(401);
    });
  });
});
