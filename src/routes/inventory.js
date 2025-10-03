const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateEmployee, authorizeRoles } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * tags:
 *   - name: Inventory
 *     description: Inventory management endpoints (US-017 to US-021)
 */

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get all inventory items with filtering and alerts (US-017)
 *     description: Retrieve inventory items with low-stock alerts, filtering by type, category, and status
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active/inactive status
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Show only low-stock items
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [food, collectable, general]
 *         description: Filter by item type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (case-insensitive)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in SKU, name, or description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Inventory items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     lowStockItems:
 *                       type: integer
 *                     outOfStockItems:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateEmployee, inventoryController.getAllItems);

/**
 * @swagger
 * /api/inventory/alerts/low-stock:
 *   get:
 *     summary: Get low-stock alerts with priority (US-017)
 *     description: Retrieve items at or below reorder level with priority classification
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [CRITICAL, HIGH, MEDIUM]
 *         description: Filter by alert priority
 *     responses:
 *       200:
 *         description: Low-stock alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sku:
 *                         type: string
 *                       name:
 *                         type: string
 *                       qtyOnHand:
 *                         type: integer
 *                       reorderLevel:
 *                         type: integer
 *                       priority:
 *                         type: string
 *                         enum: [CRITICAL, HIGH, MEDIUM]
 *                       reorderQuantity:
 *                         type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     critical:
 *                       type: integer
 *                     high:
 *                       type: integer
 *                     medium:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/alerts/low-stock', authenticateEmployee, authorizeRoles('CASHIER', 'MANAGER', 'ADMIN'), inventoryController.getLowStockAlerts);

/**
 * @swagger
 * /api/inventory/expiring:
 *   get:
 *     summary: Get expiring food items (US-021)
 *     description: Retrieve food items expiring within specified days with action recommendations
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           minimum: 1
 *           maximum: 365
 *         description: Number of days to look ahead
 *     responses:
 *       200:
 *         description: Expiring items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 expiredItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                 expiringItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sku:
 *                         type: string
 *                       name:
 *                         type: string
 *                       expiryDate:
 *                         type: string
 *                         format: date
 *                       daysRemaining:
 *                         type: integer
 *                       priority:
 *                         type: string
 *                       action:
 *                         type: string
 *                 summary:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/expiring', authenticateEmployee, authorizeRoles('CASHIER', 'MANAGER', 'ADMIN'), inventoryController.getExpiringItems);

/**
 * @swagger
 * /api/inventory/{sku}:
 *   get:
 *     summary: Get inventory item by SKU with history (US-020)
 *     description: Retrieve detailed item information including recent adjustments
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *         description: Item SKU
 *     responses:
 *       200:
 *         description: Item retrieved successfully
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:sku', authenticateEmployee, inventoryController.getItemBySku);

/**
 * @swagger
 * /api/inventory/adjustments/history:
 *   get:
 *     summary: Get stock adjustment history (US-019)
 *     description: Retrieve inventory adjustments with filtering by SKU, date, and reason
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sku
 *         schema:
 *           type: string
 *         description: Filter by item SKU
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [DAMAGE, THEFT, EXPIRY, RESTOCK, RETURN, COUNT_CORRECTION, OTHER]
 *         description: Filter by adjustment reason
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter up to this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Adjustment history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/adjustments/history', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), inventoryController.getAdjustments);

/**
 * @swagger
 * /api/inventory/audit/logs:
 *   get:
 *     summary: Get inventory audit logs (US-019)
 *     description: Retrieve detailed audit trail of inventory operations
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sku
 *         schema:
 *           type: string
 *         description: Filter by item SKU
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [CREATE, UPDATE, DEACTIVATE, ACTIVATE, ADJUSTMENT]
 *         description: Filter by action type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/audit/logs', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), inventoryController.getAuditLogs);

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Create new inventory item (US-020)
 *     description: Create item with support for food, collectable, or general types
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - itemType
 *               - qtyOnHand
 *               - reorderLevel
 *               - unitCost
 *               - unitPrice
 *             properties:
 *               sku:
 *                 type: string
 *                 maxLength: 50
 *                 description: Unique SKU code
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               itemType:
 *                 type: string
 *                 enum: [food, collectable, general]
 *               qtyOnHand:
 *                 type: integer
 *                 minimum: 0
 *               reorderLevel:
 *                 type: integer
 *                 minimum: 0
 *               unitCost:
 *                 type: number
 *                 minimum: 0
 *               unitPrice:
 *                 type: number
 *                 minimum: 0
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 description: Required for food items
 *               isCombo:
 *                 type: boolean
 *                 description: For food items
 *               category:
 *                 type: string
 *                 maxLength: 100
 *                 description: For food or collectable items
 *               brand:
 *                 type: string
 *                 maxLength: 100
 *                 description: For collectable items
 *           examples:
 *             foodItem:
 *               value:
 *                 sku: "FOOD-POPCORN-L"
 *                 name: "Large Popcorn"
 *                 description: "Large bucket of buttered popcorn"
 *                 itemType: "food"
 *                 qtyOnHand: 50
 *                 reorderLevel: 20
 *                 unitCost: 3.50
 *                 unitPrice: 15.00
 *                 expiryDate: "2025-12-31"
 *                 isCombo: false
 *                 category: "SNACKS"
 *             collectableItem:
 *               value:
 *                 sku: "COLL-POSTER-001"
 *                 name: "Movie Poster - Classic Edition"
 *                 itemType: "collectable"
 *                 qtyOnHand: 10
 *                 reorderLevel: 5
 *                 unitCost: 20.00
 *                 unitPrice: 50.00
 *                 category: "POSTERS"
 *                 brand: "Cinema Classics"
 *     responses:
 *       201:
 *         description: Item created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: SKU already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), inventoryController.createItem);

/**
 * @swagger
 * /api/inventory/{sku}:
 *   patch:
 *     summary: Update inventory item (US-020)
 *     description: Update item details and type-specific fields
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               reorderLevel:
 *                 type: integer
 *                 minimum: 0
 *               unitCost:
 *                 type: number
 *                 minimum: 0
 *               unitPrice:
 *                 type: number
 *                 minimum: 0
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               isCombo:
 *                 type: boolean
 *               category:
 *                 type: string
 *                 maxLength: 100
 *               brand:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       404:
 *         description: Item not found
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/:sku', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), inventoryController.updateItem);

/**
 * @swagger
 * /api/inventory/{sku}/deactivate:
 *   patch:
 *     summary: Deactivate inventory item (US-020)
 *     description: Soft delete an item (sets isActive to false)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deactivated successfully
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:sku/deactivate', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), inventoryController.deactivateItem);

/**
 * @swagger
 * /api/inventory/{sku}/activate:
 *   patch:
 *     summary: Activate inventory item (US-020)
 *     description: Reactivate a previously deactivated item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item activated successfully
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:sku/activate', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), inventoryController.activateItem);

/**
 * @swagger
 * /api/inventory/{sku}/adjust:
 *   post:
 *     summary: Record stock adjustment (US-018)
 *     description: Add or subtract inventory with reason and notes
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qtyChange
 *               - reason
 *             properties:
 *               qtyChange:
 *                 type: integer
 *                 description: Positive for increase, negative for decrease
 *               reason:
 *                 type: string
 *                 enum: [DAMAGE, THEFT, EXPIRY, RESTOCK, RETURN, COUNT_CORRECTION, OTHER]
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *           examples:
 *             damage:
 *               value:
 *                 qtyChange: -5
 *                 reason: "DAMAGE"
 *                 notes: "Items damaged during storage"
 *             restock:
 *               value:
 *                 qtyChange: 100
 *                 reason: "RESTOCK"
 *                 notes: "Weekly restock delivery"
 *     responses:
 *       201:
 *         description: Adjustment recorded successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:sku/adjust', authenticateEmployee, authorizeRoles('CASHIER', 'MANAGER', 'ADMIN'), inventoryController.recordAdjustment);

module.exports = router;
