const { db } = require('../database/prisma');
const Joi = require('joi');

// Enhanced validation schema for sessions
const createSessionSchema = Joi.object({
  movieId: Joi.string().uuid().required(),
  roomId: Joi.string().uuid().required(),
  startTime: Joi.date().iso().greater('now').required(),
  bufferMinutes: Joi.number().integer().min(0).max(60).default(15)
});

const updateSessionSchema = Joi.object({
  movieId: Joi.string().uuid().optional(),
  roomId: Joi.string().uuid().optional(),
  startTime: Joi.date().iso().optional(),
  bufferMinutes: Joi.number().integer().min(0).max(60).optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('SCHEDULED', 'IN_PROGRESS', 'CANCELED', 'COMPLETED').required(),
  reason: Joi.string().max(500).optional()
});

class SessionController {
  constructor() {
    // Bind all methods to preserve 'this' context
    this.checkSessionConflicts = this.checkSessionConflicts.bind(this);
    this.getBasePrice = this.getBasePrice.bind(this);
    this.getAllSessions = this.getAllSessions.bind(this);
    this.getSessionById = this.getSessionById.bind(this);
    this.getSessionSeats = this.getSessionSeats.bind(this);
    this.createSession = this.createSession.bind(this);
    this.updateSession = this.updateSession.bind(this);
    this.updateSessionStatus = this.updateSessionStatus.bind(this);
    this.deleteSession = this.deleteSession.bind(this);
  }

  // Helper function to check for session conflicts
  async checkSessionConflicts(roomId, startTime, endTime, excludeSessionId = null) {
    const where = {
      roomId,
      status: {
        not: 'CANCELED'
      },
      OR: [
        // New session starts during existing session
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } }
          ]
        },
        // New session ends during existing session
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } }
          ]
        },
        // New session completely contains existing session
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } }
          ]
        }
      ]
    };

    if (excludeSessionId) {
      where.id = { not: excludeSessionId };
    }

    const conflicts = await db.session.findMany({
      where,
      include: {
        movie: {
          select: {
            title: true
          }
        }
      }
    });

    return conflicts;
  }

  // Helper function to get base price for room type
  async getBasePrice(companyId, roomId) {
    const room = await db.room.findFirst({
      where: { id: roomId, companyId }
    });

    if (!room) {
      return null;
    }

    const roomTypePrice = await db.roomTypePrice.findUnique({
      where: {
        companyId_roomType: {
          companyId,
          roomType: room.roomType
        }
      }
    });

    return roomTypePrice ? parseFloat(roomTypePrice.price) : null;
  }

  async getAllSessions(req, res) {
    try {
      const companyId = req.employee.companyId;
      const {
        status,
        movieId,
        roomId,
        startDate,
        endDate,
        roomType,
        page = 1,
        limit = 50
      } = req.query;

      const where = {
        companyId,
        deletedAt: null // Exclude soft-deleted sessions
      };

      // Advanced filtering
      if (status) {
        where.status = status;
      }

      if (movieId) {
        where.movieId = movieId;
      }

      if (roomId) {
        where.roomId = roomId;
      }

      if (startDate || endDate) {
        where.startTime = {};
        if (startDate) {
          where.startTime.gte = new Date(startDate);
        }
        if (endDate) {
          where.startTime.lte = new Date(endDate);
        }
      }

      if (roomType) {
        where.room = {
          roomType,
          deletedAt: null
        };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [sessions, total] = await Promise.all([
        db.session.findMany({
          where,
          include: {
            movie: {
              select: {
                id: true,
                title: true,
                durationMin: true,
                genre: true,
                rating: true
              }
            },
            room: {
              select: {
                id: true,
                name: true,
                capacity: true,
                roomType: true
              }
            },
            _count: {
              select: {
                tickets: true
              }
            }
          },
          orderBy: {
            startTime: 'asc'
          },
          skip,
          take
        }),
        db.session.count({ where })
      ]);

      // Calculate availability for each session
      const sessionsWithAvailability = sessions.map(session => ({
        ...session,
        ticketsSold: session._count.tickets,
        availableSeats: session.room.capacity - session._count.tickets,
        occupancyPercentage: ((session._count.tickets / session.room.capacity) * 100).toFixed(2)
      }));

      res.json({
        success: true,
        data: sessionsWithAvailability,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sessions',
        error: error.message
      });
    }
  }

  async getSessionById(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      const session = await db.session.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          movie: true,
          room: {
            include: {
              seatMap: {
                include: {
                  seats: {
                    where: { isActive: true }
                  }
                }
              }
            }
          },
          tickets: {
            select: {
              id: true,
              seatId: true,
              status: true,
              price: true
            }
          }
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Calculate availability
      const ticketsSold = session.tickets.length;
      const availableSeats = session.room.capacity - ticketsSold;

      res.json({
        success: true,
        data: {
          ...session,
          ticketsSold,
          availableSeats,
          occupancyPercentage: ((ticketsSold / session.room.capacity) * 100).toFixed(2)
        }
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching session',
        error: error.message
      });
    }
  }

  async getSessionSeats(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      // Get session with room and seat map
      const session = await db.session.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          room: {
            include: {
              seatMap: {
                include: {
                  seats: {
                    where: { isActive: true },
                    orderBy: [
                      { rowLabel: 'asc' },
                      { number: 'asc' }
                    ]
                  }
                }
              }
            }
          },
          tickets: {
            select: {
              seatId: true,
              status: true
            }
          }
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (!session.room.seatMap) {
        return res.status(404).json({
          success: false,
          message: 'No seat map configured for this room'
        });
      }

      // Create a map of sold/reserved seats from issued tickets
      const soldSeats = new Set(
        session.tickets
          .filter(t => t.status !== 'REFUNDED')
          .map(t => t.seatId)
      );

      // Get seats that are reserved (temporary holds during checkout)
      // Only consider non-expired reservations
      const activeReservations = await db.seatReservation.findMany({
        where: {
          companyId,
          sessionId: id,
          expiresAt: {
            gt: new Date() // Not expired
          }
        },
        select: {
          seatId: true
        }
      });

      const reservedSeats = new Set(
        activeReservations.map(r => r.seatId)
      );

      // Add status to each seat
      const seatsWithStatus = session.room.seatMap.seats.map(seat => {
        let status = 'AVAILABLE';
        if (soldSeats.has(seat.id)) {
          status = 'SOLD';
        } else if (reservedSeats.has(seat.id)) {
          status = 'RESERVED';
        }

        return {
          ...seat,
          status,
          seatMapId: session.room.seatMap.id
        };
      });

      // Group seats by row for easier frontend handling
      const seatMap = seatsWithStatus.reduce((acc, seat) => {
        if (!acc[seat.rowLabel]) {
          acc[seat.rowLabel] = [];
        }
        acc[seat.rowLabel].push(seat);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          roomName: session.room.name,
          capacity: session.room.capacity,
          seatMapId: session.room.seatMap.id,
          seats: seatsWithStatus,
          seatMap,
          available: seatsWithStatus.filter(s => s.status === 'AVAILABLE').length,
          sold: seatsWithStatus.filter(s => s.status === 'SOLD').length
        }
      });
    } catch (error) {
      console.error('Error fetching session seats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching session seats',
        error: error.message
      });
    }
  }

  async createSession(req, res) {
    try {
      const companyId = req.employee.companyId;
      const { error, value } = createSessionSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const { movieId, roomId, startTime, bufferMinutes = 15 } = value;

      // Verify movie exists and is active
      const movie = await db.movie.findFirst({
        where: {
          id: movieId,
          companyId,
          isActive: true
        }
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found or inactive'
        });
      }

      // Verify room exists and is active
      const room = await db.room.findFirst({
        where: {
          id: roomId,
          companyId,
          isActive: true
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found or inactive'
        });
      }

      // Calculate end time with buffer
      const start = new Date(startTime);
      const end = new Date(start.getTime() + (movie.durationMin + bufferMinutes) * 60000);

      // Check for conflicts
      const conflicts = await this.checkSessionConflicts(roomId, start, end);

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Session conflicts with existing sessions',
          conflicts: conflicts.map(c => ({
            id: c.id,
            movie: c.movie.title,
            startTime: c.startTime,
            endTime: c.endTime
          }))
        });
      }

      // Get base price for this room type
      const basePrice = await this.getBasePrice(companyId, roomId);

      // Create session
      const session = await db.session.create({
        data: {
          companyId,
          movieId,
          roomId,
          startTime: start,
          endTime: end,
          basePrice: basePrice || 0,
          status: 'SCHEDULED'
        },
        include: {
          movie: true,
          room: true
        }
      });

      res.status(201).json({
        success: true,
        data: session,
        message: 'Session created successfully'
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating session',
        error: error.message
      });
    }
  }

  async updateSession(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;
      const { error, value } = updateSessionSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Check if session exists
      const existingSession = await db.session.findFirst({
        where: { id, companyId },
        include: {
          movie: true,
          _count: {
            select: {
              tickets: true
            }
          }
        }
      });

      if (!existingSession) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Don't allow modifications if tickets are sold
      if (existingSession._count.tickets > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cannot modify session with sold tickets'
        });
      }

      // Don't allow modifications if session has started
      if (existingSession.status !== 'SCHEDULED') {
        return res.status(409).json({
          success: false,
          message: 'Can only modify scheduled sessions'
        });
      }

      const updateData = {};

      // Handle movie change
      if (value.movieId) {
        const movie = await db.movie.findFirst({
          where: {
            id: value.movieId,
            companyId,
            isActive: true
          }
        });

        if (!movie) {
          return res.status(404).json({
            success: false,
            message: 'Movie not found or inactive'
          });
        }

        updateData.movieId = value.movieId;
        updateData.movie = movie;
      }

      // Handle room change
      if (value.roomId) {
        const room = await db.room.findFirst({
          where: {
            id: value.roomId,
            companyId,
            isActive: true
          }
        });

        if (!room) {
          return res.status(404).json({
            success: false,
            message: 'Room not found or inactive'
          });
        }

        updateData.roomId = value.roomId;

        // Update base price if room changed
        const basePrice = await this.getBasePrice(companyId, value.roomId);
        if (basePrice !== null) {
          updateData.basePrice = basePrice;
        }
      }

      // Handle time change
      if (value.startTime) {
        const movie = updateData.movie || existingSession.movie;
        const bufferMinutes = value.bufferMinutes || 15;

        const start = new Date(value.startTime);
        const end = new Date(start.getTime() + (movie.durationMin + bufferMinutes) * 60000);

        // Check conflicts (excluding current session)
        const conflicts = await this.checkSessionConflicts(
          value.roomId || existingSession.roomId,
          start,
          end,
          id
        );

        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Updated session times conflict with existing sessions',
            conflicts: conflicts.map(c => ({
              id: c.id,
              movie: c.movie.title,
              startTime: c.startTime,
              endTime: c.endTime
            }))
          });
        }

        updateData.startTime = start;
        updateData.endTime = end;
      }

      // Remove movie object before update (it's not a direct field)
      delete updateData.movie;

      const session = await db.session.update({
        where: { id },
        data: updateData,
        include: {
          movie: true,
          room: true
        }
      });

      res.json({
        success: true,
        data: session,
        message: 'Session updated successfully'
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating session',
        error: error.message
      });
    }
  }

  async updateSessionStatus(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;
      const employeeCpf = req.employee.cpf;
      const { error, value } = updateStatusSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const session = await db.session.findFirst({
        where: { id, companyId }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Business logic for status transitions
      const now = new Date();
      const { status, reason } = value;

      // Validate status transitions
      if (status === 'IN_PROGRESS') {
        if (session.status !== 'SCHEDULED') {
          return res.status(409).json({
            success: false,
            message: 'Can only start scheduled sessions'
          });
        }

        // Check if session start time is near
        const timeDiff = (session.startTime - now) / 60000; // minutes
        if (timeDiff > 15) {
          return res.status(409).json({
            success: false,
            message: 'Session start time is too far in the future'
          });
        }
      }

      if (status === 'COMPLETED') {
        if (session.status !== 'IN_PROGRESS') {
          return res.status(409).json({
            success: false,
            message: 'Can only complete sessions that are in progress'
          });
        }
      }

      if (status === 'CANCELED') {
        if (session.status === 'COMPLETED') {
          return res.status(409).json({
            success: false,
            message: 'Cannot cancel completed sessions'
          });
        }
      }

      // Update session status
      const updatedSession = await db.session.update({
        where: { id },
        data: { status },
        include: {
          movie: true,
          room: true
        }
      });

      // Log the status change
      await db.auditLog.create({
        data: {
          companyId,
          actor: `${employeeCpf}@${companyId}`,
          action: 'SESSION_STATUS_CHANGED',
          targetType: 'Session',
          targetId: id,
          metadata: {
            oldStatus: session.status,
            newStatus: status,
            reason: reason || null
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      res.json({
        success: true,
        data: updatedSession,
        message: `Session status updated to ${status}`
      });
    } catch (error) {
      console.error('Error updating session status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating session status',
        error: error.message
      });
    }
  }

  async deleteSession(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      const session = await db.session.findFirst({
        where: { id, companyId },
        include: {
          _count: {
            select: {
              tickets: true
            }
          }
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Don't allow deletion if tickets are sold
      if (session._count.tickets > 0) {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete session with sold tickets. Cancel the session instead.'
        });
      }

      await db.session.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting session',
        error: error.message
      });
    }
  }

  async getSessionHistory(req, res) {
    try {
      const companyId = req.employee.companyId;

      const deletedSessions = await db.session.findMany({
        where: {
          companyId,
          deletedAt: {
            not: null
          }
        },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              durationMin: true,
              genre: true,
              rating: true
            }
          },
          room: {
            select: {
              id: true,
              name: true,
              capacity: true,
              roomType: true
            }
          },
          _count: {
            select: {
              tickets: true
            }
          }
        },
        orderBy: {
          deletedAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: deletedSessions,
        count: deletedSessions.length,
        message: 'Deleted sessions history retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching session history:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching session history',
        error: error.message
      });
    }
  }
}

module.exports = new SessionController();
