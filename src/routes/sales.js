const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticateEmployee } = require('../middleware/auth-multitenant');

// GET /api/sales - Get all sales
router.get('/', authenticateEmployee, saleController.getAllSales);

// GET /api/sales/:id - Get sale by ID
router.get('/:id', authenticateEmployee, saleController.getSaleById);

// POST /api/sales - Create new sale
router.post('/', authenticateEmployee, saleController.createSale);

// POST /api/sales/:saleId/items - Add item to sale
router.post('/:saleId/items', authenticateEmployee, saleController.addItemToSale);

// DELETE /api/sales/:saleId/items/:itemId - Remove item from sale
router.delete('/:saleId/items/:itemId', authenticateEmployee, saleController.removeItemFromSale);

// POST /api/sales/:saleId/discount - Apply discount to sale
router.post('/:saleId/discount', authenticateEmployee, saleController.applyDiscount);

// POST /api/sales/:saleId/finalize - Finalize sale with payment
router.post('/:saleId/finalize', authenticateEmployee, saleController.finalizeSale);

// POST /api/sales/:saleId/cancel - Cancel sale
router.post('/:saleId/cancel', authenticateEmployee, saleController.cancelSale);

module.exports = router;