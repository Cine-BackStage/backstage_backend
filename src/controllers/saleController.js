const Joi = require('joi');
const { db } = require('../database/prisma');

class SaleController {
  /**
   * US-011/US-014: Get all sales with filtering and pagination
   */
  async getAllSales(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        status: Joi.string().valid('OPEN', 'FINALIZED', 'CANCELED', 'REFUNDED').optional(),
        cashierCpf: Joi.string().length(11).optional(),
        buyerCpf: Joi.string().length(11).optional(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        minTotal: Joi.number().min(0).optional(),
        maxTotal: Joi.number().min(0).optional(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(50)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { status, cashierCpf, buyerCpf, startDate, endDate, minTotal, maxTotal, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...(status && { status }),
        ...(cashierCpf && { cashierCpf }),
        ...(buyerCpf && { buyerCpf }),
        ...((startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        }),
        ...((minTotal || maxTotal) && {
          grandTotal: {
            ...(minTotal && { gte: minTotal }),
            ...(maxTotal && { lte: maxTotal })
          }
        })
      };

      const [sales, totalCount] = await Promise.all([
        db.sale.findMany({
          where,
          include: {
            cashier: {
              include: {
                person: {
                  select: {
                    fullName: true,
                    email: true
                  }
                }
              }
            },
            buyer: {
              include: {
                person: {
                  select: {
                    fullName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            items: true,
            payments: true,
            discounts: {
              include: {
                discountCode: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        db.sale.count({ where })
      ]);

      res.json({
        success: true,
        data: sales,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
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

  /**
   * US-011: Get sale by ID with full details
   */
  async getSaleById(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { id } = req.params;

      const sale = await db.sale.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          cashier: {
            include: {
              person: true
            }
          },
          buyer: {
            include: {
              person: true
            }
          },
          items: {
            include: {
              item: true
            }
          },
          payments: true,
          discounts: {
            include: {
              discountCode: true
            }
          },
          tickets: {
            include: {
              session: {
                include: {
                  movie: true
                }
              },
              seat: true
            }
          }
        }
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      res.json({
        success: true,
        data: sale
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

  /**
   * US-011: Create new sale transaction
   */
  async createSale(req, res) {
    try {
      const companyId = req.employee.companyId;
      const cashierCpf = req.employee.cpf;

      const schema = Joi.object({
        buyerCpf: Joi.string().length(11).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Verify buyer exists if provided
      if (value.buyerCpf) {
        const buyer = await db.customer.findFirst({
          where: {
            cpf: value.buyerCpf,
            companyId
          }
        });

        if (!buyer) {
          return res.status(404).json({
            success: false,
            message: 'Customer not found'
          });
        }
      }

      const sale = await db.sale.create({
        data: {
          companyId,
          cashierCpf,
          buyerCpf: value.buyerCpf || null,
          subTotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 0,
          status: 'OPEN'
        },
        include: {
          cashier: {
            include: {
              person: true
            }
          },
          buyer: {
            include: {
              person: true
            }
          }
        }
      });

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

  /**
   * US-011: Add item to sale
   */
  async addItemToSale(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { saleId } = req.params;

      const schema = Joi.object({
        sku: Joi.string().max(50).optional(),
        sessionId: Joi.string().uuid().optional(),
        seatId: Joi.string().max(10).optional(),
        description: Joi.string().max(200).required(),
        quantity: Joi.number().integer().min(1).required(),
        unitPrice: Joi.number().min(0).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Verify sale exists and is open
      const sale = await db.sale.findFirst({
        where: {
          id: saleId,
          companyId,
          status: 'OPEN'
        }
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found or is not open'
        });
      }

      // If SKU provided, verify inventory item exists
      if (value.sku) {
        const item = await db.inventoryItem.findFirst({
          where: {
            sku: value.sku,
            companyId,
            isActive: true
          }
        });

        if (!item) {
          return res.status(404).json({
            success: false,
            message: 'Inventory item not found'
          });
        }

        // Check stock availability
        if (item.qtyOnHand < value.quantity) {
          return res.status(409).json({
            success: false,
            message: 'Estoque insuficiente',
            available: item.qtyOnHand,
            requested: value.quantity
          });
        }
      }

      const lineTotal = value.quantity * value.unitPrice;

      const saleItem = await db.saleItem.create({
        data: {
          saleId,
          companyId,
          sku: value.sku || null,
          sessionId: value.sessionId || null,
          seatId: value.seatId || null,
          description: value.description,
          quantity: value.quantity,
          unitPrice: value.unitPrice,
          lineTotal
        }
      });

      // Update sale totals
      const newSubTotal = parseFloat(sale.subTotal) + lineTotal;
      const newGrandTotal = newSubTotal - parseFloat(sale.discountTotal) + parseFloat(sale.taxTotal);

      await db.sale.update({
        where: { id: saleId },
        data: {
          subTotal: newSubTotal,
          grandTotal: newGrandTotal
        }
      });

      res.status(201).json({
        success: true,
        data: saleItem,
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

  /**
   * US-011: Remove item from sale
   */
  async removeItemFromSale(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { saleId, itemId } = req.params;

      // Verify sale is open
      const sale = await db.sale.findFirst({
        where: {
          id: saleId,
          companyId,
          status: 'OPEN'
        }
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found or is not open'
        });
      }

      const saleItem = await db.saleItem.findFirst({
        where: {
          id: itemId,
          saleId,
          companyId
        }
      });

      if (!saleItem) {
        return res.status(404).json({
          success: false,
          message: 'Sale item not found'
        });
      }

      await db.saleItem.delete({
        where: { id: itemId }
      });

      // Update sale totals
      const newSubTotal = parseFloat(sale.subTotal) - parseFloat(saleItem.lineTotal);
      const newGrandTotal = newSubTotal - parseFloat(sale.discountTotal) + parseFloat(sale.taxTotal);

      await db.sale.update({
        where: { id: saleId },
        data: {
          subTotal: Math.max(0, newSubTotal),
          grandTotal: Math.max(0, newGrandTotal)
        }
      });

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

  /**
   * Validate discount code (for local sales before finalization)
   */
  async validateDiscount(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        code: Joi.string().max(50).required(),
        subtotal: Joi.number().min(0).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      // Verify discount code exists and is valid
      const discountCode = await db.discountCode.findFirst({
        where: {
          code: value.code,
          companyId
        }
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          message: 'Código de desconto não encontrado'
        });
      }

      const now = new Date();
      if (discountCode.validFrom > now || discountCode.validTo < now) {
        return res.status(400).json({
          success: false,
          message: 'Código de desconto expirado ou ainda não válido'
        });
      }

      // Check max uses
      if (discountCode.maxUses) {
        const usageCount = await db.saleDiscount.count({
          where: {
            code: value.code,
            companyId
          }
        });

        if (usageCount >= discountCode.maxUses) {
          return res.status(400).json({
            success: false,
            message: 'Limite de uso do código atingido'
          });
        }
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (discountCode.type === 'PERCENT') {
        discountAmount = (value.subtotal * parseFloat(discountCode.value)) / 100;
      } else if (discountCode.type === 'AMOUNT') {
        discountAmount = Math.min(parseFloat(discountCode.value), value.subtotal);
      }

      res.json({
        success: true,
        data: {
          code: discountCode.code,
          type: discountCode.type,
          value: parseFloat(discountCode.value),
          discountAmount,
          newTotal: value.subtotal - discountAmount
        }
      });
    } catch (error) {
      console.error('Error validating discount:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating discount',
        error: error.message
      });
    }
  }

  /**
   * US-012: Apply discount code to sale
   */
  async applyDiscount(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { saleId } = req.params;

      const schema = Joi.object({
        code: Joi.string().max(50).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      // Verify sale exists and is open
      const sale = await db.sale.findFirst({
        where: {
          id: saleId,
          companyId,
          status: 'OPEN'
        },
        include: {
          discounts: true,
          buyer: true
        }
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found or is not open'
        });
      }

      // Check if discount already applied
      const alreadyApplied = sale.discounts.some(d => d.code === value.code);
      if (alreadyApplied) {
        return res.status(400).json({
          success: false,
          message: 'Discount code already applied to this sale'
        });
      }

      // Verify discount code exists and is valid
      const discountCode = await db.discountCode.findFirst({
        where: {
          code: value.code,
          companyId
        }
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found'
        });
      }

      const now = new Date();
      if (discountCode.validFrom > now || discountCode.validTo < now) {
        return res.status(400).json({
          success: false,
          message: 'Discount code is expired or not yet valid'
        });
      }

      // Check CPF range if applicable
      if (discountCode.cpfRangeStart && discountCode.cpfRangeEnd) {
        if (!sale.buyerCpf) {
          return res.status(400).json({
            success: false,
            message: 'Buyer information required for this discount code'
          });
        }

        if (sale.buyerCpf < discountCode.cpfRangeStart || sale.buyerCpf > discountCode.cpfRangeEnd) {
          return res.status(400).json({
            success: false,
            message: 'Discount code not valid for this customer'
          });
        }
      }

      // Check max uses
      if (discountCode.maxUses) {
        const usageCount = await db.saleDiscount.count({
          where: {
            code: value.code,
            companyId
          }
        });

        if (usageCount >= discountCode.maxUses) {
          return res.status(400).json({
            success: false,
            message: 'Discount code usage limit reached'
          });
        }
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (discountCode.type === 'PERCENTAGE') {
        discountAmount = (parseFloat(sale.subTotal) * parseFloat(discountCode.value)) / 100;
      } else if (discountCode.type === 'FIXED') {
        discountAmount = Math.min(parseFloat(discountCode.value), parseFloat(sale.subTotal));
      }

      // Apply discount
      await db.saleDiscount.create({
        data: {
          saleId,
          companyId,
          code: value.code,
          discountAmount
        }
      });

      // Update sale totals
      const newDiscountTotal = parseFloat(sale.discountTotal) + discountAmount;
      const newGrandTotal = parseFloat(sale.subTotal) - newDiscountTotal + parseFloat(sale.taxTotal);

      await db.sale.update({
        where: { id: saleId },
        data: {
          discountTotal: newDiscountTotal,
          grandTotal: newGrandTotal
        }
      });

      res.json({
        success: true,
        message: 'Discount applied successfully',
        discountAmount,
        newGrandTotal
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying discount',
        error: error.message
      });
    }
  }

  /**
   * US-013: Add payment to sale
   */
  async addPayment(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { saleId } = req.params;

      const schema = Joi.object({
        method: Joi.string().valid('CASH', 'CARD', 'PIX', 'OTHER').required(),
        amount: Joi.number().min(0.01).required(),
        authCode: Joi.string().max(100).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const sale = await db.sale.findFirst({
        where: {
          id: saleId,
          companyId
        },
        include: {
          payments: true
        }
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      if (sale.status !== 'OPEN') {
        return res.status(400).json({
          success: false,
          message: 'Cannot add payment to a closed sale'
        });
      }

      const payment = await db.payment.create({
        data: {
          companyId,
          saleId,
          method: value.method,
          amount: value.amount,
          authCode: value.authCode || null
        }
      });

      // Calculate total paid
      const totalPaid = sale.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) + parseFloat(value.amount);

      res.status(201).json({
        success: true,
        data: payment,
        totalPaid,
        remainingBalance: Math.max(0, parseFloat(sale.grandTotal) - totalPaid),
        message: 'Payment added successfully'
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding payment',
        error: error.message
      });
    }
  }

  /**
   * US-013: Finalize sale with payment
   */
  async finalizeSale(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { saleId } = req.params;

      const sale = await db.sale.findFirst({
        where: {
          id: saleId,
          companyId,
          status: 'OPEN'
        },
        include: {
          payments: true,
          items: true
        }
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found or is not open'
        });
      }

      if (sale.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot finalize sale without items'
        });
      }

      // Calculate total paid
      const totalPaid = sale.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      if (totalPaid < parseFloat(sale.grandTotal)) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient payment',
          required: parseFloat(sale.grandTotal),
          paid: totalPaid,
          remaining: parseFloat(sale.grandTotal) - totalPaid
        });
      }

      // Update inventory for items with SKU
      for (const item of sale.items) {
        if (item.sku) {
          await db.inventoryItem.update({
            where: {
              companyId_sku: {
                companyId,
                sku: item.sku
              }
            },
            data: {
              qtyOnHand: {
                decrement: item.quantity
              }
            }
          });
        }
      }

      // Finalize sale
      const finalizedSale = await db.sale.update({
        where: { id: saleId },
        data: {
          status: 'FINALIZED'
        },
        include: {
          cashier: {
            include: {
              person: true
            }
          },
          buyer: {
            include: {
              person: true
            }
          },
          items: true,
          payments: true,
          discounts: true
        }
      });

      res.json({
        success: true,
        data: finalizedSale,
        change: totalPaid - parseFloat(sale.grandTotal),
        message: 'Sale finalized successfully'
      });
    } catch (error) {
      console.error('Error finalizing sale:', error);
      res.status(500).json({
        success: false,
        message: 'Error finalizing sale',
        error: error.message
      });
    }
  }

  /**
   * US-015: Cancel sale
   */
  async cancelSale(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { saleId } = req.params;

      const schema = Joi.object({
        reason: Joi.string().max(500).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const sale = await db.sale.findFirst({
        where: {
          id: saleId,
          companyId
        }
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }

      if (sale.status === 'CANCELED' || sale.status === 'REFUNDED') {
        return res.status(400).json({
          success: false,
          message: 'Sale is already canceled or refunded'
        });
      }

      const canceledSale = await db.sale.update({
        where: { id: saleId },
        data: {
          status: 'CANCELED'
        }
      });

      // Log cancellation
      await db.auditLog.create({
        data: {
          companyId,
          actorCpf: req.employee.cpf,
          action: 'CANCEL_SALE',
          targetType: 'SALE',
          targetId: saleId,
          metadataJson: {
            reason: value.reason,
            originalTotal: sale.grandTotal.toString()
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      res.json({
        success: true,
        data: canceledSale,
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

  /**
   * US-015: Refund sale
   */
  async refundSale(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { saleId } = req.params;

      const schema = Joi.object({
        reason: Joi.string().max(500).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const sale = await db.sale.findFirst({
        where: {
          id: saleId,
          companyId,
          status: 'FINALIZED'
        },
        include: {
          items: true
        }
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found or cannot be refunded'
        });
      }

      // Restore inventory for items with SKU
      for (const item of sale.items) {
        if (item.sku) {
          await db.inventoryItem.update({
            where: {
              companyId_sku: {
                companyId,
                sku: item.sku
              }
            },
            data: {
              qtyOnHand: {
                increment: item.quantity
              }
            }
          });
        }
      }

      const refundedSale = await db.sale.update({
        where: { id: saleId },
        data: {
          status: 'REFUNDED'
        }
      });

      // Log refund
      await db.auditLog.create({
        data: {
          companyId,
          actorCpf: req.employee.cpf,
          action: 'REFUND_SALE',
          targetType: 'SALE',
          targetId: saleId,
          metadataJson: {
            reason: value.reason,
            refundAmount: sale.grandTotal.toString()
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      res.json({
        success: true,
        data: refundedSale,
        refundAmount: sale.grandTotal,
        message: 'Sale refunded successfully'
      });
    } catch (error) {
      console.error('Error refunding sale:', error);
      res.status(500).json({
        success: false,
        message: 'Error refunding sale',
        error: error.message
      });
    }
  }

  /**
   * US-014: Get detailed sales reports
   */
  async getSalesReports(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
        groupBy: Joi.string().valid('day', 'cashier', 'payment_method').default('day'),
        cashierCpf: Joi.string().length(11).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { startDate, endDate, groupBy, cashierCpf } = value;

      const where = {
        companyId,
        status: 'FINALIZED',
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        ...(cashierCpf && { cashierCpf })
      };

      const sales = await db.sale.findMany({
        where,
        include: {
          cashier: {
            include: {
              person: {
                select: {
                  fullName: true
                }
              }
            }
          },
          payments: true,
          items: true
        }
      });

      // Calculate summary
      const summary = {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0),
        totalDiscount: sales.reduce((sum, s) => sum + parseFloat(s.discountTotal), 0),
        averageSaleValue: sales.length > 0
          ? sales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0) / sales.length
          : 0
      };

      // Group data
      let groupedData = [];
      if (groupBy === 'cashier') {
        const cashierMap = new Map();
        sales.forEach(sale => {
          const cpf = sale.cashier.cpf;
          const name = sale.cashier.person.fullName;
          if (!cashierMap.has(cpf)) {
            cashierMap.set(cpf, {
              cashierCpf: cpf,
              cashierName: name,
              salesCount: 0,
              revenue: 0
            });
          }
          const data = cashierMap.get(cpf);
          data.salesCount++;
          data.revenue += parseFloat(sale.grandTotal);
        });
        groupedData = Array.from(cashierMap.values());
      } else if (groupBy === 'payment_method') {
        const methodMap = new Map();
        sales.forEach(sale => {
          sale.payments.forEach(payment => {
            if (!methodMap.has(payment.method)) {
              methodMap.set(payment.method, {
                method: payment.method,
                count: 0,
                total: 0
              });
            }
            const data = methodMap.get(payment.method);
            data.count++;
            data.total += parseFloat(payment.amount);
          });
        });
        groupedData = Array.from(methodMap.values());
      }

      res.json({
        success: true,
        period: {
          startDate,
          endDate
        },
        summary,
        groupedData: groupBy !== 'day' ? groupedData : undefined,
        message: 'Sales report generated successfully'
      });
    } catch (error) {
      console.error('Error generating sales report:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating sales report',
        error: error.message
      });
    }
  }

  /**
   * US-016: Get shift reconciliation report
   */
  async getShiftReconciliation(req, res) {
    try {
      const companyId = req.employee.companyId;
      const cashierCpf = req.employee.cpf;

      const schema = Joi.object({
        date: Joi.date().default(new Date()),
        cashierCpf: Joi.string().length(11).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      // Managers can query any cashier, others can only query themselves
      const targetCashierCpf = req.employee.role === 'ADMIN' || req.employee.role === 'MANAGER'
        ? (value.cashierCpf || cashierCpf)
        : cashierCpf;

      const startOfDay = new Date(value.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(value.date);
      endOfDay.setHours(23, 59, 59, 999);

      const sales = await db.sale.findMany({
        where: {
          companyId,
          cashierCpf: targetCashierCpf,
          status: 'FINALIZED',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          payments: true
        }
      });

      // Calculate by payment method
      const paymentMethodTotals = {};
      let totalSales = 0;

      sales.forEach(sale => {
        totalSales += parseFloat(sale.grandTotal);
        sale.payments.forEach(payment => {
          if (!paymentMethodTotals[payment.method]) {
            paymentMethodTotals[payment.method] = {
              count: 0,
              total: 0
            };
          }
          paymentMethodTotals[payment.method].count++;
          paymentMethodTotals[payment.method].total += parseFloat(payment.amount);
        });
      });

      res.json({
        success: true,
        data: {
          cashierCpf: targetCashierCpf,
          date: value.date,
          totalSales: sales.length,
          totalRevenue: totalSales,
          paymentMethodBreakdown: paymentMethodTotals,
          sales: sales.map(s => ({
            id: s.id,
            createdAt: s.createdAt,
            grandTotal: s.grandTotal,
            payments: s.payments
          }))
        },
        message: 'Shift reconciliation retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting shift reconciliation:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting shift reconciliation',
        error: error.message
      });
    }
  }

  /**
   * Get sales summary for dashboard
   * Returns today's revenue, transactions, and growth metrics
   */
  async getSalesSummary(req, res) {
    try {
      const companyId = req.employee.companyId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const lastMonthStart = new Date(monthAgo);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

      // Get today's sales
      const todaySales = await db.sale.findMany({
        where: {
          companyId,
          status: 'FINALIZED',
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        },
        select: {
          grandTotal: true
        }
      });

      const todayRevenue = todaySales.reduce((sum, sale) => sum + parseFloat(sale.grandTotal), 0);
      const todayTransactions = todaySales.length;

      // Get week revenue
      const weekSales = await db.sale.findMany({
        where: {
          companyId,
          status: 'FINALIZED',
          createdAt: {
            gte: weekAgo,
            lt: tomorrow
          }
        },
        select: {
          grandTotal: true
        }
      });

      const weekRevenue = weekSales.reduce((sum, sale) => sum + parseFloat(sale.grandTotal), 0);

      // Get month revenue
      const monthSales = await db.sale.findMany({
        where: {
          companyId,
          status: 'FINALIZED',
          createdAt: {
            gte: monthAgo,
            lt: tomorrow
          }
        },
        select: {
          grandTotal: true
        }
      });

      const monthRevenue = monthSales.reduce((sum, sale) => sum + parseFloat(sale.grandTotal), 0);

      // Get last month revenue for growth calculation
      const lastMonthSales = await db.sale.findMany({
        where: {
          companyId,
          status: 'FINALIZED',
          createdAt: {
            gte: lastMonthStart,
            lt: monthAgo
          }
        },
        select: {
          grandTotal: true
        }
      });

      const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + parseFloat(sale.grandTotal), 0);

      // Calculate growth percentage
      const growthPercentage = lastMonthRevenue > 0
        ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Calculate average ticket price
      const averageTicketPrice = todayTransactions > 0
        ? todayRevenue / todayTransactions
        : 0;

      res.status(200).json({
        success: true,
        data: {
          todayRevenue,
          todayTransactions,
          averageTicketPrice,
          weekRevenue,
          monthRevenue,
          growthPercentage
        }
      });
    } catch (error) {
      console.error('Error getting sales summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting sales summary',
        error: error.message
      });
    }
  }
}

module.exports = new SaleController();
