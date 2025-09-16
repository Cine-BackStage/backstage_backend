const { db } = require('../database/prisma');

class MoviePrisma {
  static async findAll(filters = {}) {
    try {
      const where = {};

      // Apply filters
      if (filters.is_active !== undefined) {
        where.isActive = filters.is_active;
      }

      if (filters.genre) {
        where.genre = {
          contains: filters.genre,
          mode: 'insensitive'
        };
      }

      if (filters.title) {
        where.title = {
          contains: filters.title,
          mode: 'insensitive'
        };
      }

      const movies = await db.movie.findMany({
        where,
        include: {
          sessions: {
            select: {
              id: true,
              startTime: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform to match existing API format
      return movies.map(movie => ({
        id: movie.id,
        title: movie.title,
        duration_min: movie.durationMin,
        genre: movie.genre,
        description: movie.description,
        rating: movie.rating,
        poster_url: movie.posterUrl,
        is_active: movie.isActive,
        created_at: movie.createdAt,
        updated_at: movie.updatedAt,
        total_sessions: movie.sessions.length,
        upcoming_sessions: movie.sessions.filter(s => s.startTime > new Date()).length
      }));
    } catch (error) {
      console.error('Error fetching movies:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const movie = await db.movie.findUnique({
        where: { id: parseInt(id) },
        include: {
          sessions: {
            select: {
              id: true,
              startTime: true
            }
          }
        }
      });

      if (!movie) {
        return null;
      }

      // Transform to match existing API format
      return {
        id: movie.id,
        title: movie.title,
        duration_min: movie.durationMin,
        genre: movie.genre,
        description: movie.description,
        rating: movie.rating,
        poster_url: movie.posterUrl,
        is_active: movie.isActive,
        created_at: movie.createdAt,
        updated_at: movie.updatedAt,
        total_sessions: movie.sessions.length,
        upcoming_sessions: movie.sessions.filter(s => s.startTime > new Date()).length
      };
    } catch (error) {
      console.error('Error fetching movie by ID:', error);
      throw error;
    }
  }

  static async findByTitle(title) {
    try {
      const movies = await db.movie.findMany({
        where: {
          title: {
            contains: title,
            mode: 'insensitive'
          },
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return movies.map(movie => ({
        id: movie.id,
        title: movie.title,
        duration_min: movie.durationMin,
        genre: movie.genre,
        description: movie.description,
        rating: movie.rating,
        poster_url: movie.posterUrl,
        is_active: movie.isActive,
        created_at: movie.createdAt,
        updated_at: movie.updatedAt
      }));
    } catch (error) {
      console.error('Error finding movies by title:', error);
      throw error;
    }
  }

  static async create(movieData) {
    try {
      const {
        title,
        duration_min,
        genre,
        description,
        rating = null,
        poster_url = null,
        is_active = true
      } = movieData;

      const movie = await db.movie.create({
        data: {
          title,
          durationMin: duration_min,
          genre,
          description,
          rating,
          posterUrl: poster_url,
          isActive: is_active
        }
      });

      // Transform to match existing API format
      return {
        id: movie.id,
        title: movie.title,
        duration_min: movie.durationMin,
        genre: movie.genre,
        description: movie.description,
        rating: movie.rating,
        poster_url: movie.posterUrl,
        is_active: movie.isActive,
        created_at: movie.createdAt,
        updated_at: movie.updatedAt
      };
    } catch (error) {
      console.error('Error creating movie:', error);
      throw error;
    }
  }

  static async update(id, movieData) {
    try {
      const updateData = {};

      // Map incoming data to Prisma fields
      if (movieData.title !== undefined) updateData.title = movieData.title;
      if (movieData.duration_min !== undefined) updateData.durationMin = movieData.duration_min;
      if (movieData.genre !== undefined) updateData.genre = movieData.genre;
      if (movieData.description !== undefined) updateData.description = movieData.description;
      if (movieData.rating !== undefined) updateData.rating = movieData.rating;
      if (movieData.poster_url !== undefined) updateData.posterUrl = movieData.poster_url;
      if (movieData.is_active !== undefined) updateData.isActive = movieData.is_active;

      if (Object.keys(updateData).length === 0) {
        throw new Error('No fields to update');
      }

      const movie = await db.movie.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      // Transform to match existing API format
      return {
        id: movie.id,
        title: movie.title,
        duration_min: movie.durationMin,
        genre: movie.genre,
        description: movie.description,
        rating: movie.rating,
        poster_url: movie.posterUrl,
        is_active: movie.isActive,
        created_at: movie.createdAt,
        updated_at: movie.updatedAt
      };
    } catch (error) {
      console.error('Error updating movie:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Soft delete by setting is_active to false
      const movie = await db.movie.update({
        where: { id: parseInt(id) },
        data: {
          isActive: false
        }
      });

      // Transform to match existing API format
      return {
        id: movie.id,
        title: movie.title,
        duration_min: movie.durationMin,
        genre: movie.genre,
        description: movie.description,
        rating: movie.rating,
        poster_url: movie.posterUrl,
        is_active: movie.isActive,
        created_at: movie.createdAt,
        updated_at: movie.updatedAt
      };
    } catch (error) {
      console.error('Error deleting movie:', error);
      throw error;
    }
  }

  static async hardDelete(id) {
    try {
      // Check if movie has sessions
      const sessionCount = await db.session.count({
        where: { movieId: parseInt(id) }
      });

      if (sessionCount > 0) {
        throw new Error('Cannot delete movie with existing sessions. Use soft delete instead.');
      }

      const movie = await db.movie.delete({
        where: { id: parseInt(id) }
      });

      // Transform to match existing API format
      return {
        id: movie.id,
        title: movie.title,
        duration_min: movie.durationMin,
        genre: movie.genre,
        description: movie.description,
        rating: movie.rating,
        poster_url: movie.posterUrl,
        is_active: movie.isActive,
        created_at: movie.createdAt,
        updated_at: movie.updatedAt
      };
    } catch (error) {
      console.error('Error hard deleting movie:', error);
      throw error;
    }
  }

  static async activate(id) {
    try {
      const movie = await db.movie.update({
        where: { id: parseInt(id) },
        data: {
          isActive: true
        }
      });

      // Transform to match existing API format
      return {
        id: movie.id,
        title: movie.title,
        duration_min: movie.durationMin,
        genre: movie.genre,
        description: movie.description,
        rating: movie.rating,
        poster_url: movie.posterUrl,
        is_active: movie.isActive,
        created_at: movie.createdAt,
        updated_at: movie.updatedAt
      };
    } catch (error) {
      console.error('Error activating movie:', error);
      throw error;
    }
  }

  static async getMovieStats(id) {
    try {
      const movie = await db.movie.findUnique({
        where: { id: parseInt(id) },
        include: {
          sessions: {
            include: {
              tickets: true
            }
          }
        }
      });

      if (!movie) {
        throw new Error('Movie not found');
      }

      const totalSessions = movie.sessions.length;
      const completedSessions = movie.sessions.filter(s => s.status === 'COMPLETED').length;
      const allTickets = movie.sessions.flatMap(s => s.tickets);
      const totalTicketsSold = allTickets.length;
      const totalRevenue = allTickets.reduce((sum, ticket) => sum + parseFloat(ticket.price), 0);

      return {
        title: movie.title,
        genre: movie.genre,
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        total_tickets_sold: totalTicketsSold,
        total_revenue: totalRevenue
      };
    } catch (error) {
      console.error('Error getting movie stats:', error);
      throw error;
    }
  }
}

module.exports = MoviePrisma;