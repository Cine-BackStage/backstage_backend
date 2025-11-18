const express = require('express');
const router = express.Router();
const seatReservationController = require('../controllers/seatReservationController');
const { authenticateEmployee } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * tags:
 *   - name: Seat Reservations
 *     description: Temporary seat reservation management during checkout
 */

/**
 * @swagger
 * /api/seat-reservations/reserve:
 *   post:
 *     summary: Reserve seats temporarily for 15 minutes
 *     tags: [Seat Reservations]
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
 *               - seatIds
 *               - reservationToken
 *             properties:
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *               seatIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               reservationToken:
 *                 type: string
 *                 description: Client-generated token to identify reservation
 *     responses:
 *       201:
 *         description: Seats reserved successfully
 *       409:
 *         description: Seats already sold or reserved
 */
router.post('/reserve', authenticateEmployee, seatReservationController.reserveSeats);

/**
 * @swagger
 * /api/seat-reservations/release:
 *   post:
 *     summary: Release seat reservations for a specific token
 *     tags: [Seat Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reservationToken
 *             properties:
 *               reservationToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservations released successfully
 */
router.post('/release', authenticateEmployee, seatReservationController.releaseReservations);

/**
 * @swagger
 * /api/seat-reservations/cleanup:
 *   post:
 *     summary: Clean up expired reservations
 *     tags: [Seat Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post('/cleanup', authenticateEmployee, seatReservationController.cleanupExpiredReservations);

module.exports = router;
