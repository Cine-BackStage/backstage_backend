const express = require('express');
const router = express.Router();

const sessionRoutes = require('./sessions');
const ticketRoutes = require('./tickets');
const saleRoutes = require('./sales');
const movieRoutes = require('./movies');

// Mount route modules
router.use('/sessions', sessionRoutes);
router.use('/tickets', ticketRoutes);
router.use('/sales', saleRoutes);
router.use('/movies', movieRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Cinema Management API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cinema Management System API',
    version: '1.0.0',
    endpoints: {
      movies: '/api/movies',
      sessions: '/api/sessions',
      tickets: '/api/tickets', 
      sales: '/api/sales',
      health: '/api/health'
    },
    documentation: {
      movies: {
        'GET /movies': 'Get all movies',
        'GET /movies/:id': 'Get movie by ID',
        'GET /movies/search': 'Search movies by title',
        'GET /movies/:id/stats': 'Get movie statistics',
        'POST /movies': 'Create new movie',
        'PUT /movies/:id': 'Update movie',
        'DELETE /movies/:id': 'Delete/deactivate movie',
        'PATCH /movies/:id/activate': 'Activate movie'
      },
      sessions: {
        'GET /sessions': 'Get all sessions',
        'GET /sessions/:id': 'Get session by ID',
        'GET /sessions/:id/seats': 'Get session seat availability',
        'POST /sessions': 'Create new session',
        'PUT /sessions/:id': 'Update session',
        'DELETE /sessions/:id': 'Delete session'
      },
      tickets: {
        'GET /tickets': 'Get all tickets',
        'GET /tickets/:id': 'Get ticket by ID',
        'GET /tickets/session/:sessionId': 'Get tickets by session',
        'POST /tickets': 'Create single ticket',
        'POST /tickets/bulk': 'Create multiple tickets',
        'DELETE /tickets/:id': 'Delete ticket'
      },
      sales: {
        'GET /sales': 'Get all sales',
        'GET /sales/:id': 'Get sale by ID',
        'POST /sales': 'Create new sale',
        'POST /sales/:saleId/items': 'Add item to sale',
        'DELETE /sales/:saleId/items/:itemId': 'Remove item from sale',
        'POST /sales/:saleId/discount': 'Apply discount to sale',
        'POST /sales/:saleId/finalize': 'Finalize sale with payment',
        'POST /sales/:saleId/cancel': 'Cancel sale'
      }
    }
  });
});

module.exports = router;