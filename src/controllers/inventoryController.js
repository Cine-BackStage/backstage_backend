const Joi = require('joi');
const { db } = require('../database/prisma');

class InventoryController {
  /**
   * US-017: Get all inventory items with low-stock alerts
   */
  async getAllItems(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        isActive: Joi.boolean().optional(),
        lowStock: Joi.boolean().optional(),
        itemType: Joi.string().valid('food', 'collectable', 'all').default('all'),
        category: Joi.string().optional(),
        search: Joi.string().optional(),
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

      const { isActive, lowStock, itemType, category, search, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...(isActive !== undefined && { isActive }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      // Filter by item type
      if (itemType === 'food') {
        where.food = { isNot: null };
      } else if (itemType === 'collectable') {
        where.collectable = { isNot: null };
      }

      // Filter by category
      if (category) {
        where.OR = [
          { food: { category } },
          { collectable: { category } }
        ];
      }

      const [items, totalCount] = await Promise.all([
        db.inventoryItem.findMany({
          where,
          include: {
            food: true,
            collectable: true
          },
          orderBy: {
            name: 'asc'
          },
          skip,
          take: limit
        }),
        db.inventoryItem.count({ where })
      ]);

      // Filter low stock items if requested
      let filteredItems = items;
      if (lowStock === true) {
        filteredItems = items.filter(item => item.qtyOnHand <= item.reorderLevel);
      }

      // Add low stock alerts
      const itemsWithAlerts = filteredItems.map(item => ({
        ...item,
        isLowStock: item.qtyOnHand <= item.reorderLevel,
        stockStatus: item.qtyOnHand === 0 ? 'OUT_OF_STOCK'
          : item.qtyOnHand <= item.reorderLevel ? 'LOW_STOCK'
          : 'IN_STOCK',
        itemType: item.food ? 'FOOD' : item.collectable ? 'COLLECTABLE' : 'GENERAL'
      }));

      // Calculate summary
      const lowStockCount = items.filter(item => item.qtyOnHand <= item.reorderLevel).length;
      const outOfStockCount = items.filter(item => item.qtyOnHand === 0).length;

      res.json({
        success: true,
        data: itemsWithAlerts,
        summary: {
          totalItems: totalCount,
          lowStockItems: lowStockCount,
          outOfStockItems: outOfStockCount,
          inStockItems: totalCount - outOfStockCount
        },
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory items',
        error: error.message
      });
    }
  }

  /**
   * US-017: Get low stock alerts
   */
  async getLowStockAlerts(req, res) {
    try {
      const companyId = req.employee.companyId;

      const items = await db.inventoryItem.findMany({
        where: {
          companyId,
          isActive: true
        },
        include: {
          food: true,
          collectable: true
        }
      });

      const lowStockItems = items
        .filter(item => item.qtyOnHand <= item.reorderLevel)
        .map(item => ({
          ...item,
          stockLevel: item.qtyOnHand,
          reorderQuantity: item.reorderLevel - item.qtyOnHand,
          daysUntilStockout: item.qtyOnHand > 0 ? Math.ceil(item.qtyOnHand / 10) : 0, // Rough estimate
          priority: item.qtyOnHand === 0 ? 'CRITICAL'
            : item.qtyOnHand <= (item.reorderLevel * 0.3) ? 'HIGH'
            : 'MEDIUM'
        }))
        .sort((a, b) => a.qtyOnHand - b.qtyOnHand);

      res.json({
        success: true,
        data: lowStockItems,
        summary: {
          critical: lowStockItems.filter(i => i.priority === 'CRITICAL').length,
          high: lowStockItems.filter(i => i.priority === 'HIGH').length,
          medium: lowStockItems.filter(i => i.priority === 'MEDIUM').length
        }
      });
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching low stock alerts',
        error: error.message
      });
    }
  }

  /**
   * US-020: Get inventory item by SKU
   */
  async getItemBySku(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { sku } = req.params;

      const item = await db.inventoryItem.findFirst({
        where: {
          sku,
          companyId
        },
        include: {
          food: true,
          collectable: true,
          adjustments: {
            include: {
              actor: {
                include: {
                  person: {
                    select: {
                      fullName: true
                    }
                  }
                }
              }
            },
            orderBy: {
              timestamp: 'desc'
            },
            take: 10
          },
          saleItems: {
            include: {
              sale: {
                select: {
                  id: true,
                  createdAt: true,
                  status: true
                }
              }
            },
            orderBy: {
              sale: {
                createdAt: 'desc'
              }
            },
            take: 5
          }
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      res.json({
        success: true,
        data: {
          ...item,
          isLowStock: item.qtyOnHand <= item.reorderLevel,
          stockStatus: item.qtyOnHand === 0 ? 'OUT_OF_STOCK'
            : item.qtyOnHand <= item.reorderLevel ? 'LOW_STOCK'
            : 'IN_STOCK',
          itemType: item.food ? 'FOOD' : item.collectable ? 'COLLECTABLE' : 'GENERAL'
        }
      });
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory item',
        error: error.message
      });
    }
  }

  /**
   * US-020: Create new inventory item
   */
  async createItem(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        sku: Joi.string().max(50).required(),
        name: Joi.string().max(200).required(),
        unitPrice: Joi.number().min(0).required(),
        qtyOnHand: Joi.number().integer().min(0).default(0),
        reorderLevel: Joi.number().integer().min(0).required(),
        barcode: Joi.string().max(50).optional(),
        itemType: Joi.string().valid('food', 'collectable', 'general').required(),
        // Food specific fields
        expiryDate: Joi.date().optional(),
        isCombo: Joi.boolean().default(false),
        foodCategory: Joi.string().max(100).optional(),
        // Collectable specific fields
        collectableCategory: Joi.string().max(100).optional(),
        brand: Joi.string().max(100).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      // Check if SKU already exists
      const existingItem = await db.inventoryItem.findFirst({
        where: {
          sku: value.sku,
          companyId
        }
      });

      if (existingItem) {
        return res.status(409).json({
          success: false,
          message: 'Item with this SKU already exists'
        });
      }

      // Create item with type-specific data
      const item = await db.inventoryItem.create({
        data: {
          sku: value.sku,
          companyId,
          name: value.name,
          unitPrice: value.unitPrice,
          qtyOnHand: value.qtyOnHand,
          reorderLevel: value.reorderLevel,
          barcode: value.barcode || null,
          isActive: true,
          ...(value.itemType === 'food' && {
            food: {
              create: {
                expiryDate: value.expiryDate || null,
                isCombo: value.isCombo,
                category: value.foodCategory || null
              }
            }
          }),
          ...(value.itemType === 'collectable' && {
            collectable: {
              create: {
                category: value.collectableCategory,
                brand: value.brand
              }
            }
          })
        },
        include: {
          food: true,
          collectable: true
        }
      });

      // Log initial stock if any
      if (value.qtyOnHand > 0) {
        await db.inventoryAdjustment.create({
          data: {
            companyId,
            sku: value.sku,
            delta: value.qtyOnHand,
            reason: 'INITIAL_STOCK',
            actorCpf: req.employee.cpf,
            notes: 'Initial inventory creation'
          }
        });
      }

      res.status(201).json({
        success: true,
        data: item,
        message: 'Inventory item created successfully'
      });
    } catch (error) {
      console.error('Error creating inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating inventory item',
        error: error.message
      });
    }
  }

  /**
   * US-020: Update inventory item
   */
  async updateItem(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { sku } = req.params;

      const schema = Joi.object({
        name: Joi.string().max(200).optional(),
        unitPrice: Joi.number().min(0).optional(),
        reorderLevel: Joi.number().integer().min(0).optional(),
        barcode: Joi.string().max(50).optional().allow(null),
        // Food specific updates
        expiryDate: Joi.date().optional().allow(null),
        isCombo: Joi.boolean().optional(),
        foodCategory: Joi.string().max(100).optional().allow(null),
        // Collectable specific updates
        collectableCategory: Joi.string().max(100).optional(),
        brand: Joi.string().max(100).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const existingItem = await db.inventoryItem.findFirst({
        where: {
          sku,
          companyId
        },
        include: {
          food: true,
          collectable: true
        }
      });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      // Update base item
      const updateData = {
        ...(value.name && { name: value.name }),
        ...(value.unitPrice !== undefined && { unitPrice: value.unitPrice }),
        ...(value.reorderLevel !== undefined && { reorderLevel: value.reorderLevel }),
        ...(value.barcode !== undefined && { barcode: value.barcode })
      };

      const item = await db.inventoryItem.update({
        where: {
          companyId_sku: {
            companyId,
            sku
          }
        },
        data: updateData,
        include: {
          food: true,
          collectable: true
        }
      });

      // Update food-specific fields
      if (existingItem.food && (value.expiryDate !== undefined || value.isCombo !== undefined || value.foodCategory !== undefined)) {
        await db.food.update({
          where: {
            companyId_sku: {
              companyId,
              sku
            }
          },
          data: {
            ...(value.expiryDate !== undefined && { expiryDate: value.expiryDate }),
            ...(value.isCombo !== undefined && { isCombo: value.isCombo }),
            ...(value.foodCategory !== undefined && { category: value.foodCategory })
          }
        });
      }

      // Update collectable-specific fields
      if (existingItem.collectable && (value.collectableCategory || value.brand)) {
        await db.collectable.update({
          where: {
            companyId_sku: {
              companyId,
              sku
            }
          },
          data: {
            ...(value.collectableCategory && { category: value.collectableCategory }),
            ...(value.brand && { brand: value.brand })
          }
        });
      }

      // Fetch updated item
      const updatedItem = await db.inventoryItem.findFirst({
        where: {
          sku,
          companyId
        },
        include: {
          food: true,
          collectable: true
        }
      });

      res.json({
        success: true,
        data: updatedItem,
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating inventory item',
        error: error.message
      });
    }
  }

  /**
   * US-020: Deactivate inventory item
   */
  async deactivateItem(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { sku } = req.params;

      const item = await db.inventoryItem.findFirst({
        where: {
          sku,
          companyId
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      const updatedItem = await db.inventoryItem.update({
        where: {
          companyId_sku: {
            companyId,
            sku
          }
        },
        data: {
          isActive: false
        }
      });

      res.json({
        success: true,
        data: updatedItem,
        message: 'Inventory item deactivated successfully'
      });
    } catch (error) {
      console.error('Error deactivating inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Error deactivating inventory item',
        error: error.message
      });
    }
  }

  /**
   * US-020: Activate inventory item
   */
  async activateItem(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { sku } = req.params;

      const item = await db.inventoryItem.findFirst({
        where: {
          sku,
          companyId
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      const updatedItem = await db.inventoryItem.update({
        where: {
          companyId_sku: {
            companyId,
            sku
          }
        },
        data: {
          isActive: true
        }
      });

      res.json({
        success: true,
        data: updatedItem,
        message: 'Inventory item activated successfully'
      });
    } catch (error) {
      console.error('Error activating inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Error activating inventory item',
        error: error.message
      });
    }
  }

  /**
   * US-018: Record inventory adjustment
   */
  async recordAdjustment(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { sku } = req.params;

      const schema = Joi.object({
        delta: Joi.number().integer().required(),
        reason: Joi.string().valid(
          'DAMAGE',
          'THEFT',
          'EXPIRY',
          'RESTOCK',
          'RETURN',
          'COUNT_CORRECTION',
          'OTHER'
        ).required(),
        notes: Joi.string().max(500).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const item = await db.inventoryItem.findFirst({
        where: {
          sku,
          companyId
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      // Check if adjustment would result in negative stock
      const newQty = item.qtyOnHand + value.delta;
      if (newQty < 0) {
        return res.status(400).json({
          success: false,
          message: 'Adjustment would result in negative stock',
          currentStock: item.qtyOnHand,
          requestedChange: value.delta,
          resultingStock: newQty
        });
      }

      // Create adjustment record
      const adjustment = await db.inventoryAdjustment.create({
        data: {
          companyId,
          sku,
          delta: value.delta,
          reason: value.reason,
          actorCpf: req.employee.cpf,
          notes: value.notes || null
        },
        include: {
          actor: {
            include: {
              person: {
                select: {
                  fullName: true
                }
              }
            }
          },
          item: true
        }
      });

      // Update inventory quantity
      const updatedItem = await db.inventoryItem.update({
        where: {
          companyId_sku: {
            companyId,
            sku
          }
        },
        data: {
          qtyOnHand: newQty
        }
      });

      res.status(201).json({
        success: true,
        data: {
          adjustment,
          item: {
            sku: updatedItem.sku,
            name: updatedItem.name,
            previousQty: item.qtyOnHand,
            newQty: updatedItem.qtyOnHand,
            isLowStock: updatedItem.qtyOnHand <= updatedItem.reorderLevel
          }
        },
        message: 'Inventory adjustment recorded successfully'
      });
    } catch (error) {
      console.error('Error recording adjustment:', error);
      res.status(500).json({
        success: false,
        message: 'Error recording adjustment',
        error: error.message
      });
    }
  }

  /**
   * US-019: Get adjustment history
   */
  async getAdjustments(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        sku: Joi.string().max(50).optional(),
        reason: Joi.string().optional(),
        actorCpf: Joi.string().length(11).optional(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
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

      const { sku, reason, actorCpf, startDate, endDate, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...(sku && { sku }),
        ...(reason && { reason }),
        ...(actorCpf && { actorCpf }),
        ...((startDate || endDate) && {
          timestamp: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        })
      };

      const [adjustments, totalCount] = await Promise.all([
        db.inventoryAdjustment.findMany({
          where,
          include: {
            item: {
              select: {
                sku: true,
                name: true,
                qtyOnHand: true
              }
            },
            actor: {
              include: {
                person: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          skip,
          take: limit
        }),
        db.inventoryAdjustment.count({ where })
      ]);

      res.json({
        success: true,
        data: adjustments,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching adjustments',
        error: error.message
      });
    }
  }

  /**
   * US-019: Get audit logs for inventory
   */
  async getAuditLogs(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        sku: Joi.string().max(50).optional(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
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

      const { sku, startDate, endDate, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        targetType: 'INVENTORY',
        ...((startDate || endDate) && {
          timestamp: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        })
      };

      if (sku) {
        where.metadataJson = {
          path: ['sku'],
          equals: sku
        };
      }

      const [logs, totalCount] = await Promise.all([
        db.auditLog.findMany({
          where,
          include: {
            employee: {
              include: {
                person: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          skip,
          take: limit
        }),
        db.auditLog.count({ where })
      ]);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching audit logs',
        error: error.message
      });
    }
  }

  /**
   * US-021: Get items expiring soon
   */
  async getExpiringItems(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        days: Joi.number().integer().min(1).max(90).default(30)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { days } = value;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const expiringItems = await db.inventoryItem.findMany({
        where: {
          companyId,
          isActive: true,
          food: {
            expiryDate: {
              lte: futureDate,
              gte: new Date()
            }
          }
        },
        include: {
          food: true
        },
        orderBy: {
          food: {
            expiryDate: 'asc'
          }
        }
      });

      const expiredItems = await db.inventoryItem.findMany({
        where: {
          companyId,
          isActive: true,
          food: {
            expiryDate: {
              lt: new Date()
            }
          }
        },
        include: {
          food: true
        }
      });

      const itemsWithDaysRemaining = expiringItems.map(item => {
        const daysRemaining = Math.ceil(
          (new Date(item.food.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...item,
          daysRemaining,
          priority: daysRemaining <= 3 ? 'CRITICAL'
            : daysRemaining <= 7 ? 'HIGH'
            : daysRemaining <= 14 ? 'MEDIUM'
            : 'LOW',
          action: daysRemaining <= 3 ? 'REMOVE_IMMEDIATELY'
            : daysRemaining <= 7 ? 'DISCOUNT_OR_REMOVE'
            : 'MONITOR'
        };
      });

      res.json({
        success: true,
        data: {
          expiringItems: itemsWithDaysRemaining,
          expiredItems
        },
        summary: {
          expiringInNext7Days: itemsWithDaysRemaining.filter(i => i.daysRemaining <= 7).length,
          expiringInNext30Days: itemsWithDaysRemaining.length,
          expired: expiredItems.length,
          criticalAction: itemsWithDaysRemaining.filter(i => i.priority === 'CRITICAL').length
        }
      });
    } catch (error) {
      console.error('Error fetching expiring items:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expiring items',
        error: error.message
      });
    }
  }
}

module.exports = new InventoryController();
