const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticateEmployee, authorizeRoles } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * tags:
 *   - name: Sessions
 *     description: Movie session/screening management endpoints
 */

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Get all sessions with advanced filtering
 *     description: Retrieve all sessions for the authenticated employee's company with optional filtering and pagination
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, CANCELED, COMPLETED]
 *         description: Filter by session status
 *       - in: query
 *         name: movieId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by movie ID
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by room ID
 *       - in: query
 *         name: roomType
 *         schema:
 *           type: string
 *           enum: [TWO_D, THREE_D, IMAX, EXTREME, VIP]
 *         description: Filter by room type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter sessions starting from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter sessions up to this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of sessions with availability information
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticateEmployee, sessionController.getAllSessions);

/**
 * @swagger
 * /api/sessions/{id}:
 *   get:
 *     summary: Get session by ID
 *     description: Retrieve detailed information about a specific session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session details retrieved successfully
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticateEmployee, sessionController.getSessionById);

/**
 * @swagger
 * /api/sessions/{id}/seats:
 *   get:
 *     summary: Get session seat availability
 *     description: Retrieve seat map with real-time availability for a specific session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Seat availability retrieved successfully
 *       404:
 *         description: Session or seat map not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id/seats', authenticateEmployee, sessionController.getSessionSeats);

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Create new session
 *     description: Create a new movie session with conflict detection, buffer time, and automatic pricing
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *               - roomId
 *               - startTime
 *             properties:
 *               movieId:
 *                 type: string
 *                 format: uuid
 *                 description: Movie ID
 *               roomId:
 *                 type: string
 *                 format: uuid
 *                 description: Room ID
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Session start time (must be in the future)
 *               bufferMinutes:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 60
 *                 default: 15
 *                 description: Buffer time after movie ends for cleaning (in minutes)
 *             example:
 *               movieId: "550e8400-e29b-41d4-a716-446655440000"
 *               roomId: "660e8400-e29b-41d4-a716-446655440001"
 *               startTime: "2025-12-31T19:00:00Z"
 *               bufferMinutes: 15
 *     responses:
 *       201:
 *         description: Session created successfully with automatic end time and pricing
 *       400:
 *         description: Validation error
 *       404:
 *         description: Movie or room not found
 *       409:
 *         description: Session conflicts with existing sessions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), sessionController.createSession);

/**
 * @swagger
 * /api/sessions/{id}:
 *   put:
 *     summary: Update session
 *     description: Update session details (only allowed for scheduled sessions with no tickets sold)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               movieId:
 *                 type: string
 *                 format: uuid
 *               roomId:
 *                 type: string
 *                 format: uuid
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               bufferMinutes:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 60
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session, movie, or room not found
 *       409:
 *         description: Cannot modify session (tickets sold, conflicts, or session not scheduled)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), sessionController.updateSession);

/**
 * @swagger
 * /api/sessions/{id}/status:
 *   patch:
 *     summary: Update session status
 *     description: Change session status (SCHEDULED -> IN_PROGRESS -> COMPLETED, or CANCELED)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, IN_PROGRESS, CANCELED, COMPLETED]
 *                 description: New session status
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional reason for status change
 *             example:
 *               status: "IN_PROGRESS"
 *               reason: "Session started on time"
 *     responses:
 *       200:
 *         description: Session status updated successfully (logged in audit trail)
 *       400:
 *         description: Validation error
 *       404:
 *         description: Session not found
 *       409:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', authenticateEmployee, sessionController.updateSessionStatus);

/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     summary: Delete session
 *     description: Delete a session (only allowed if no tickets are sold)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session deleted successfully
 *       404:
 *         description: Session not found
 *       409:
 *         description: Cannot delete session with sold tickets
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), sessionController.deleteSession);

module.exports = router;