const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// GET /api/sessions - Get all sessions
router.get('/', sessionController.getAllSessions);

// GET /api/sessions/:id - Get session by ID
router.get('/:id', sessionController.getSessionById);

// GET /api/sessions/:id/seats - Get session seat availability
router.get('/:id/seats', sessionController.getSessionSeats);

// POST /api/sessions - Create new session
router.post('/', sessionController.createSession);

// PUT /api/sessions/:id - Update session
router.put('/:id', sessionController.updateSession);

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', sessionController.deleteSession);

module.exports = router;