const Joi = require('joi');
const { db } = require('../database/prisma');

class SeatReservationController {
  /**
   * Reserve seats temporarily (15 minutes) without creating a sale
   * Client provides a reservation token to identify their reservations
   */
  async reserveSeats(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        sessionId: Joi.string().uuid().required(),
        seatIds: Joi.array().items(Joi.string().max(10)).min(1).required(),
        reservationToken: Joi.string().max(100).required() // Client-generated token
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { sessionId, seatIds, reservationToken } = value;

      // Get session to find room's seatMapId
      const session = await db.session.findFirst({
        where: {
          id: sessionId,
          companyId
        },
        include: {
          room: {
            select: {
              seatMapId: true
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

      const seatMapId = session.room.seatMapId;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      // Check if any seats are already sold (have tickets)
      const existingTickets = await db.ticket.findMany({
        where: {
          companyId,
          sessionId,
          seatMapId,
          seatId: {
            in: seatIds
          },
          status: {
            not: 'REFUNDED'
          }
        },
        select: {
          seatId: true
        }
      });

      if (existingTickets.length > 0) {
        const soldSeats = existingTickets.map(t => t.seatId);
        return res.status(409).json({
          success: false,
          message: `Os seguintes assentos já foram vendidos: ${soldSeats.join(', ')}`
        });
      }

      // Check if any seats are reserved by others (not expired)
      const existingReservations = await db.seatReservation.findMany({
        where: {
          companyId,
          sessionId,
          seatMapId,
          seatId: {
            in: seatIds
          },
          reservationToken: {
            not: reservationToken // Exclude own reservations
          },
          expiresAt: {
            gt: new Date() // Not expired
          }
        },
        select: {
          seatId: true
        }
      });

      if (existingReservations.length > 0) {
        const reservedSeats = existingReservations.map(r => r.seatId);
        return res.status(409).json({
          success: false,
          message: `Os seguintes assentos estão sendo processados em outra venda: ${reservedSeats.join(', ')}`
        });
      }

      // Create or update reservations for each seat
      const createdReservations = [];
      for (const seatId of seatIds) {
        const reservation = await db.seatReservation.upsert({
          where: {
            companyId_sessionId_seatMapId_seatId: {
              companyId,
              sessionId,
              seatMapId,
              seatId
            }
          },
          update: {
            reservationToken,
            expiresAt
          },
          create: {
            companyId,
            sessionId,
            seatMapId,
            seatId,
            reservationToken,
            expiresAt
          }
        });
        createdReservations.push(reservation);
      }

      res.status(201).json({
        success: true,
        data: createdReservations,
        message: `${seatIds.length} assento(s) reservado(s) por 15 minutos`,
        expiresAt
      });
    } catch (error) {
      console.error('Error reserving seats:', error);
      res.status(500).json({
        success: false,
        message: 'Error reserving seats',
        error: error.message
      });
    }
  }

  /**
   * Release seat reservations for a specific token
   */
  async releaseReservations(req, res) {
    try {
      const companyId = req.employee.companyId;

      const schema = Joi.object({
        reservationToken: Joi.string().max(100).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(d => d.message)
        });
      }

      const { reservationToken } = value;

      const result = await db.seatReservation.deleteMany({
        where: {
          companyId,
          reservationToken
        }
      });

      res.json({
        success: true,
        message: `${result.count} reserva(s) liberada(s)`,
        released: result.count
      });
    } catch (error) {
      console.error('Error releasing reservations:', error);
      res.status(500).json({
        success: false,
        message: 'Error releasing reservations',
        error: error.message
      });
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations(req, res) {
    try {
      const companyId = req.employee.companyId;

      const result = await db.seatReservation.deleteMany({
        where: {
          companyId,
          expiresAt: {
            lt: new Date()
          }
        }
      });

      res.json({
        success: true,
        message: `${result.count} reserva(s) expirada(s) removida(s)`,
        cleaned: result.count
      });
    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
      res.status(500).json({
        success: false,
        message: 'Error cleaning up expired reservations',
        error: error.message
      });
    }
  }
}

module.exports = new SeatReservationController();
