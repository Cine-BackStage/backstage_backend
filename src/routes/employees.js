const express = require('express');
const router = express.Router();
const EmployeeController = require('../controllers/employeeController');
const {
  authenticateEmployee,
  authorizeRoles,
  authorizePermissions,
  auditLogger
} = require('../middleware/auth-multitenant');

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         cpf:
 *           type: string
 *           example: "12345678901"
 *         employeeId:
 *           type: string
 *           example: "EMP001"
 *         role:
 *           type: string
 *           enum: [CASHIER, MANAGER, ADMIN, MAINTENANCE, SECURITY]
 *         fullName:
 *           type: string
 *           example: "João Silva"
 *         email:
 *           type: string
 *           example: "joao@cinema.com"
 *         phone:
 *           type: string
 *           example: "11999999999"
 *         hireDate:
 *           type: string
 *           format: date
 *         isActive:
 *           type: boolean
 *         lastLogin:
 *           type: string
 *           format: date-time
 *         permissions:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     TimeEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         employeeCpf:
 *           type: string
 *         employeeName:
 *           type: string
 *         entryType:
 *           type: string
 *           enum: [CLOCK_IN, CLOCK_OUT, BREAK_START, BREAK_END]
 *         timestamp:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 *         location:
 *           type: string
 *
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         actorCpf:
 *           type: string
 *         actorName:
 *           type: string
 *         action:
 *           type: string
 *         targetType:
 *           type: string
 *         targetId:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         ipAddress:
 *           type: string
 *         metadata:
 *           type: object
 *
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/employees/login:
 *   post:
 *     summary: Employee authentication
 *     description: Authenticate employee with employeeId and password
 *     tags: [Employee Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - password
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: "EMP001"
 *               password:
 *                 type: string
 *                 example: "password123"
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     employee:
 *                       $ref: '#/components/schemas/Employee'
 *       401:
 *         description: Authentication failed
 */
router.post('/login', auditLogger('EMPLOYEE_LOGIN', 'EMPLOYEE'), EmployeeController.login);

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create new employee account (US-022)
 *     description: Create a new employee account with role-based access
 *     tags: [Employee Management]
 *     security:
 *       - BearerAuth: []
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
 *               - employeeId
 *               - role
 *             properties:
 *               cpf:
 *                 type: string
 *                 example: "12345678901"
 *               fullName:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 example: "joao@cinema.com"
 *               phone:
 *                 type: string
 *                 example: "11999999999"
 *               employeeId:
 *                 type: string
 *                 example: "EMP001"
 *               role:
 *                 type: string
 *                 enum: [CASHIER, MANAGER, ADMIN, MAINTENANCE, SECURITY]
 *               password:
 *                 type: string
 *                 example: "password123"
 *               permissions:
 *                 type: object
 *                 example: {"sales": true, "inventory": false}
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Validation error or duplicate data
 */
router.post('/',
  authenticateEmployee,
  authorizeRoles('ADMIN', 'MANAGER'),
  auditLogger('CREATE_EMPLOYEE', 'EMPLOYEE'),
  EmployeeController.createEmployee
);

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees with filters
 *     description: Retrieve all employees with optional filtering and pagination
 *     tags: [Employee Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [CASHIER, MANAGER, ADMIN, MAINTENANCE, SECURITY]
 *         description: Filter by role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or employee ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
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
 *                     $ref: '#/components/schemas/Employee'
 *                 pagination:
 *                   type: object
 */
router.get('/',
  authenticateEmployee,
  authorizeRoles('ADMIN', 'MANAGER'),
  auditLogger('VIEW_EMPLOYEES', 'EMPLOYEE'),
  EmployeeController.getAllEmployees
);

/**
 * @swagger
 * /api/employees/me:
 *   get:
 *     summary: Get current employee profile
 *     description: Get the authenticated employee's profile information
 *     tags: [Employee Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current employee profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 */
router.get('/me',
  authenticateEmployee,
  auditLogger('VIEW_OWN_PROFILE', 'EMPLOYEE'),
  EmployeeController.getCurrentEmployee
);

/**
 * @swagger
 * /api/employees/clock-in:
 *   post:
 *     summary: Clock in (US-023)
 *     description: Record employee clock-in time
 *     tags: [Time Tracking]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "Starting morning shift"
 *               location:
 *                 type: string
 *                 example: "Main entrance"
 *     responses:
 *       201:
 *         description: Clocked in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TimeEntry'
 */
router.post('/clock-in',
  authenticateEmployee,
  auditLogger('CLOCK_IN', 'TIME_ENTRY'),
  EmployeeController.clockIn
);

/**
 * @swagger
 * /api/employees/clock-out:
 *   post:
 *     summary: Clock out (US-023)
 *     description: Record employee clock-out time
 *     tags: [Time Tracking]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "End of shift"
 *               location:
 *                 type: string
 *                 example: "Main entrance"
 *     responses:
 *       201:
 *         description: Clocked out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TimeEntry'
 */
router.post('/clock-out',
  authenticateEmployee,
  auditLogger('CLOCK_OUT', 'TIME_ENTRY'),
  EmployeeController.clockOut
);

/**
 * @swagger
 * /api/employees/time-entries:
 *   get:
 *     summary: Get time entries (US-024)
 *     description: View employee time tracking records
 *     tags: [Time Tracking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeCpf
 *         schema:
 *           type: string
 *         description: Filter by employee CPF (managers/admins only)
 *       - in: query
 *         name: entryType
 *         schema:
 *           type: string
 *           enum: [CLOCK_IN, CLOCK_OUT, BREAK_START, BREAK_END]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 100
 *     responses:
 *       200:
 *         description: Time entries retrieved successfully
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
 *                     $ref: '#/components/schemas/TimeEntry'
 *                 pagination:
 *                   type: object
 */
router.get('/time-entries',
  authenticateEmployee,
  authorizeRoles('ADMIN', 'MANAGER'),
  auditLogger('VIEW_TIME_ENTRIES', 'TIME_ENTRY'),
  EmployeeController.getTimeEntries
);

/**
 * @swagger
 * /api/employees/activity-logs:
 *   get:
 *     summary: Get activity logs (US-024)
 *     description: View employee activity and performance metrics
 *     tags: [Employee Activity]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: actorCpf
 *         schema:
 *           type: string
 *         description: Filter by employee CPF
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *         description: Filter by target type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
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
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   type: object
 */
router.get('/activity-logs',
  authenticateEmployee,
  authorizeRoles('ADMIN', 'MANAGER'),
  auditLogger('VIEW_ACTIVITY_LOGS', 'AUDIT_LOG'),
  EmployeeController.getActivityLogs
);

/**
 * @swagger
 * /api/employees/{cpf}:
 *   get:
 *     summary: Get employee by CPF
 *     description: Get detailed employee information by CPF
 *     tags: [Employee Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *         example: "12345678901"
 *     responses:
 *       200:
 *         description: Employee found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 */
router.get('/:cpf',
  authenticateEmployee,
  authorizeRoles('ADMIN', 'MANAGER'),
  auditLogger('VIEW_EMPLOYEE', 'EMPLOYEE'),
  EmployeeController.getEmployeeByCpf
);

/**
 * @swagger
 * /api/employees/{cpf}:
 *   put:
 *     summary: Update employee
 *     description: Update employee information and permissions (US-025)
 *     tags: [Employee Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *         example: "12345678901"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [CASHIER, MANAGER, ADMIN, MAINTENANCE, SECURITY]
 *               isActive:
 *                 type: boolean
 *               password:
 *                 type: string
 *               permissions:
 *                 type: object
 *                 example: {"sales": true, "inventory": true, "reports": false}
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 */
router.put('/:cpf',
  authenticateEmployee,
  authorizeRoles('ADMIN', 'MANAGER'),
  auditLogger('UPDATE_EMPLOYEE', 'EMPLOYEE'),
  EmployeeController.updateEmployee
);

/**
 * @swagger
 * /api/employees/{cpf}/metrics:
 *   get:
 *     summary: Get employee performance metrics
 *     description: Get detailed performance metrics for a specific employee
 *     tags: [Employee Activity]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cpf
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *         example: "12345678901"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Employee metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                     timeTracking:
 *                       type: object
 *                     activity:
 *                       type: object
 *                     sales:
 *                       type: object
 */
router.get('/:cpf/metrics',
  authenticateEmployee,
  authorizeRoles('ADMIN', 'MANAGER'),
  auditLogger('VIEW_EMPLOYEE_METRICS', 'EMPLOYEE'),
  EmployeeController.getEmployeeMetrics
);

module.exports = router;