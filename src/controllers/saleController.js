const { db } = require('../database/prisma');
const { validateSale, validateSaleItem, validatePayment } = require('../utils/validation');

class SaleController {
  async getAllSales(req, res) {
    try {
      const companyId = req.employee.companyId;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const sales = await db.sale.findMany({
        where: { companyId },
        include: {
          saleItems: {
            where: { companyId }
          },
          payments: {
            where: { companyId }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });
      res.json({
        success: true,
        data: sales,
        count: sales.length,
        pagination: {
          limit,
          offset,
          hasMore: sales.length === limit
        }
      });
    } catch (error) {
      console.error('Error fetching sales:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sales',
        error: error.message
      });
    }
  }

  async getSaleById(req, res) {
    try {
      const { id } = req.params;
      const sale = await SalePrisma.findById(id);
      
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      // Get sale items and payments
      const [items, payments] = await Promise.all([
        SalePrisma.getSaleItems(id),
        SalePrisma.getSalePayments(id)
      ]);

      res.json({
        success: true,
        data: {
          ...sale,
          items,
          payments
        }
      });
    } catch (error) {
      console.error('Error fetching sale:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sale',
        error: error.message
      });
    }
  }

  async createSale(req, res) {
    try {
      const { error, value } = validateSale(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const sale = await SalePrisma.create(value);
      res.status(201).json({
        success: true,
        data: sale,
        message: 'Sale created successfully'
      });
    } catch (error) {
      console.error('Error creating sale:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating sale',
        error: error.message
      });
    }
  }

  async addItemToSale(req, res) {
    try {
      const { saleId } = req.params;
      const { error, value } = validateSaleItem(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const item = await SalePrisma.addItem(saleId, value);
      res.status(201).json({
        success: true,
        data: item,
        message: 'Item added to sale successfully'
      });
    } catch (error) {
      console.error('Error adding item to sale:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding item to sale',
        error: error.message
      });
    }
  }

  async removeItemFromSale(req, res) {
    try {
      const { saleId, itemId } = req.params;
      const item = await SalePrisma.removeItem(saleId, itemId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Sale item not found'
        });
      }

      res.json({
        success: true,
        message: 'Item removed from sale successfully'
      });
    } catch (error) {
      console.error('Error removing item from sale:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing item from sale',
        error: error.message
      });
    }
  }

  async applyDiscount(req, res) {
    try {
      const { saleId } = req.params;
      const { discount_code } = req.body;
      
      if (!discount_code) {
        return res.status(400).json({
          success: false,
          message: 'Discount code is required'
        });
      }

      const result = await SalePrisma.applyDiscount(saleId, discount_code);
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('not found') || 
          error.message.includes('expired') || 
          error.message.includes('already applied') ||
          error.message.includes('Buyer information required')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error applying discount',
        error: error.message
      });
    }
  }

  async finalizeSale(req, res) {
    try {
      const { saleId } = req.params;
      const { error, value } = validatePayment(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const sale = await SalePrisma.finalize(saleId, value.payments);
      res.json({
        success: true,
        data: sale,
        message: 'Sale finalized successfully'
      });
    } catch (error) {
      console.error('Error finalizing sale:', error);
      
      // Handle specific business logic errors
      if (error.message.includes('Insufficient payment') || 
          error.message === 'Sale not found') {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error finalizing sale',
        error: error.message
      });
    }
  }

  async cancelSale(req, res) {
    try {
      const { saleId } = req.params;
      const { reason } = req.body;
      
      const sale = await SalePrisma.cancel(saleId, reason);
      
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found or cannot be canceled'
        });
      }

      res.json({
        success: true,
        data: sale,
        message: 'Sale canceled successfully'
      });
    } catch (error) {
      console.error('Error canceling sale:', error);
      res.status(500).json({
        success: false,
        message: 'Error canceling sale',
        error: error.message
      });
    }
  }
}

module.exports = new SaleController();