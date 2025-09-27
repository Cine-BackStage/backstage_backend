const express = require('express');
const router = express.Router();

const sessionRoutes = require('./sessions');
const ticketRoutes = require('./tickets');
const saleRoutes = require('./sales');
const movieRoutes = require('./movies');
const employeeRoutes = require('./employees');
const systemAdminRoutes = require('./systemAdmin');

// Mount route modules
router.use('/sessions', sessionRoutes);
router.use('/tickets', ticketRoutes);
router.use('/sales', saleRoutes);
router.use('/movies', movieRoutes);
router.use('/employees', employeeRoutes);
router.use('/system-admin', systemAdminRoutes);

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
      employees: '/api/employees',
      'system-admin': '/api/system-admin',
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
      },
      employees: {
        'POST /employees/login': 'Employee authentication',
        'GET /employees': 'Get all employees',
        'POST /employees': 'Create new employee account',
        'GET /employees/me': 'Get current employee profile',
        'GET /employees/:cpf': 'Get employee by CPF',
        'PUT /employees/:cpf': 'Update employee',
        'POST /employees/clock-in': 'Clock in',
        'POST /employees/clock-out': 'Clock out',
        'GET /employees/time-entries': 'Get time entries',
        'GET /employees/activity-logs': 'Get activity logs',
        'GET /employees/:cpf/metrics': 'Get employee metrics'
      },
      'system-admin': {
        'POST /system-admin/login': 'System admin authentication',
        'GET /system-admin/companies': 'Get all companies (cross-tenant)',
        'GET /system-admin/companies/:id': 'Get company details',
        'POST /system-admin/companies': 'Create new company',
        'PUT /system-admin/companies/:id': 'Update company',
        'DELETE /system-admin/companies/:id': 'Deactivate company',
        'GET /system-admin/stats': 'Get platform statistics',
        'GET /system-admin/companies/:id/employees': 'Get company employees',
        'GET /system-admin/companies/:id/customers': 'Get company customers',
        'GET /system-admin/audit-logs': 'Get cross-tenant audit logs'
      }
    }
  });
});

module.exports = router;