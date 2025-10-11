const Joi = require('joi');
const { db } = require('../database/prisma');

class DiscountController {
  /**
   * US-030: Create discount code
   */
  async createDiscountCode(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        code: Joi.string().max(50).uppercase().required(),
        description: Joi.string().max(200).optional(),
        type: Joi.string().valid('PERCENT', 'AMOUNT', 'BOGO').required(),
        value: Joi.number().min(0).required(),
        validFrom: Joi.date().required(),
        validTo: Joi.date().greater(Joi.ref('validFrom')).required(),
        cpfRangeStart: Joi.string().length(11).pattern(/^\d+$/).optional(),
        cpfRangeEnd: Joi.string().length(11).pattern(/^\d+$/).optional(),
        maxUses: Joi.number().integer().min(1).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      // Check if discount code already exists
      const existingCode = await db.discountCode.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: value.code
          }
        }
      });

      if (existingCode) {
        return res.status(409).json({
          success: false,
          message: 'Discount code already exists'
        });
      }

      // Validate percent discount value
      if (value.type === 'PERCENT' && value.value > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percent discount cannot exceed 100%'
        });
      }

      // Create discount code
      const discountCode = await db.discountCode.create({
        data: {
          code: value.code,
          companyId,
          description: value.description || null,
          type: value.type,
          value: value.value,
          validFrom: new Date(value.validFrom),
          validTo: new Date(value.validTo),
          cpfRangeStart: value.cpfRangeStart || null,
          cpfRangeEnd: value.cpfRangeEnd || null,
          maxUses: value.maxUses || null,
          currentUses: 0,
          isActive: true
        }
      });

      res.status(201).json({
        success: true,
        data: discountCode,
        message: 'Discount code created successfully'
      });
    } catch (error) {
      console.error('Error creating discount code:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating discount code',
        error: error.message
      });
    }
  }

  /**
   * US-030: Get all discount codes
   */
  async getAllDiscountCodes(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        isActive: Joi.boolean().optional(),
        includeExpired: Joi.boolean().default(false),
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

      const { isActive, includeExpired, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...(isActive !== undefined && { isActive }),
        ...(!includeExpired && {
          validTo: {
            gte: new Date()
          }
        })
      };

      const [discounts, totalCount] = await Promise.all([
        db.discountCode.findMany({
          where,
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        db.discountCode.count({ where })
      ]);

      // Add computed fields
      const now = new Date();
      const enrichedDiscounts = discounts.map(discount => ({
        ...discount,
        isExpired: discount.validTo < now,
        isMaxedOut: discount.maxUses ? discount.currentUses >= discount.maxUses : false,
        remainingUses: discount.maxUses ? discount.maxUses - discount.currentUses : null,
        status: discount.validTo < now ? 'EXPIRED'
          : !discount.isActive ? 'INACTIVE'
            : discount.maxUses && discount.currentUses >= discount.maxUses ? 'MAXED_OUT'
              : discount.validFrom > now ? 'SCHEDULED'
                : 'ACTIVE'
      }));

      res.json({
        success: true,
        data: enrichedDiscounts,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching discount codes',
        error: error.message
      });
    }
  }

  /**
   * US-030: Get discount code by code
   */
  async getDiscountCodeByCode(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { code } = req.params;

      const discountCode = await db.discountCode.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: code.toUpperCase()
          }
        },
        include: {
          saleDiscounts: {
            include: {
              sale: {
                select: {
                  id: true,
                  createdAt: true,
                  grandTotal: true
                }
              }
            },
            orderBy: {
              appliedAt: 'desc'
            },
            take: 10
          }
        }
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found'
        });
      }

      const now = new Date();
      const enrichedDiscount = {
        ...discountCode,
        isExpired: discountCode.validTo < now,
        isMaxedOut: discountCode.maxUses ? discountCode.currentUses >= discountCode.maxUses : false,
        remainingUses: discountCode.maxUses ? discountCode.maxUses - discountCode.currentUses : null,
        status: discountCode.validTo < now ? 'EXPIRED'
          : !discountCode.isActive ? 'INACTIVE'
            : discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses ? 'MAXED_OUT'
              : discountCode.validFrom > now ? 'SCHEDULED'
                : 'ACTIVE'
      };

      res.json({
        success: true,
        data: enrichedDiscount
      });
    } catch (error) {
      console.error('Error fetching discount code:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching discount code',
        error: error.message
      });
    }
  }

  /**
   * US-030: Update discount code
   */
  async updateDiscountCode(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { code } = req.params;

      const schema = Joi.object({
        description: Joi.string().max(200).optional(),
        validFrom: Joi.date().optional(),
        validTo: Joi.date().optional(),
        maxUses: Joi.number().integer().min(1).optional().allow(null),
        isActive: Joi.boolean().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const existingCode = await db.discountCode.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: code.toUpperCase()
          }
        }
      });

      if (!existingCode) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found'
        });
      }

      // Validate date range if updating
      if (value.validFrom || value.validTo) {
        const newValidFrom = value.validFrom ? new Date(value.validFrom) : existingCode.validFrom;
        const newValidTo = value.validTo ? new Date(value.validTo) : existingCode.validTo;

        if (newValidTo <= newValidFrom) {
          return res.status(400).json({
            success: false,
            message: 'validTo must be after validFrom'
          });
        }
      }

      const updatedCode = await db.discountCode.update({
        where: {
          companyId_code: {
            companyId,
            code: code.toUpperCase()
          }
        },
        data: {
          ...(value.description !== undefined && { description: value.description }),
          ...(value.validFrom && { validFrom: new Date(value.validFrom) }),
          ...(value.validTo && { validTo: new Date(value.validTo) }),
          ...(value.maxUses !== undefined && { maxUses: value.maxUses }),
          ...(value.isActive !== undefined && { isActive: value.isActive })
        }
      });

      res.json({
        success: true,
        data: updatedCode,
        message: 'Discount code updated successfully'
      });
    } catch (error) {
      console.error('Error updating discount code:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating discount code',
        error: error.message
      });
    }
  }

  /**
   * US-030: Deactivate discount code
   */
  async deactivateDiscountCode(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { code } = req.params;

      const discountCode = await db.discountCode.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: code.toUpperCase()
          }
        }
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          message: 'Discount code not found'
        });
      }

      const updatedCode = await db.discountCode.update({
        where: {
          companyId_code: {
            companyId,
            code: code.toUpperCase()
          }
        },
        data: {
          isActive: false
        }
      });

      res.json({
        success: true,
        data: updatedCode,
        message: 'Discount code deactivated successfully'
      });
    } catch (error) {
      console.error('Error deactivating discount code:', error);
      res.status(500).json({
        success: false,
        message: 'Error deactivating discount code',
        error: error.message
      });
    }
  }

  /**
   * US-030: Validate discount code for customer
   */
  async validateDiscountCode(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { code } = req.params;

      const schema = Joi.object({
        customerCpf: Joi.string().length(11).pattern(/^\d+$/).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const discountCode = await db.discountCode.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: code.toUpperCase()
          }
        }
      });

      if (!discountCode) {
        return res.status(404).json({
          success: false,
          valid: false,
          message: 'Discount code not found'
        });
      }

      const now = new Date();
      const validationErrors = [];

      // Check if active
      if (!discountCode.isActive) {
        validationErrors.push('Discount code is inactive');
      }

      // Check date validity
      if (now < discountCode.validFrom) {
        validationErrors.push('Discount code not yet valid');
      }
      if (now > discountCode.validTo) {
        validationErrors.push('Discount code has expired');
      }

      // Check max uses
      if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
        validationErrors.push('Discount code usage limit reached');
      }

      // Check CPF range if specified
      if (value.customerCpf && discountCode.cpfRangeStart && discountCode.cpfRangeEnd) {
        if (value.customerCpf < discountCode.cpfRangeStart || value.customerCpf > discountCode.cpfRangeEnd) {
          validationErrors.push('Customer CPF not eligible for this discount');
        }
      }

      const isValid = validationErrors.length === 0;

      res.json({
        success: true,
        valid: isValid,
        code: discountCode.code,
        type: discountCode.type,
        value: discountCode.value,
        ...(isValid && {
          discount: {
            type: discountCode.type,
            value: discountCode.value,
            description: discountCode.description
          }
        }),
        ...(!isValid && {
          errors: validationErrors
        })
      });
    } catch (error) {
      console.error('Error validating discount code:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating discount code',
        error: error.message
      });
    }
  }

  /**
   * US-030: Get discount code usage analytics
   */
  async getDiscountCodeAnalytics(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { startDate, endDate } = value;

      // Get all discount codes
      const discountCodes = await db.discountCode.findMany({
        where: { companyId },
        include: {
          saleDiscounts: {
            where: {
              ...((startDate || endDate) && {
                appliedAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) })
                }
              })
            },
            include: {
              sale: true
            }
          }
        }
      });

      // Calculate analytics
      const analytics = discountCodes.map(code => {
        const totalUses = code.saleDiscounts.length;
        const totalDiscountAmount = code.saleDiscounts.reduce(
          (sum, sd) => sum + Number(sd.discountAmount),
          0
        );
        const avgDiscountAmount = totalUses > 0 ? totalDiscountAmount / totalUses : 0;

        return {
          code: code.code,
          description: code.description,
          type: code.type,
          value: code.value,
          totalUses,
          maxUses: code.maxUses,
          remainingUses: code.maxUses ? code.maxUses - code.currentUses : null,
          totalDiscountAmount,
          avgDiscountAmount: Math.round(avgDiscountAmount * 100) / 100,
          isActive: code.isActive,
          validFrom: code.validFrom,
          validTo: code.validTo
        };
      });

      // Summary statistics
      const totalDiscounts = analytics.length;
      const activeDiscounts = analytics.filter(a => a.isActive).length;
      const totalUsage = analytics.reduce((sum, a) => sum + a.totalUses, 0);
      const totalSavings = analytics.reduce((sum, a) => sum + a.totalDiscountAmount, 0);

      res.json({
        success: true,
        data: {
          discounts: analytics.sort((a, b) => b.totalUses - a.totalUses),
          summary: {
            totalDiscounts,
            activeDiscounts,
            totalUsage,
            totalSavings: Math.round(totalSavings * 100) / 100
          }
        }
      });
    } catch (error) {
      console.error('Error fetching discount analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching discount analytics',
        error: error.message
      });
    }
  }
}

module.exports = new DiscountController();
