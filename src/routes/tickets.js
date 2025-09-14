const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// GET /api/tickets - Get all tickets
router.get('/', ticketController.getAllTickets);

// GET /api/tickets/:id - Get ticket by ID
router.get('/:id', ticketController.getTicketById);

// GET /api/tickets/session/:sessionId - Get tickets by session
router.get('/session/:sessionId', ticketController.getTicketsBySession);

// POST /api/tickets - Create single ticket
router.post('/', ticketController.createTicket);

// POST /api/tickets/bulk - Create multiple tickets
router.post('/bulk', ticketController.createBulkTickets);

// DELETE /api/tickets/:id - Delete ticket
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;