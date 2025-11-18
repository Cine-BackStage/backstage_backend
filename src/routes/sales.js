const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticateEmployee, authorizeRoles } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * tags:
 *   - name: Sales
 *     description: Point of Sale (POS) and sales management endpoints (US-011 to US-016)
 */

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get all sales with filtering (US-011, US-014)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, FINALIZED, CANCELED, REFUNDED]
 *       - in: query
 *         name: cashierCpf
 *         schema:
 *           type: string
 *       - in: query
 *         name: buyerCpf
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateEmployee, saleController.getAllSales);

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     summary: Get sale by ID with full details (US-011)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sale retrieved successfully
 *       404:
 *         description: Sale not found
 */
router.get('/:id', authenticateEmployee, saleController.getSaleById);

/**
 * @swagger
 * /api/sales/reports/detailed:
 *   get:
 *     summary: Get detailed sales reports (US-014)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, cashier, payment_method]
 *           default: day
 *     responses:
 *       200:
 *         description: Report generated successfully
 */
router.get('/reports/summary', authenticateEmployee, authorizeRoles('CASHIER', 'MANAGER', 'ADMIN'), saleController.getSalesSummary);
router.get('/reports/detailed', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), saleController.getSalesReports);

/**
 * @swagger
 * /api/sales/shift/reconciliation:
 *   get:
 *     summary: Get shift reconciliation report (US-016)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: cashierCpf
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reconciliation retrieved successfully
 */
router.get('/shift/reconciliation', authenticateEmployee, saleController.getShiftReconciliation);

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Create new sale transaction (US-011)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               buyerCpf:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sale created successfully
 */
router.post('/', authenticateEmployee, saleController.createSale);

/**
 * @swagger
 * /api/sales/{saleId}/items:
 *   post:
 *     summary: Add item to sale (US-011)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - quantity
 *               - unitPrice
 *             properties:
 *               sku:
 *                 type: string
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *               seatId:
 *                 type: string
 *               description:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item added successfully
 */
router.post('/:saleId/items', authenticateEmployee, saleController.addItemToSale);

/**
 * @swagger
 * /api/sales/{saleId}/items/{itemId}:
 *   delete:
 *     summary: Remove item from sale (US-011)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Item removed successfully
 */
router.delete('/:saleId/items/:itemId', authenticateEmployee, saleController.removeItemFromSale);

/**
 * @swagger
 * /api/sales/discount/validate:
 *   post:
 *     summary: Validate discount code without applying to sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - subtotal
 *             properties:
 *               code:
 *                 type: string
 *               subtotal:
 *                 type: number
 *     responses:
 *       200:
 *         description: Discount code validated successfully
 *       400:
 *         description: Invalid or expired discount code
 */
router.post('/discount/validate', authenticateEmployee, saleController.validateDiscount);

/**
 * @swagger
 * /api/sales/{saleId}/discount:
 *   post:
 *     summary: Apply discount code to sale (US-012)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Discount applied successfully
 *       400:
 *         description: Invalid or expired discount code
 */
router.post('/:saleId/discount', authenticateEmployee, saleController.applyDiscount);

/**
 * @swagger
 * /api/sales/{saleId}/payments:
 *   post:
 *     summary: Add payment to sale (US-013)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *               - amount
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [CASH, CARD, PIX, OTHER]
 *               amount:
 *                 type: number
 *               authCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment added successfully
 */
router.post('/:saleId/payments', authenticateEmployee, saleController.addPayment);

/**
 * @swagger
 * /api/sales/{saleId}/finalize:
 *   post:
 *     summary: Finalize sale with payment (US-013)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sale finalized successfully
 *       400:
 *         description: Insufficient payment or invalid sale state
 */
router.post('/:saleId/finalize', authenticateEmployee, saleController.finalizeSale);

/**
 * @swagger
 * /api/sales/{saleId}/cancel:
 *   post:
 *     summary: Cancel sale (US-015)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sale canceled successfully
 */
router.post('/:saleId/cancel', authenticateEmployee, saleController.cancelSale);

/**
 * @swagger
 * /api/sales/{saleId}/refund:
 *   post:
 *     summary: Refund finalized sale (US-015)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sale refunded successfully
 */
router.post('/:saleId/refund', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), saleController.refundSale);

/**
 * @swagger
 * /api/sales/cleanup/abandoned:
 *   post:
 *     summary: Clean up abandoned OPEN sales older than 15 minutes
 *     description: Automatically cancels OPEN sales that have been inactive for more than 15 minutes to prevent seat locking
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 cleaned:
 *                   type: integer
 *                 saleIds:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/cleanup/abandoned', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), saleController.cleanupAbandonedSales);

module.exports = router;
