const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateEmployee, authorizeRoles } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * tags:
 *   - name: Tickets
 *     description: Ticket sales and management endpoints (US-006 to US-010)
 */

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get all tickets with advanced filtering (US-006)
 *     description: Retrieve tickets with filtering by status, session, movie, customer, and date range
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ISSUED, USED, REFUNDED]
 *         description: Filter by ticket status
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by session ID
 *       - in: query
 *         name: movieId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by movie ID
 *       - in: query
 *         name: customerCpf
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *         description: Filter by customer CPF
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tickets issued from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tickets issued up to this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateEmployee, ticketController.getAllTickets);

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Get ticket by ID with full details (US-009)
 *     description: Retrieve detailed information about a specific ticket including session, movie, seat, and buyer details
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket details retrieved successfully
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticateEmployee, ticketController.getTicketById);

/**
 * @swagger
 * /api/tickets/session/{sessionId}:
 *   get:
 *     summary: Get all tickets for a session (US-006)
 *     description: Retrieve all tickets for a specific session with seat information and status summary
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session tickets retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/session/:sessionId', authenticateEmployee, ticketController.getTicketsBySession);

/**
 * @swagger
 * /api/tickets/reports/sales:
 *   get:
 *     summary: Get ticket sales reports (US-010)
 *     description: Generate comprehensive sales reports with grouping by movie, employee, or day
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Report start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Report end date
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, movie, session, employee]
 *           default: day
 *         description: Group results by this dimension
 *       - in: query
 *         name: movieId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific movie
 *       - in: query
 *         name: employeeCpf
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *         description: Filter by cashier/employee
 *     responses:
 *       200:
 *         description: Sales report generated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/reports/sales', authenticateEmployee, authorizeRoles('MANAGER', 'ADMIN'), ticketController.getSalesReports);

/**
 * @swagger
 * /api/tickets/history:
 *   get:
 *     summary: Get ticket purchase history (US-009)
 *     description: Search ticket history by customer, email, or ticket ID
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerCpf
 *         schema:
 *           type: string
 *           pattern: '^[0-9]{11}$'
 *         description: Search by customer CPF
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *         description: Search by customer email
 *       - in: query
 *         name: ticketId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Search by ticket ID
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by session
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
 *         description: Ticket history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authenticateEmployee, ticketController.getTicketHistory);

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Sell single ticket (US-006)
 *     description: Create a single ticket for a specific seat and session with validation
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - seatMapId
 *               - seatId
 *               - price
 *             properties:
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Session ID
 *               seatMapId:
 *                 type: string
 *                 format: uuid
 *                 description: Seat map ID
 *               seatId:
 *                 type: string
 *                 maxLength: 10
 *                 description: Seat ID (e.g., "A1", "B5")
 *               saleId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional sale ID if part of a transaction
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Ticket price
 *               buyerCpf:
 *                 type: string
 *                 pattern: '^[0-9]{11}$'
 *                 description: Optional buyer CPF
 *             example:
 *               sessionId: "550e8400-e29b-41d4-a716-446655440000"
 *               seatMapId: "660e8400-e29b-41d4-a716-446655440001"
 *               seatId: "A5"
 *               price: 25.00
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *       400:
 *         description: Validation error or seat not available
 *       404:
 *         description: Session or seat not found
 *       409:
 *         description: Seat already taken
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateEmployee, ticketController.createTicket);

/**
 * @swagger
 * /api/tickets/bulk:
 *   post:
 *     summary: Sell multiple tickets for groups (US-007)
 *     description: Create multiple tickets at once for group sales with seat validation
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - seatMapId
 *               - seats
 *             properties:
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Session ID
 *               seatMapId:
 *                 type: string
 *                 format: uuid
 *                 description: Seat map ID
 *               seats:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   required:
 *                     - seatId
 *                     - price
 *                   properties:
 *                     seatId:
 *                       type: string
 *                       maxLength: 10
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                 description: Array of seats with individual pricing
 *               saleId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional sale ID
 *             example:
 *               sessionId: "550e8400-e29b-41d4-a716-446655440000"
 *               seatMapId: "660e8400-e29b-41d4-a716-446655440001"
 *               seats:
 *                 - seatId: "A5"
 *                   price: 25.00
 *                 - seatId: "A6"
 *                   price: 25.00
 *                 - seatId: "A7"
 *                   price: 20.00
 *     responses:
 *       201:
 *         description: Tickets created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 *       409:
 *         description: Some seats already taken
 *       401:
 *         description: Unauthorized
 */
router.post('/bulk', authenticateEmployee, ticketController.createBulkTickets);

/**
 * @swagger
 * /api/tickets/{id}/refund:
 *   patch:
 *     summary: Process ticket refund (US-008)
 *     description: Refund a ticket if session hasn't started and ticket hasn't been used
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket ID
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
 *                 maxLength: 500
 *                 description: Reason for refund
 *             example:
 *               reason: "Customer requested cancellation"
 *     responses:
 *       200:
 *         description: Ticket refunded successfully
 *       400:
 *         description: Cannot refund (already used, already refunded, or session started)
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/refund', authenticateEmployee, authorizeRoles('CASHIER', 'MANAGER', 'ADMIN'), ticketController.refundTicket);

/**
 * @swagger
 * /api/tickets/{id}/use:
 *   patch:
 *     summary: Mark ticket as used (scan QR code)
 *     description: Mark a ticket as used when customer enters the cinema
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket marked as used successfully
 *       400:
 *         description: Ticket already used or refunded
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/use', authenticateEmployee, ticketController.markTicketAsUsed);

module.exports = router;
