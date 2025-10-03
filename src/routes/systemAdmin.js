const express = require('express');
const router = express.Router();
const systemAdminController = require('../controllers/systemAdminController');
const { authenticateSystemAdmin } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemAdminLogin:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           example: sysadmin
 *         password:
 *           type: string
 *           example: sysadmin123
 *     Company:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         cnpj:
 *           type: string
 *         tradeName:
 *           type: string
 *         address:
 *           type: object
 *         isActive:
 *           type: boolean
 *         subscription:
 *           type: object
 *     PlatformStats:
 *       type: object
 *       properties:
 *         totalCompanies:
 *           type: integer
 *         activeCompanies:
 *           type: integer
 *         totalEmployees:
 *           type: integer
 *         totalCustomers:
 *           type: integer
 *         totalRevenue:
 *           type: number
 */

/**
 * @swagger
 * /api/system-admin/login:
 *   post:
 *     summary: System Administrator Login
 *     tags: [System Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SystemAdminLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 admin:
 *                   type: object
 *       401:
 *         description: Authentication failed
 */
router.post('/login', systemAdminController.login);

/**
 * @swagger
 * /api/system-admin/companies:
 *   get:
 *     summary: Get all companies (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     responses:
 *       200:
 *         description: List of all companies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Company'
 */
router.get('/companies', authenticateSystemAdmin, systemAdminController.getAllCompanies);

/**
 * @swagger
 * /api/system-admin/companies/{companyId}:
 *   get:
 *     summary: Get company details by ID (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company UUID
 *     responses:
 *       200:
 *         description: Company details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 */
router.get('/companies/:companyId', authenticateSystemAdmin, systemAdminController.getCompanyById);

/**
 * @swagger
 * /api/system-admin/companies:
 *   post:
 *     summary: Create new company (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - cnpj
 *               - tradeName
 *               - email
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               cnpj:
 *                 type: string
 *               tradeName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *               subscriptionPlan:
 *                 type: string
 *                 enum: [BASIC, PROFESSIONAL, ENTERPRISE]
 *     responses:
 *       201:
 *         description: Company created successfully
 */
router.post('/companies', authenticateSystemAdmin, systemAdminController.createCompany);

/**
 * @swagger
 * /api/system-admin/companies/{companyId}:
 *   put:
 *     summary: Update company (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
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
 *             properties:
 *               name:
 *                 type: string
 *               tradeName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company updated successfully
 */
router.put('/companies/:companyId', authenticateSystemAdmin, systemAdminController.updateCompany);

/**
 * @swagger
 * /api/system-admin/companies/{companyId}:
 *   delete:
 *     summary: Deactivate company (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Company deactivated successfully
 */
router.delete('/companies/:companyId', authenticateSystemAdmin, systemAdminController.deleteCompany);

/**
 * @swagger
 * /api/system-admin/stats:
 *   get:
 *     summary: Get platform statistics (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PlatformStats'
 */
router.get('/stats', authenticateSystemAdmin, systemAdminController.getPlatformStats);

/**
 * @swagger
 * /api/system-admin/companies/{companyId}/employees:
 *   get:
 *     summary: Get all employees for a company (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of company employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/companies/:companyId/employees', authenticateSystemAdmin, systemAdminController.getCompanyEmployees);

/**
 * @swagger
 * /api/system-admin/companies/{companyId}/customers:
 *   get:
 *     summary: Get all customers for a company (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of company customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/companies/:companyId/customers', authenticateSystemAdmin, systemAdminController.getCompanyCustomers);

/**
 * @swagger
 * /api/system-admin/audit-logs:
 *   get:
 *     summary: Get audit logs across all companies (System Admin only)
 *     tags: [System Admin]
 *     security:
 *       - SystemAdminAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific company (optional)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: Audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/audit-logs', authenticateSystemAdmin, systemAdminController.getAuditLogs);

module.exports = router;