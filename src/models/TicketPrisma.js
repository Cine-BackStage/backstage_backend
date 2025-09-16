const { db } = require('../database/prisma');

class TicketPrisma {
  static async findAll() {
    try {
      const tickets = await db.ticket.findMany({
        include: {
          session: {
            include: {
              movie: true,
              room: true
            }
          },
          seat: true
        },
        orderBy: {
          issuedAt: 'desc'
        }
      });

      // Transform to match existing API format
      return tickets.map(ticket => ({
        id: ticket.id,
        session_id: ticket.sessionId,
        seat_id: ticket.seatId,
        price: ticket.price,
        issued_at: ticket.issuedAt,
        movie_title: ticket.session?.movie?.title,
        room_name: ticket.session?.room?.name,
        start_time: ticket.session?.startTime,
        row_label: ticket.seat?.rowLabel,
        number: ticket.seat?.number
      }));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const ticket = await db.ticket.findUnique({
        where: { id: parseInt(id) },
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

      if (!ticket) {
        return null;
      }

      // Transform to match existing API format
      return {
        id: ticket.id,
        session_id: ticket.sessionId,
        seat_id: ticket.seatId,
        price: ticket.price,
        issued_at: ticket.issuedAt,
        movie_title: ticket.session?.movie?.title,
        room_name: ticket.session?.room?.name,
        start_time: ticket.session?.startTime,
        end_time: ticket.session?.endTime,
        row_label: ticket.seat?.rowLabel,
        number: ticket.seat?.number,
        is_accessible: ticket.seat?.isAccessible
      };
    } catch (error) {
      console.error('Error fetching ticket by ID:', error);
      throw error;
    }
  }

  static async findBySession(sessionId) {
    try {
      const tickets = await db.ticket.findMany({
        where: { sessionId: parseInt(sessionId) },
        include: {
          seat: true
        },
        orderBy: [
          { seat: { rowLabel: 'asc' } },
          { seat: { number: 'asc' } }
        ]
      });

      // Transform to match existing API format
      return tickets.map(ticket => ({
        id: ticket.id,
        seat_id: ticket.seatId,
        price: ticket.price,
        issued_at: ticket.issuedAt,
        row_label: ticket.seat?.rowLabel,
        number: ticket.seat?.number,
        is_accessible: ticket.seat?.isAccessible
      }));
    } catch (error) {
      console.error('Error fetching tickets by session:', error);
      throw error;
    }
  }

  static async create(ticketData) {
    return await db.$transaction(async (prisma) => {
      try {
        // Get session and room information
        const session = await prisma.session.findUnique({
          where: { id: ticketData.session_id },
          include: {
            room: {
              include: {
                seatMap: true
              }
            }
          }
        });

        if (!session) {
          throw new Error('Session not found');
        }

        // Get room type pricing
        const roomTypePrice = await prisma.roomTypePrice.findUnique({
          where: { roomType: session.room.roomType }
        });

        if (!roomTypePrice) {
          throw new Error('Room type pricing not found');
        }

        // Check if seat is available
        const existingTicket = await prisma.ticket.findUnique({
          where: {
            sessionId_seatmapId_seatId: {
              sessionId: ticketData.session_id,
              seatmapId: session.room.seatmapId,
              seatId: ticketData.seat_id
            }
          }
        });

        if (existingTicket) {
          throw new Error('Seat already taken');
        }

        // Verify seat exists
        const seat = await prisma.seat.findUnique({
          where: {
            seatmapId_id: {
              seatmapId: session.room.seatmapId,
              id: ticketData.seat_id
            }
          }
        });

        if (!seat) {
          throw new Error('Seat does not exist');
        }

        // Create ticket
        const price = ticketData.price || roomTypePrice.price;
        const ticket = await prisma.ticket.create({
          data: {
            sessionId: ticketData.session_id,
            seatmapId: session.room.seatmapId,
            seatId: ticketData.seat_id,
            price: price
          }
        });

        return ticket;
      } catch (error) {
        console.error('Error creating ticket:', error);
        throw error;
      }
    });
  }

  static async delete(id) {
    try {
      const ticket = await db.ticket.delete({
        where: { id: parseInt(id) }
      });

      return ticket;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  }

  static async bulkCreate(sessionId, seatIds, price) {
    return await db.$transaction(async (prisma) => {
      try {
        // Get session and room information
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: {
            room: {
              include: {
                seatMap: true
              }
            }
          }
        });

        if (!session) {
          throw new Error('Session not found');
        }

        // Get room type pricing
        const roomTypePrice = await prisma.roomTypePrice.findUnique({
          where: { roomType: session.room.roomType }
        });

        if (!roomTypePrice) {
          throw new Error('Room type pricing not found');
        }

        const ticketPrice = price || roomTypePrice.price;

        // Check if any seats are already taken
        const existingTickets = await prisma.ticket.findMany({
          where: {
            sessionId: sessionId,
            seatmapId: session.room.seatmapId,
            seatId: {
              in: seatIds
            }
          }
        });

        if (existingTickets.length > 0) {
          const takenSeats = existingTickets.map(t => t.seatId);
          throw new Error(`Seats already taken: ${takenSeats.join(', ')}`);
        }

        // Create multiple tickets
        const tickets = [];
        for (const seatId of seatIds) {
          const ticket = await prisma.ticket.create({
            data: {
              sessionId: sessionId,
              seatmapId: session.room.seatmapId,
              seatId: seatId,
              price: ticketPrice
            }
          });
          tickets.push(ticket);
        }

        return tickets;
      } catch (error) {
        console.error('Error bulk creating tickets:', error);
        throw error;
      }
    });
  }
}

module.exports = TicketPrisma;