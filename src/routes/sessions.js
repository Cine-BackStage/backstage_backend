const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticateEmployee } = require('../middleware/auth-multitenant');

// GET /api/sessions - Get all sessions
router.get('/', authenticateEmployee, sessionController.getAllSessions);

// GET /api/sessions/:id - Get session by ID
router.get('/:id', authenticateEmployee, sessionController.getSessionById);

// GET /api/sessions/:id/seats - Get session seat availability
router.get('/:id/seats', authenticateEmployee, sessionController.getSessionSeats);

// POST /api/sessions - Create new session
router.post('/', authenticateEmployee, sessionController.createSession);

// PUT /api/sessions/:id - Update session
router.put('/:id', authenticateEmployee, sessionController.updateSession);

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', authenticateEmployee, sessionController.deleteSession);

module.exports = router;