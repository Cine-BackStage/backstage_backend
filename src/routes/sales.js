const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

// GET /api/sales - Get all sales
router.get('/', saleController.getAllSales);

// GET /api/sales/:id - Get sale by ID
router.get('/:id', saleController.getSaleById);

// POST /api/sales - Create new sale
router.post('/', saleController.createSale);

// POST /api/sales/:saleId/items - Add item to sale
router.post('/:saleId/items', saleController.addItemToSale);

// DELETE /api/sales/:saleId/items/:itemId - Remove item from sale
router.delete('/:saleId/items/:itemId', saleController.removeItemFromSale);

// POST /api/sales/:saleId/discount - Apply discount to sale
router.post('/:saleId/discount', saleController.applyDiscount);

// POST /api/sales/:saleId/finalize - Finalize sale with payment
router.post('/:saleId/finalize', saleController.finalizeSale);

// POST /api/sales/:saleId/cancel - Cancel sale
router.post('/:saleId/cancel', saleController.cancelSale);

module.exports = router;