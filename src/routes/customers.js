const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateEmployee, authorizeRoles } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * tags:
 *   - name: Customers
 *     description: Customer management and loyalty program endpoints (US-027, US-028, US-029, US-031)
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers (US-027)
 *     description: Retrieve all customers for the current cinema with search and pagination
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or CPF
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
 *         description: Customers retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateEmployee, customerController.getAllCustomers);

/**
 * @swagger
 * /api/customers/{cpf}:
 *   get:
 *     summary: Get customer by CPF with analytics (US-027, US-028)
 *     description: Retrieve customer profile with purchase history and analytics
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 11
 *           maxLength: 11
 *         description: Customer CPF (11 digits)
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:cpf', authenticateEmployee, customerController.getCustomerByCpf);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create new customer profile (US-027)
 *     description: Register a new customer for the cinema
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cpf
 *               - fullName
 *               - email
 *               - phone
 *             properties:
 *               cpf:
 *                 type: string
 *                 minLength: 11
 *                 maxLength: 11
 *                 description: Customer CPF (11 digits, numbers only)
 *                 example: "12345678901"
 *               fullName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 200
 *                 example: "joao@example.com"
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 20
 *                 example: "11999999999"
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Customer already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateEmployee, authorizeRoles('CASHIER', 'MANAGER', 'ADMIN'), customerController.createCustomer);

/**
 * @swagger
 * /api/customers/{cpf}:
 *   put:
 *     summary: Update customer profile (US-027)
 *     description: Update customer information
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
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
 *               fullName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:cpf', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), customerController.updateCustomer);

/**
 * @swagger
 * /api/customers/{cpf}/purchase-history:
 *   get:
 *     summary: Get customer purchase history (US-028)
 *     description: Retrieve detailed purchase history for a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
 *         required: true
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Purchase history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/:cpf/purchase-history', authenticateEmployee, customerController.getCustomerPurchaseHistory);

/**
 * @swagger
 * /api/customers/{cpf}/loyalty/add:
 *   post:
 *     summary: Add loyalty points (US-029)
 *     description: Add points to customer's loyalty account
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
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
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *                 minimum: 1
 *                 example: 100
 *               reason:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Purchase reward"
 *     responses:
 *       200:
 *         description: Points added successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:cpf/loyalty/add', authenticateEmployee, authorizeRoles('CASHIER', 'MANAGER', 'ADMIN'), customerController.addLoyaltyPoints);

/**
 * @swagger
 * /api/customers/{cpf}/loyalty/redeem:
 *   post:
 *     summary: Redeem loyalty points (US-029)
 *     description: Redeem points from customer's loyalty account
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
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
 *               - points
 *               - reason
 *             properties:
 *               points:
 *                 type: integer
 *                 minimum: 1
 *                 example: 50
 *               reason:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Discount redemption"
 *     responses:
 *       200:
 *         description: Points redeemed successfully
 *       400:
 *         description: Insufficient points
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:cpf/loyalty/redeem', authenticateEmployee, authorizeRoles('CASHIER', 'MANAGER', 'ADMIN'), customerController.redeemLoyaltyPoints);

/**
 * @swagger
 * /api/customers/reports/retention:
 *   get:
 *     summary: Get customer retention report (US-031)
 *     description: Get analytics on customer retention and loyalty program participation
 *     tags: [Customers]
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
 *         description: Retention report retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/reports/retention', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), customerController.getCustomerRetentionReport);

module.exports = router;
