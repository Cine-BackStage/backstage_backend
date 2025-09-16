const { db } = require('../database/prisma');

class SalePrisma {
  static async findAll(limit = 50, offset = 0) {
    try {
      const sales = await db.sale.findMany({
        take: limit,
        skip: offset,
        include: {
          buyer: {
            include: {
              person: true
            }
          },
          cashier: {
            include: {
              person: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform to match existing API format
      return sales.map(sale => ({
        id: sale.id,
        created_at: sale.createdAt,
        status: sale.status,
        sub_total: sale.subTotal,
        discount_total: sale.discountTotal,
        grand_total: sale.grandTotal,
        buyer_name: sale.buyer?.person?.fullName,
        cashier_name: sale.cashier?.person?.fullName
      }));
    } catch (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const sale = await db.sale.findUnique({
        where: { id: parseInt(id) },
        include: {
          buyer: {
            include: {
              person: true
            }
          },
          cashier: {
            include: {
              person: true
            }
          }
        }
      });

      if (!sale) {
        return null;
      }

      // Transform to match existing API format
      return {
        id: sale.id,
        created_at: sale.createdAt,
        status: sale.status,
        buyer_cpf: sale.buyerCpf,
        cashier_cpf: sale.cashierCpf,
        sub_total: sale.subTotal,
        discount_total: sale.discountTotal,
        grand_total: sale.grandTotal,
        buyer_name: sale.buyer?.person?.fullName,
        buyer_email: sale.buyer?.person?.email,
        cashier_name: sale.cashier?.person?.fullName
      };
    } catch (error) {
      console.error('Error fetching sale by ID:', error);
      throw error;
    }
  }

  static async getSaleItems(saleId) {
    try {
      const saleItems = await db.saleItem.findMany({
        where: { saleId: parseInt(saleId) },
        include: {
          item: true
        },
        orderBy: {
          id: 'asc'
        }
      });

      // Transform to match existing API format
      return saleItems.map(item => ({
        id: item.id,
        description: item.item?.name || 'Unknown Item',
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: item.quantity * item.price
      }));
    } catch (error) {
      console.error('Error fetching sale items:', error);
      throw error;
    }
  }

  static async getSalePayments(saleId) {
    try {
      const payments = await db.payment.findMany({
        where: { saleId: parseInt(saleId) },
        orderBy: {
          processedAt: 'asc'
        }
      });

      // Transform to match existing API format
      return payments.map(payment => ({
        id: payment.id,
        method: payment.paymentMethod,
        amount: payment.amount,
        auth_code: null, // Not in current schema
        paid_at: payment.processedAt
      }));
    } catch (error) {
      console.error('Error fetching sale payments:', error);
      throw error;
    }
  }

  static async create(saleData) {
    try {
      const { buyer_cpf, cashier_cpf } = saleData;

      const sale = await db.sale.create({
        data: {
          buyerCpf: buyer_cpf,
          cashierCpf: cashier_cpf,
          subTotal: 0,
          discountTotal: 0,
          grandTotal: 0,
          status: 'OPEN'
        }
      });

      return {
        id: sale.id,
        buyer_cpf: sale.buyerCpf,
        cashier_cpf: sale.cashierCpf,
        status: sale.status,
        created_at: sale.createdAt
      };
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }

  static async addItem(saleId, itemData) {
    return await db.$transaction(async (prisma) => {
      try {
        const { description, sku, quantity, unit_price } = itemData;
        const line_total = quantity * unit_price;

        // Verify inventory item exists
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { sku: sku }
        });

        if (!inventoryItem) {
          throw new Error('Inventory item not found');
        }

        // Add item to sale
        const saleItem = await prisma.saleItem.create({
          data: {
            saleId: parseInt(saleId),
            sku: sku,
            quantity: quantity,
            price: unit_price
          }
        });

        // Recalculate totals
        await this.recalculateTotals(parseInt(saleId));

        return {
          id: saleItem.id,
          sale_id: saleItem.saleId,
          description: inventoryItem.name,
          sku: saleItem.sku,
          quantity: saleItem.quantity,
          unit_price: saleItem.price,
          line_total: line_total
        };
      } catch (error) {
        console.error('Error adding item to sale:', error);
        throw error;
      }
    });
  }

  static async removeItem(saleId, itemId) {
    return await db.$transaction(async (prisma) => {
      try {
        const saleItem = await prisma.saleItem.delete({
          where: {
            id: parseInt(itemId),
            saleId: parseInt(saleId)
          }
        });

        // Recalculate totals
        await this.recalculateTotals(parseInt(saleId));

        return saleItem;
      } catch (error) {
        console.error('Error removing item from sale:', error);
        throw error;
      }
    });
  }

  static async applyDiscount(saleId, discountCode) {
    return await db.$transaction(async (prisma) => {
      try {
        // Check if discount code exists and is valid
        const discount = await prisma.discountCode.findUnique({
          where: { code: discountCode }
        });

        if (!discount) {
          throw new Error('Discount code not found');
        }

        const now = new Date();
        if (discount.validFrom > now || discount.validTo < now) {
          throw new Error('Discount code expired');
        }

        // Check if sale has buyer (required for discounts)
        const sale = await prisma.sale.findUnique({
          where: { id: parseInt(saleId) }
        });

        if (!sale.buyerCpf) {
          throw new Error('Buyer information required to apply discount');
        }

        // Check if discount already applied
        const existingDiscount = await prisma.saleDiscount.findUnique({
          where: {
            saleId_code: {
              saleId: parseInt(saleId),
              code: discountCode
            }
          }
        });

        if (existingDiscount) {
          throw new Error('Discount code already applied to this sale');
        }

        // Apply discount
        await prisma.saleDiscount.create({
          data: {
            saleId: parseInt(saleId),
            code: discountCode
          }
        });

        // Recalculate totals
        await this.recalculateTotals(parseInt(saleId));

        return { message: 'Discount applied successfully' };
      } catch (error) {
        console.error('Error applying discount:', error);
        throw error;
      }
    });
  }

  static async recalculateTotals(saleId) {
    try {
      // Get all sale items
      const saleItems = await db.saleItem.findMany({
        where: { saleId: saleId }
      });

      const subTotal = saleItems.reduce((sum, item) => {
        return sum + (item.quantity * parseFloat(item.price));
      }, 0);

      // Get all discounts
      const saleDiscounts = await db.saleDiscount.findMany({
        where: { saleId: saleId },
        include: {
          discountCode: true
        }
      });

      let discountTotal = 0;
      for (const saleDiscount of saleDiscounts) {
        const discount = saleDiscount.discountCode;
        if (discount.type === 'PERCENT') {
          discountTotal += subTotal * (parseFloat(discount.value) / 100);
        } else {
          discountTotal += parseFloat(discount.value);
        }
      }

      const grandTotal = subTotal - discountTotal;

      // Update sale totals
      await db.sale.update({
        where: { id: saleId },
        data: {
          subTotal: subTotal,
          discountTotal: discountTotal,
          grandTotal: grandTotal
        }
      });
    } catch (error) {
      console.error('Error recalculating totals:', error);
      throw error;
    }
  }

  static async finalize(saleId, paymentData) {
    return await db.$transaction(async (prisma) => {
      try {
        // Get sale total
        const sale = await prisma.sale.findUnique({
          where: { id: parseInt(saleId) }
        });

        if (!sale) {
          throw new Error('Sale not found');
        }

        const grandTotal = parseFloat(sale.grandTotal);

        // Calculate existing payments
        const existingPayments = await prisma.payment.findMany({
          where: { saleId: parseInt(saleId) }
        });

        let totalPaid = existingPayments.reduce((sum, payment) => {
          return sum + parseFloat(payment.amount);
        }, 0);

        // Add new payments
        for (const payment of paymentData) {
          await prisma.payment.create({
            data: {
              saleId: parseInt(saleId),
              paymentMethod: payment.method,
              amount: payment.amount
            }
          });

          totalPaid += parseFloat(payment.amount);
        }

        // Check if payment is sufficient
        if (totalPaid < grandTotal) {
          throw new Error(`Insufficient payment. Required: ${grandTotal}, Received: ${totalPaid}`);
        }

        // Finalize sale
        const finalizedSale = await prisma.sale.update({
          where: { id: parseInt(saleId) },
          data: {
            status: 'FINALIZED'
          }
        });

        return {
          id: finalizedSale.id,
          status: finalizedSale.status,
          grand_total: finalizedSale.grandTotal,
          created_at: finalizedSale.createdAt
        };
      } catch (error) {
        console.error('Error finalizing sale:', error);
        throw error;
      }
    });
  }

  static async cancel(saleId, reason) {
    return await db.$transaction(async (prisma) => {
      try {
        const sale = await prisma.sale.update({
          where: {
            id: parseInt(saleId),
            status: 'OPEN'
          },
          data: {
            status: 'CANCELED'
          }
        });

        // Log the cancellation
        if (sale.cashierCpf) {
          await prisma.auditLog.create({
            data: {
              actorCpf: sale.cashierCpf,
              action: 'CANCEL_SALE',
              targetType: 'sale',
              targetId: saleId.toString(),
              metadataJson: { reason }
            }
          });
        }

        return {
          id: sale.id,
          status: sale.status,
          created_at: sale.createdAt
        };
      } catch (error) {
        console.error('Error cancelling sale:', error);
        throw error;
      }
    });
  }
}

module.exports = SalePrisma;