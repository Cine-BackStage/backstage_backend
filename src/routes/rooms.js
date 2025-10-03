const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateEmployee, authorizeRoles } = require('../middleware/auth-multitenant');

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       required:
 *         - name
 *         - capacity
 *         - roomType
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated unique identifier
 *         companyId:
 *           type: string
 *           format: uuid
 *           description: Company identifier
 *         name:
 *           type: string
 *           maxLength: 80
 *           description: Room name
 *         capacity:
 *           type: integer
 *           minimum: 1
 *           description: Room capacity (number of seats)
 *         roomType:
 *           type: string
 *           enum: [TWO_D, THREE_D, IMAX, EXTREME, VIP]
 *           description: Type of room/screen
 *         seatMapId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Associated seat map ID
 *         isActive:
 *           type: boolean
 *           description: Whether the room is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         name: "Theater 1"
 *         capacity: 150
 *         roomType: "TWO_D"
 *         seatMapId: "660e8400-e29b-41d4-a716-446655440000"
 *         isActive: true
 *
 *     SeatMap:
 *       type: object
 *       required:
 *         - name
 *         - rows
 *         - cols
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Auto-generated unique identifier
 *         companyId:
 *           type: string
 *           format: uuid
 *           description: Company identifier
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Seat map name
 *         rows:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           description: Number of rows
 *         cols:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           description: Number of columns
 *         version:
 *           type: integer
 *           description: Version number for tracking changes
 *         layout:
 *           type: object
 *           description: Flexible JSON configuration for seat layout
 *       example:
 *         id: "660e8400-e29b-41d4-a716-446655440000"
 *         name: "Standard 150-seat layout"
 *         rows: 10
 *         cols: 15
 *         version: 1
 *
 *     Seat:
 *       type: object
 *       required:
 *         - id
 *         - rowLabel
 *         - number
 *       properties:
 *         id:
 *           type: string
 *           maxLength: 10
 *           description: Seat identifier (e.g., "A1", "B12")
 *         seatMapId:
 *           type: string
 *           format: uuid
 *           description: Associated seat map ID
 *         rowLabel:
 *           type: string
 *           maxLength: 5
 *           description: Row label (e.g., "A", "B", "C")
 *         number:
 *           type: integer
 *           minimum: 1
 *           description: Seat number within row
 *         isAccessible:
 *           type: boolean
 *           description: Whether seat is accessible/wheelchair friendly
 *         isActive:
 *           type: boolean
 *           description: Whether seat is active/available
 *       example:
 *         id: "A1"
 *         rowLabel: "A"
 *         number: 1
 *         isAccessible: false
 *         isActive: true
 *
 *     RoomTypePrice:
 *       type: object
 *       required:
 *         - roomType
 *         - price
 *       properties:
 *         companyId:
 *           type: string
 *           format: uuid
 *           description: Company identifier
 *         roomType:
 *           type: string
 *           enum: [TWO_D, THREE_D, IMAX, EXTREME, VIP]
 *           description: Room type
 *         price:
 *           type: number
 *           format: decimal
 *           description: Base ticket price for this room type
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         roomType: "TWO_D"
 *         price: 25.00
 */

/**
 * @swagger
 * tags:
 *   - name: Rooms
 *     description: Room management endpoints
 *   - name: Seat Maps
 *     description: Seat map configuration endpoints
 *   - name: Room Pricing
 *     description: Room type pricing management
 */

// ===== ROOM ROUTES =====

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get all rooms
 *     description: Retrieve all rooms for the authenticated employee's company with optional filtering
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: roomType
 *         schema:
 *           type: string
 *           enum: [TWO_D, THREE_D, IMAX, EXTREME, VIP]
 *         description: Filter by room type
 *     responses:
 *       200:
 *         description: List of rooms retrieved successfully
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
 *                     $ref: '#/components/schemas/Room'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticateEmployee, roomController.getAllRooms);

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     description: Retrieve a specific room with its seat map and upcoming sessions
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticateEmployee, roomController.getRoomById);

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     description: Create a new room (requires MANAGER or ADMIN role)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - capacity
 *               - roomType
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 80
 *                 description: Room name (must be unique within company)
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Room capacity
 *               roomType:
 *                 type: string
 *                 enum: [TWO_D, THREE_D, IMAX, EXTREME, VIP]
 *                 description: Room type
 *               seatMapId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Seat map ID (optional)
 *             example:
 *               name: "Theater 1"
 *               capacity: 150
 *               roomType: "TWO_D"
 *               seatMapId: "660e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Seat map not found
 *       409:
 *         description: Room with this name already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       500:
 *         description: Server error
 */
router.post('/', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), roomController.createRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Update a room
 *     description: Update room details (requires MANAGER or ADMIN role)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 80
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *               roomType:
 *                 type: string
 *                 enum: [TWO_D, THREE_D, IMAX, EXTREME, VIP]
 *               seatMapId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *             example:
 *               name: "Theater 1 - Premium"
 *               capacity: 180
 *     responses:
 *       200:
 *         description: Room updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Room or seat map not found
 *       409:
 *         description: Room name already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), roomController.updateRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete or deactivate a room
 *     description: Soft delete (deactivate) or permanently delete a room (requires ADMIN role)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *         description: If true, permanently delete (only allowed if no sessions exist)
 *     responses:
 *       200:
 *         description: Room deleted or deactivated successfully
 *       404:
 *         description: Room not found
 *       409:
 *         description: Cannot delete room with existing sessions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticateEmployee, authorizeRoles(['ADMIN']), roomController.deleteRoom);

/**
 * @swagger
 * /api/rooms/{id}/activate:
 *   patch:
 *     summary: Activate a room
 *     description: Reactivate a deactivated room (requires MANAGER or ADMIN role)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room activated successfully
 *       404:
 *         description: Room not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.patch('/:id/activate', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), roomController.activateRoom);

// ===== SEAT MAP ROUTES =====

/**
 * @swagger
 * /api/rooms/seat-maps:
 *   get:
 *     summary: Get all seat maps
 *     description: Retrieve all seat maps for the authenticated employee's company
 *     tags: [Seat Maps]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of seat maps retrieved successfully
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
 *                     $ref: '#/components/schemas/SeatMap'
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/seat-maps/all', authenticateEmployee, roomController.getAllSeatMaps);

/**
 * @swagger
 * /api/rooms/seat-maps/{id}:
 *   get:
 *     summary: Get seat map by ID
 *     description: Retrieve a specific seat map with all its seats
 *     tags: [Seat Maps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Seat map ID
 *     responses:
 *       200:
 *         description: Seat map retrieved successfully
 *       404:
 *         description: Seat map not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/seat-maps/:id', authenticateEmployee, roomController.getSeatMapById);

/**
 * @swagger
 * /api/rooms/seat-maps:
 *   post:
 *     summary: Create a new seat map
 *     description: Create a new seat map configuration (requires MANAGER or ADMIN role)
 *     tags: [Seat Maps]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - rows
 *               - cols
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Seat map name
 *               rows:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 description: Number of rows
 *               cols:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 description: Number of columns
 *               layout:
 *                 type: object
 *                 description: Optional JSON layout configuration
 *             example:
 *               name: "Standard 150-seat layout"
 *               rows: 10
 *               cols: 15
 *     responses:
 *       201:
 *         description: Seat map created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/seat-maps', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), roomController.createSeatMap);

/**
 * @swagger
 * /api/rooms/seat-maps/{id}:
 *   put:
 *     summary: Update a seat map
 *     description: Update seat map configuration (requires MANAGER or ADMIN role). Version is automatically incremented.
 *     tags: [Seat Maps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Seat map ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               rows:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *               cols:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *               layout:
 *                 type: object
 *     responses:
 *       200:
 *         description: Seat map updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Seat map not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put('/seat-maps/:id', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), roomController.updateSeatMap);

/**
 * @swagger
 * /api/rooms/seat-maps/{id}:
 *   delete:
 *     summary: Delete a seat map
 *     description: Permanently delete a seat map (only allowed if not in use by any rooms)
 *     tags: [Seat Maps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Seat map ID
 *     responses:
 *       200:
 *         description: Seat map deleted successfully
 *       404:
 *         description: Seat map not found
 *       409:
 *         description: Cannot delete seat map in use
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.delete('/seat-maps/:id', authenticateEmployee, authorizeRoles(['ADMIN']), roomController.deleteSeatMap);

/**
 * @swagger
 * /api/rooms/seat-maps/{seatMapId}/seats:
 *   post:
 *     summary: Create seats for a seat map
 *     description: Bulk create seats for a seat map (requires MANAGER or ADMIN role)
 *     tags: [Seat Maps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: seatMapId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Seat map ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - seats
 *             properties:
 *               seats:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - rowLabel
 *                     - number
 *                   properties:
 *                     id:
 *                       type: string
 *                       maxLength: 10
 *                     rowLabel:
 *                       type: string
 *                       maxLength: 5
 *                     number:
 *                       type: integer
 *                       minimum: 1
 *                     isAccessible:
 *                       type: boolean
 *                       default: false
 *                     isActive:
 *                       type: boolean
 *                       default: true
 *             example:
 *               seats:
 *                 - id: "A1"
 *                   rowLabel: "A"
 *                   number: 1
 *                   isAccessible: false
 *                   isActive: true
 *                 - id: "A2"
 *                   rowLabel: "A"
 *                   number: 2
 *                   isAccessible: false
 *                   isActive: true
 *     responses:
 *       201:
 *         description: Seats created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Seat map not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/seat-maps/:seatMapId/seats', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), roomController.createSeats);

// ===== ROOM TYPE PRICING ROUTES =====

/**
 * @swagger
 * /api/rooms/pricing/room-types:
 *   get:
 *     summary: Get all room type prices
 *     description: Retrieve base pricing for all room types
 *     tags: [Room Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Room type prices retrieved successfully
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
 *                     $ref: '#/components/schemas/RoomTypePrice'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/pricing/room-types', authenticateEmployee, roomController.getRoomTypePrices);

/**
 * @swagger
 * /api/rooms/pricing/room-types:
 *   post:
 *     summary: Set room type price
 *     description: Create or update base price for a room type (requires MANAGER or ADMIN role)
 *     tags: [Room Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomType
 *               - price
 *             properties:
 *               roomType:
 *                 type: string
 *                 enum: [TWO_D, THREE_D, IMAX, EXTREME, VIP]
 *               price:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *             example:
 *               roomType: "TWO_D"
 *               price: 25.00
 *     responses:
 *       200:
 *         description: Room type price set successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/pricing/room-types', authenticateEmployee, authorizeRoles(['MANAGER', 'ADMIN']), roomController.setRoomTypePrice);

module.exports = router;
