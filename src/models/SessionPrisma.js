const { db } = require('../database/prisma');

class SessionPrisma {
  static async findAll() {
    try {
      const sessions = await db.session.findMany({
        where: {
          startTime: {
            gt: new Date()
          }
        },
        include: {
          movie: true,
          room: {
            include: {
              seatMap: true
            }
          },
          tickets: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      // Transform to match your existing API response format
      return sessions.map(session => ({
        session_id: session.id,
        start_time: session.startTime,
        end_time: session.endTime,
        status: session.status,
        movie_title: session.movie?.title,
        duration_min: session.movie?.durationMin,
        genre: session.movie?.genre,
        room_name: session.room?.name,
        room_type: session.room?.roomType,
        base_price: 0, // Will need to get from room_type_price table
        available_seats: session.room?.capacity - session.tickets.length,
        total_capacity: session.room?.capacity
      }));
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  static async findAllWithPricing() {
    try {
      const sessions = await db.session.findMany({
        where: {
          startTime: {
            gt: new Date()
          }
        },
        include: {
          movie: true,
          room: {
            include: {
              seatMap: true
            }
          },
          tickets: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      // Get room type prices
      const roomTypePrices = await db.roomTypePrice.findMany();
      const priceMap = roomTypePrices.reduce((acc, price) => {
        acc[price.roomType] = price.price;
        return acc;
      }, {});

      // Transform to match your existing API response format
      return sessions.map(session => ({
        session_id: session.id,
        start_time: session.startTime,
        end_time: session.endTime,
        status: session.status,
        movie_title: session.movie?.title,
        duration_min: session.movie?.durationMin,
        genre: session.movie?.genre,
        room_name: session.room?.name,
        room_type: session.room?.roomType,
        base_price: priceMap[session.room?.roomType] || 0,
        available_seats: session.room?.capacity - session.tickets.length,
        total_capacity: session.room?.capacity
      }));
    } catch (error) {
      console.error('Error fetching sessions with pricing:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const session = await db.session.findUnique({
        where: { id: parseInt(id) },
        include: {
          movie: true,
          room: {
            include: {
              seatMap: true
            }
          }
        }
      });

      if (!session) {
        return null;
      }

      // Get base price from room type pricing
      const roomTypePrice = await db.roomTypePrice.findUnique({
        where: { roomType: session.room.roomType }
      });

      // Transform to match your existing API response format
      return {
        session_id: session.id,
        start_time: session.startTime,
        end_time: session.endTime,
        status: session.status,
        movie_id: session.movieId,
        room_id: session.roomId,
        movie_title: session.movie?.title,
        duration_min: session.movie?.durationMin,
        genre: session.movie?.genre,
        movie_description: session.movie?.description,
        room_name: session.room?.name,
        room_type: session.room?.roomType,
        capacity: session.room?.capacity,
        seatmap_id: session.room?.seatmapId,
        base_price: roomTypePrice?.price || 0
      };
    } catch (error) {
      console.error('Error fetching session by ID:', error);
      throw error;
    }
  }

  static async getAvailableSeats(sessionId) {
    try {
      const session = await db.session.findUnique({
        where: { id: parseInt(sessionId) },
        include: {
          room: {
            include: {
              seatMap: {
                include: {
                  seats: true
                }
              }
            }
          },
          tickets: true
        }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const soldSeatIds = session.tickets.map(ticket => ticket.seatId);

      // Transform seats to match existing format
      const seats = session.room.seatMap.seats.map(seat => ({
        row_label: seat.rowLabel,
        number: seat.number,
        seat_id: seat.id,
        is_accessible: seat.isAccessible,
        status: soldSeatIds.includes(seat.id) ? 'SOLD' : 'AVAILABLE'
      }));

      return seats;
    } catch (error) {
      console.error('Error fetching available seats:', error);
      throw error;
    }
  }

  static async create(sessionData) {
    try {
      const { movie_id, room_id, start_time, end_time, status = 'SCHEDULED' } = sessionData;

      const session = await db.session.create({
        data: {
          movieId: movie_id,
          roomId: room_id,
          startTime: new Date(start_time),
          endTime: new Date(end_time),
          status: status
        },
        include: {
          movie: true,
          room: true
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  static async update(id, sessionData) {
    try {
      // Build update data object
      const updateData = {};

      if (sessionData.movie_id !== undefined) updateData.movieId = sessionData.movie_id;
      if (sessionData.room_id !== undefined) updateData.roomId = sessionData.room_id;
      if (sessionData.start_time !== undefined) updateData.startTime = new Date(sessionData.start_time);
      if (sessionData.end_time !== undefined) updateData.endTime = new Date(sessionData.end_time);
      if (sessionData.status !== undefined) updateData.status = sessionData.status;

      if (Object.keys(updateData).length === 0) {
        throw new Error('No fields to update');
      }

      const session = await db.session.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          movie: true,
          room: true
        }
      });

      return session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const session = await db.session.delete({
        where: { id: parseInt(id) },
        include: {
          movie: true,
          room: true
        }
      });

      return session;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
}

module.exports = SessionPrisma;