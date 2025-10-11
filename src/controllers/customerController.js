const Joi = require('joi');
const { db } = require('../database/prisma');

class CustomerController {
  /**
   * US-027: Create customer profile
   */
  async createCustomer(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        cpf: Joi.string().length(11).pattern(/^\d+$/).required(),
        fullName: Joi.string().min(3).max(200).required(),
        email: Joi.string().email().max(200).required(),
        phone: Joi.string().min(10).max(20).required(),
        birthDate: Joi.date().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      // Check if person already exists
      let person = await db.person.findUnique({
        where: { cpf: value.cpf }
      });

      // Create or update person record
      if (!person) {
        person = await db.person.create({
          data: {
            cpf: value.cpf,
            fullName: value.fullName,
            email: value.email,
            phone: value.phone
          }
        });
      }

      // Check if customer already exists for this company
      const existingCustomer = await db.customer.findUnique({
        where: {
          cpf_companyId: {
            cpf: value.cpf,
            companyId
          }
        }
      });

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message: 'Customer already registered for this cinema'
        });
      }

      // Create customer
      const customer = await db.customer.create({
        data: {
          cpf: value.cpf,
          companyId,
          birthDate: value.birthDate || null,
          loyaltyPoints: 0
        },
        include: {
          person: {
            select: {
              cpf: true,
              fullName: true,
              email: true,
              phone: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer profile created successfully'
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating customer profile',
        error: error.message
      });
    }
  }

  /**
   * US-027: Get all customers
   */
  async getAllCustomers(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
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

      const { search, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...(search && {
          person: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { cpf: { contains: search } }
            ]
          }
        })
      };

      const [customers, totalCount] = await Promise.all([
        db.customer.findMany({
          where,
          include: {
            person: {
              select: {
                cpf: true,
                fullName: true,
                email: true,
                phone: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        db.customer.count({ where })
      ]);

      res.json({
        success: true,
        data: customers,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customers',
        error: error.message
      });
    }
  }

  /**
   * US-027 & US-028: Get customer by CPF with analytics
   */
  async getCustomerByCpf(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { cpf } = req.params;

      const customer = await db.customer.findUnique({
        where: {
          cpf_companyId: {
            cpf,
            companyId
          }
        },
        include: {
          person: {
            select: {
              cpf: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          sales: {
            include: {
              payments: true,
              tickets: {
                include: {
                  session: {
                    include: {
                      movie: {
                        select: {
                          title: true
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          }
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Calculate customer statistics
      const allSales = await db.sale.findMany({
        where: {
          companyId,
          buyerCpf: cpf,
          status: 'FINALIZED'
        },
        include: {
          payments: true
        }
      });

      const totalSpent = allSales.reduce((sum, sale) => sum + Number(sale.grandTotal), 0);
      const totalPurchases = allSales.length;
      const averageSpent = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

      // Get favorite movies
      const moviePurchases = {};
      for (const sale of allSales) {
        const tickets = await db.ticket.findMany({
          where: { saleId: sale.id },
          include: {
            session: {
              include: {
                movie: true
              }
            }
          }
        });

        tickets.forEach(ticket => {
          const movieTitle = ticket.session.movie.title;
          moviePurchases[movieTitle] = (moviePurchases[movieTitle] || 0) + 1;
        });
      }

      const favoriteMovies = Object.entries(moviePurchases)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([title, count]) => ({ title, ticketCount: count }));

      res.json({
        success: true,
        data: {
          ...customer,
          analytics: {
            totalSpent,
            totalPurchases,
            averageSpent,
            favoriteMovies,
            loyaltyTier: customer.loyaltyPoints >= 1000 ? 'GOLD'
              : customer.loyaltyPoints >= 500 ? 'SILVER'
              : 'BRONZE'
          }
        }
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching customer',
        error: error.message
      });
    }
  }

  /**
   * US-027: Update customer profile
   */
  async updateCustomer(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { cpf } = req.params;

      const schema = Joi.object({
        fullName: Joi.string().min(3).max(200).optional(),
        email: Joi.string().email().max(200).optional(),
        phone: Joi.string().min(10).max(20).optional(),
        birthDate: Joi.date().optional().allow(null)
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      // Check if customer exists
      const customer = await db.customer.findUnique({
        where: {
          cpf_companyId: {
            cpf,
            companyId
          }
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Update person record if personal data changed
      if (value.fullName || value.email || value.phone) {
        await db.person.update({
          where: { cpf },
          data: {
            ...(value.fullName && { fullName: value.fullName }),
            ...(value.email && { email: value.email }),
            ...(value.phone && { phone: value.phone })
          }
        });
      }

      // Update customer record
      const updatedCustomer = await db.customer.update({
        where: {
          cpf_companyId: {
            cpf,
            companyId
          }
        },
        data: {
          ...(value.birthDate !== undefined && { birthDate: value.birthDate })
        },
        include: {
          person: {
            select: {
              cpf: true,
              fullName: true,
              email: true,
              phone: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updatedCustomer,
        message: 'Customer profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating customer',
        error: error.message
      });
    }
  }

  /**
   * US-028: Get customer purchase history
   */
  async getCustomerPurchaseHistory(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { cpf } = req.params;

      const schema = Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { startDate, endDate, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        buyerCpf: cpf,
        status: 'FINALIZED',
        ...((startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        })
      };

      const [purchases, totalCount] = await Promise.all([
        db.sale.findMany({
          where,
          include: {
            items: true,
            tickets: {
              include: {
                session: {
                  include: {
                    movie: {
                      select: {
                        title: true
                      }
                    },
                    room: {
                      select: {
                        name: true
                      }
                    }
                  }
                },
                seat: true
              }
            },
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
        data: purchases,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching purchase history',
        error: error.message
      });
    }
  }

  /**
   * US-029: Add loyalty points to customer
   */
  async addLoyaltyPoints(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { cpf } = req.params;

      const schema = Joi.object({
        points: Joi.number().integer().min(1).required(),
        reason: Joi.string().max(200).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const customer = await db.customer.findUnique({
        where: {
          cpf_companyId: {
            cpf,
            companyId
          }
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const updatedCustomer = await db.customer.update({
        where: {
          cpf_companyId: {
            cpf,
            companyId
          }
        },
        data: {
          loyaltyPoints: customer.loyaltyPoints + value.points
        },
        include: {
          person: {
            select: {
              fullName: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: {
          customer: updatedCustomer,
          pointsAdded: value.points,
          previousPoints: customer.loyaltyPoints,
          newPoints: updatedCustomer.loyaltyPoints
        },
        message: 'Loyalty points added successfully'
      });
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding loyalty points',
        error: error.message
      });
    }
  }

  /**
   * US-029: Redeem loyalty points
   */
  async redeemLoyaltyPoints(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { cpf } = req.params;

      const schema = Joi.object({
        points: Joi.number().integer().min(1).required(),
        reason: Joi.string().max(200).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const customer = await db.customer.findUnique({
        where: {
          cpf_companyId: {
            cpf,
            companyId
          }
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      if (customer.loyaltyPoints < value.points) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient loyalty points',
          available: customer.loyaltyPoints,
          requested: value.points
        });
      }

      const updatedCustomer = await db.customer.update({
        where: {
          cpf_companyId: {
            cpf,
            companyId
          }
        },
        data: {
          loyaltyPoints: customer.loyaltyPoints - value.points
        },
        include: {
          person: {
            select: {
              fullName: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: {
          customer: updatedCustomer,
          pointsRedeemed: value.points,
          previousPoints: customer.loyaltyPoints,
          remainingPoints: updatedCustomer.loyaltyPoints
        },
        message: 'Loyalty points redeemed successfully'
      });
    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
      res.status(500).json({
        success: false,
        message: 'Error redeeming loyalty points',
        error: error.message
      });
    }
  }

  /**
   * US-031: Get customer retention analytics
   */
  async getCustomerRetentionReport(req, res) {
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

      // Total customers
      const totalCustomers = await db.customer.count({
        where: { companyId }
      });

      // Active customers (purchased in last 90 days)
      const activeCustomers = await db.customer.count({
        where: {
          companyId,
          sales: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
              },
              status: 'FINALIZED'
            }
          }
        }
      });

      // Get customer segments by purchase frequency
      const allCustomersWithSales = await db.customer.findMany({
        where: { companyId },
        include: {
          sales: {
            where: {
              status: 'FINALIZED',
              ...((startDate || endDate) && {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) })
                }
              })
            }
          }
        }
      });

      const segments = {
        vip: 0,      // 10+ purchases
        regular: 0,  // 5-9 purchases
        occasional: 0, // 2-4 purchases
        onetime: 0   // 1 purchase
      };

      allCustomersWithSales.forEach(customer => {
        const purchaseCount = customer.sales.length;
        if (purchaseCount >= 10) segments.vip++;
        else if (purchaseCount >= 5) segments.regular++;
        else if (purchaseCount >= 2) segments.occasional++;
        else if (purchaseCount === 1) segments.onetime++;
      });

      // Calculate retention rate
      const retentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;

      // Get loyalty program participation
      const loyaltyParticipants = await db.customer.count({
        where: {
          companyId,
          loyaltyPoints: {
            gt: 0
          }
        }
      });

      res.json({
        success: true,
        data: {
          totalCustomers,
          activeCustomers,
          inactiveCustomers: totalCustomers - activeCustomers,
          retentionRate: Math.round(retentionRate * 100) / 100,
          segments,
          loyaltyProgram: {
            participants: loyaltyParticipants,
            participationRate: totalCustomers > 0
              ? Math.round((loyaltyParticipants / totalCustomers) * 10000) / 100
              : 0
          }
        }
      });
    } catch (error) {
      console.error('Error generating retention report:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating retention report',
        error: error.message
      });
    }
  }
}

module.exports = new CustomerController();
