const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticateEmployee } = require('../middleware/auth-multitenant');

// GET /api/tickets - Get all tickets
router.get('/', authenticateEmployee, ticketController.getAllTickets);

// GET /api/tickets/:id - Get ticket by ID
router.get('/:id', authenticateEmployee, ticketController.getTicketById);

// GET /api/tickets/session/:sessionId - Get tickets by session
router.get('/session/:sessionId', authenticateEmployee, ticketController.getTicketsBySession);

// POST /api/tickets - Create single ticket
router.post('/', authenticateEmployee, ticketController.createTicket);

// POST /api/tickets/bulk - Create multiple tickets
router.post('/bulk', authenticateEmployee, ticketController.createBulkTickets);

// DELETE /api/tickets/:id - Delete ticket
router.delete('/:id', authenticateEmployee, ticketController.deleteTicket);

module.exports = router;