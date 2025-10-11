const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { authenticateEmployee, authorizeRoles } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * tags:
 *   - name: Discounts
 *     description: Discount code management endpoints (US-030)
 */

/**
 * @swagger
 * /api/discounts:
 *   get:
 *     summary: Get all discount codes (US-030)
 *     description: Retrieve all discount codes with filtering options
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include expired discount codes
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
 *         description: Discount codes retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateEmployee, discountController.getAllDiscountCodes);

/**
 * @swagger
 * /api/discounts/{code}:
 *   get:
 *     summary: Get discount code by code (US-030)
 *     description: Retrieve detailed information about a specific discount code
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Discount code
 *     responses:
 *       200:
 *         description: Discount code retrieved successfully
 *       404:
 *         description: Discount code not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:code', authenticateEmployee, discountController.getDiscountCodeByCode);

/**
 * @swagger
 * /api/discounts:
 *   post:
 *     summary: Create discount code (US-030)
 *     description: Create a new targeted discount code
 *     tags: [Discounts]
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
 *               - type
 *               - value
 *               - validFrom
 *               - validTo
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 50
 *                 description: Discount code (will be converted to uppercase)
 *                 example: "SUMMER2025"
 *               description:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Summer promotion discount"
 *               type:
 *                 type: string
 *                 enum: [PERCENT, AMOUNT, BOGO]
 *                 description: Type of discount
 *               value:
 *                 type: number
 *                 minimum: 0
 *                 description: Discount value (percentage or fixed amount)
 *                 example: 20
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-01T00:00:00Z"
 *               validTo:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-08-31T23:59:59Z"
 *               cpfRangeStart:
 *                 type: string
 *                 minLength: 11
 *                 maxLength: 11
 *                 description: Start of CPF range for targeted discounts
 *                 example: "00000000000"
 *               cpfRangeEnd:
 *                 type: string
 *                 minLength: 11
 *                 maxLength: 11
 *                 description: End of CPF range for targeted discounts
 *                 example: "49999999999"
 *               maxUses:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum number of times this code can be used
 *                 example: 100
 *     responses:
 *       201:
 *         description: Discount code created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Discount code already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), discountController.createDiscountCode);

/**
 * @swagger
 * /api/discounts/{code}:
 *   put:
 *     summary: Update discount code (US-030)
 *     description: Update an existing discount code
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
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
 *               description:
 *                 type: string
 *                 maxLength: 200
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validTo:
 *                 type: string
 *                 format: date-time
 *               maxUses:
 *                 type: integer
 *                 minimum: 1
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Discount code updated successfully
 *       404:
 *         description: Discount code not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:code', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), discountController.updateDiscountCode);

/**
 * @swagger
 * /api/discounts/{code}/deactivate:
 *   patch:
 *     summary: Deactivate discount code (US-030)
 *     description: Deactivate a discount code
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Discount code deactivated successfully
 *       404:
 *         description: Discount code not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:code/deactivate', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), discountController.deactivateDiscountCode);

/**
 * @swagger
 * /api/discounts/{code}/validate:
 *   get:
 *     summary: Validate discount code (US-030)
 *     description: Validate if a discount code can be used
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerCpf
 *         schema:
 *           type: string
 *           minLength: 11
 *           maxLength: 11
 *         description: Customer CPF for targeted discount validation
 *     responses:
 *       200:
 *         description: Validation result returned
 *       404:
 *         description: Discount code not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:code/validate', authenticateEmployee, discountController.validateDiscountCode);

/**
 * @swagger
 * /api/discounts/analytics/usage:
 *   get:
 *     summary: Get discount code analytics (US-030)
 *     description: Get usage analytics for all discount codes
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics/usage', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), discountController.getDiscountCodeAnalytics);

module.exports = router;
