const Joi = require('joi');
const { db } = require('../database/prisma');

class TicketController {
  /**
   * US-006: Get all tickets with advanced filtering and pagination
   */
  async getAllTickets(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        status: Joi.string().valid('ISSUED', 'USED', 'REFUNDED').optional(),
        sessionId: Joi.string().uuid().optional(),
        movieId: Joi.string().uuid().optional(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        customerCpf: Joi.string().length(11).optional(),
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

      const { status, sessionId, movieId, startDate, endDate, customerCpf, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...(status && { status }),
        ...(sessionId && { sessionId }),
        ...(customerCpf && { sale: { buyerCpf: customerCpf } }),
        ...((startDate || endDate) && {
          issuedAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        }),
        ...(movieId && {
          session: {
            movieId
          }
        })
      };

      const [tickets, totalCount] = await Promise.all([
        db.ticket.findMany({
          where,
          include: {
            session: {
              include: {
                movie: {
                  select: {
                    id: true,
                    title: true,
                    durationMin: true,
                    genre: true
                  }
                },
                room: {
                  select: {
                    id: true,
                    name: true,
                    roomType: true
                  }
                }
              }
            },
            seat: {
              select: {
                id: true,
                rowLabel: true,
                number: true,
                isAccessible: true
              }
            },
            sale: {
              select: {
                id: true,
                buyer: {
                  select: {
                    cpf: true,
                    person: {
                      select: {
                        fullName: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            issuedAt: 'desc'
          },
          skip,
          take: limit
        }),
        db.ticket.count({ where })
      ]);

      res.json({
        success: true,
        data: tickets,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching tickets',
        error: error.message
      });
    }
  }

  /**
   * US-009: Get ticket by ID with full details
   */
  async getTicketById(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { id } = req.params;

      const ticket = await db.ticket.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          session: {
            include: {
              movie: true,
              room: true
            }
          },
          seat: true,
          sale: {
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
              },
              payments: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching ticket',
        error: error.message
      });
    }
  }

  /**
   * US-006: Get tickets by session with seat availability
   */
  async getTicketsBySession(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { sessionId } = req.params;

      const tickets = await db.ticket.findMany({
        where: {
          sessionId,
          companyId
        },
        include: {
          seat: true,
          sale: {
            select: {
              id: true,
              buyer: {
                select: {
                  cpf: true,
                  person: {
                    select: {
                      fullName: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { seat: { row: 'asc' } },
          { seat: { number: 'asc' } }
        ]
      });

      res.json({
        success: true,
        data: tickets,
        count: tickets.length,
        summary: {
          issued: tickets.filter(t => t.status === 'ISSUED').length,
          used: tickets.filter(t => t.status === 'USED').length,
          refunded: tickets.filter(t => t.status === 'REFUNDED').length
        }
      });
    } catch (error) {
      console.error('Error fetching session tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching session tickets',
        error: error.message
      });
    }
  }

  /**
   * US-006: Sell single ticket efficiently with seat selection
   */
  async createTicket(req, res) {
    try {
      const companyId = req.employee.companyId;
      const _cashierCpf = req.employee.cpf;

      const schema = Joi.object({
        sessionId: Joi.string().uuid().required(),
        seatMapId: Joi.string().uuid().required(),
        seatId: Joi.string().max(10).required(),
        saleId: Joi.string().uuid().optional(),
        price: Joi.number().min(0).required(),
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

      // Verify session exists and is scheduled
      const session = await db.session.findFirst({
        where: {
          id: value.sessionId,
          companyId,
          status: 'SCHEDULED'
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found or not available for ticket sales'
        });
      }

      // Verify seat exists
      const seat = await db.seat.findFirst({
        where: {
          seatMapId: value.seatMapId,
          id: value.seatId,
          isActive: true
        }
      });

      if (!seat) {
        return res.status(404).json({
          success: false,
          message: 'Seat not found or not available'
        });
      }

      // Check if seat is already taken
      const existingTicket = await db.ticket.findFirst({
        where: {
          sessionId: value.sessionId,
          seatMapId: value.seatMapId,
          seatId: value.seatId,
          status: { not: 'REFUNDED' }
        }
      });

      if (existingTicket) {
        return res.status(409).json({
          success: false,
          message: 'Seat is already taken for this session'
        });
      }

      // Generate QR code
      const qrCode = `TKT-${companyId.substring(0, 8)}-${value.sessionId.substring(0, 8)}-${value.seatId}-${Date.now()}`;

      const ticket = await db.ticket.create({
        data: {
          companyId,
          sessionId: value.sessionId,
          seatMapId: value.seatMapId,
          seatId: value.seatId,
          saleId: value.saleId || null,
          price: value.price,
          qrCode,
          status: 'ISSUED'
        },
        include: {
          session: {
            include: {
              movie: true,
              room: true
            }
          },
          seat: true
        }
      });

      res.status(201).json({
        success: true,
        data: ticket,
        message: 'Ticket created successfully'
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating ticket',
        error: error.message
      });
    }
  }

  /**
   * US-007: Sell multiple tickets for groups
   */
  async createBulkTickets(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        sessionId: Joi.string().uuid().required(),
        seatMapId: Joi.string().uuid().required(),
        seats: Joi.array().items(
          Joi.object({
            seatId: Joi.string().max(10).required(),
            price: Joi.number().min(0).required()
          })
        ).min(1).max(20).required(),
        saleId: Joi.string().uuid().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Verify session
      const session = await db.session.findFirst({
        where: {
          id: value.sessionId,
          companyId,
          status: 'SCHEDULED'
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found or not available'
        });
      }

      // Check all seats availability
      const seatIds = value.seats.map(s => s.seatId);

      const existingTickets = await db.ticket.findMany({
        where: {
          sessionId: value.sessionId,
          seatMapId: value.seatMapId,
          seatId: { in: seatIds },
          status: { not: 'REFUNDED' }
        }
      });

      if (existingTickets.length > 0) {
        const takenSeats = existingTickets.map(t => t.seatId);
        return res.status(409).json({
          success: false,
          message: 'Some seats are already taken',
          takenSeats
        });
      }

      // Create all tickets
      const tickets = await Promise.all(
        value.seats.map(seat => {
          const qrCode = `TKT-${companyId.substring(0, 8)}-${value.sessionId.substring(0, 8)}-${seat.seatId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          return db.ticket.create({
            data: {
              companyId,
              sessionId: value.sessionId,
              seatMapId: value.seatMapId,
              seatId: seat.seatId,
              saleId: value.saleId || null,
              price: seat.price,
              qrCode,
              status: 'ISSUED'
            },
            include: {
              seat: true
            }
          });
        })
      );

      res.status(201).json({
        success: true,
        data: tickets,
        count: tickets.length,
        message: `${tickets.length} tickets created successfully`
      });
    } catch (error) {
      console.error('Error creating bulk tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating bulk tickets',
        error: error.message
      });
    }
  }

  /**
   * US-008: Process ticket refund
   */
  async refundTicket(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { id } = req.params;

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

      const ticket = await db.ticket.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          session: true
        }
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      if (ticket.status === 'REFUNDED') {
        return res.status(400).json({
          success: false,
          message: 'Ticket already refunded'
        });
      }

      if (ticket.status === 'USED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot refund a used ticket'
        });
      }

      // Check if session has already started
      if (ticket.session.startTime < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot refund ticket for session that has already started'
        });
      }

      const updatedTicket = await db.ticket.update({
        where: { id },
        data: {
          status: 'REFUNDED'
        },
        include: {
          session: {
            include: {
              movie: true
            }
          },
          seat: true
        }
      });

      // Log refund in audit trail
      await db.auditLog.create({
        data: {
          companyId,
          actorCpf: req.employee.cpf,
          action: 'REFUND_TICKET',
          targetType: 'TICKET',
          targetId: id,
          metadataJson: {
            reason: value.reason,
            refundAmount: ticket.price.toString(),
            sessionId: ticket.sessionId,
            seatId: ticket.seatId
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      res.json({
        success: true,
        data: updatedTicket,
        refundAmount: ticket.price,
        message: 'Ticket refunded successfully'
      });
    } catch (error) {
      console.error('Error refunding ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error refunding ticket',
        error: error.message
      });
    }
  }

  /**
   * US-010: Get ticket sales reports
   */
  async getSalesReports(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
        groupBy: Joi.string().valid('day', 'movie', 'session', 'employee').default('day'),
        movieId: Joi.string().uuid().optional(),
        employeeCpf: Joi.string().length(11).optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { startDate, endDate, groupBy, movieId, employeeCpf } = value;

      const where = {
        companyId,
        issuedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        ...(movieId && {
          session: {
            movieId
          }
        }),
        ...(employeeCpf && {
          sale: {
            cashierCpf: employeeCpf
          }
        })
      };

      const tickets = await db.ticket.findMany({
        where,
        include: {
          session: {
            include: {
              movie: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          },
          sale: {
            select: {
              id: true,
              cashier: {
                select: {
                  cpf: true,
                  person: {
                    select: {
                      fullName: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Calculate summary
      const summary = {
        totalTickets: tickets.length,
        totalRevenue: tickets.reduce((sum, t) => sum + parseFloat(t.price), 0),
        ticketsByStatus: {
          issued: tickets.filter(t => t.status === 'ISSUED').length,
          used: tickets.filter(t => t.status === 'USED').length,
          refunded: tickets.filter(t => t.status === 'REFUNDED').length
        },
        refundedAmount: tickets
          .filter(t => t.status === 'REFUNDED')
          .reduce((sum, t) => sum + parseFloat(t.price), 0),
        netRevenue: tickets
          .filter(t => t.status !== 'REFUNDED')
          .reduce((sum, t) => sum + parseFloat(t.price), 0)
      };

      // Group data based on groupBy parameter
      let groupedData = [];

      if (groupBy === 'day') {
        // Group by day
        const dayMap = new Map();
        tickets.forEach(ticket => {
          const date = new Date(ticket.issuedAt).toISOString().split('T')[0];
          if (!dayMap.has(date)) {
            dayMap.set(date, {
              date,
              ticketCount: 0,
              revenue: 0
            });
          }
          const data = dayMap.get(date);
          data.ticketCount++;
          if (ticket.status !== 'REFUNDED') {
            data.revenue += parseFloat(ticket.price);
          }
        });
        groupedData = Array.from(dayMap.values());
      } else if (groupBy === 'movie') {
        const movieMap = new Map();
        tickets.forEach(ticket => {
          const movieId = ticket.session.movie.id;
          const movieTitle = ticket.session.movie.title;
          if (!movieMap.has(movieId)) {
            movieMap.set(movieId, {
              movieId,
              movieTitle,
              ticketCount: 0,
              revenue: 0
            });
          }
          const data = movieMap.get(movieId);
          data.ticketCount++;
          if (ticket.status !== 'REFUNDED') {
            data.revenue += parseFloat(ticket.price);
          }
        });
        groupedData = Array.from(movieMap.values());
      } else if (groupBy === 'employee') {
        const employeeMap = new Map();
        tickets.forEach(ticket => {
          if (ticket.sale) {
            const empCpf = ticket.sale.cashier.cpf;
            const empName = ticket.sale.cashier.person.fullName;
            if (!employeeMap.has(empCpf)) {
              employeeMap.set(empCpf, {
                employeeCpf: empCpf,
                employeeName: empName,
                ticketCount: 0,
                revenue: 0
              });
            }
            const data = employeeMap.get(empCpf);
            data.ticketCount++;
            if (ticket.status !== 'REFUNDED') {
              data.revenue += parseFloat(ticket.price);
            }
          }
        });
        groupedData = Array.from(employeeMap.values());
      }

      res.json({
        success: true,
        period: {
          startDate,
          endDate,
          groupBy
        },
        summary,
        groupedData,
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
   * US-009: Get ticket history with customer information
   */
  async getTicketHistory(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        customerCpf: Joi.string().length(11).optional(),
        email: Joi.string().email().optional(),
        ticketId: Joi.string().uuid().optional(),
        sessionId: Joi.string().uuid().optional(),
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

      const { customerCpf, email, ticketId, sessionId, startDate, endDate, page, limit } = value;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...(ticketId && { id: ticketId }),
        ...(sessionId && { sessionId }),
        ...((startDate || endDate) && {
          issuedAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        })
      };

      // Add customer filter if provided
      if (customerCpf || email) {
        where.sale = {
          buyer: {
            ...(customerCpf && { cpf: customerCpf }),
            ...(email && {
              person: {
                email
              }
            })
          }
        };
      }

      const [tickets, totalCount] = await Promise.all([
        db.ticket.findMany({
          where,
          include: {
            session: {
              include: {
                movie: true,
                room: true
              }
            },
            seat: true,
            sale: {
              include: {
                buyer: {
                  include: {
                    person: true
                  }
                },
                payments: true
              }
            }
          },
          orderBy: {
            issuedAt: 'desc'
          },
          skip,
          take: limit
        }),
        db.ticket.count({ where })
      ]);

      res.json({
        success: true,
        data: tickets,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching ticket history:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching ticket history',
        error: error.message
      });
    }
  }

  /**
   * Mark ticket as used (scan QR code)
   */
  async markTicketAsUsed(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { id } = req.params;

      const ticket = await db.ticket.findFirst({
        where: {
          id,
          companyId
        }
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      if (ticket.status === 'USED') {
        return res.status(400).json({
          success: false,
          message: 'Ticket already used',
          usedAt: ticket.usedAt
        });
      }

      if (ticket.status === 'REFUNDED') {
        return res.status(400).json({
          success: false,
          message: 'Ticket has been refunded'
        });
      }

      const updatedTicket = await db.ticket.update({
        where: { id },
        data: {
          status: 'USED',
          usedAt: new Date()
        },
        include: {
          session: {
            include: {
              movie: true,
              room: true
            }
          },
          seat: true
        }
      });

      res.json({
        success: true,
        data: updatedTicket,
        message: 'Ticket marked as used successfully'
      });
    } catch (error) {
      console.error('Error marking ticket as used:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking ticket as used',
        error: error.message
      });
    }
  }
}

module.exports = new TicketController();
