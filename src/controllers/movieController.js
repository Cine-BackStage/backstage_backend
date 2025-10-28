const { db } = require('../database/prisma');
const { validateMovie } = require('../utils/validation');

class MovieController {
  async getAllMovies(req, res) {
    try {
      const companyId = req.employee.companyId; // Get from authenticated employee

      const where = {
        companyId // Add tenant scoping
      };

      // Apply filters
      if (req.query.is_active !== undefined) {
        where.isActive = req.query.is_active === 'true';
      }

      if (req.query.genre) {
        where.genre = {
          contains: req.query.genre,
          mode: 'insensitive'
        };
      }

      if (req.query.title) {
        where.title = {
          contains: req.query.title,
          mode: 'insensitive'
        };
      }

      const movies = await db.movie.findMany({
        where,
        include: {
          sessions: {
            where: {
              companyId, // Ensure sessions are also tenant-scoped
              startTime: {
                gte: new Date()
              }
            },
            orderBy: {
              startTime: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Add computed fields for backward compatibility
      const moviesWithStats = movies.map(movie => ({
        ...movie,
        total_sessions: movie.sessions.length,
        upcoming_sessions: movie.sessions.filter(session => new Date(session.startTime) > new Date()).length
      }));

      res.json({
        success: true,
        data: moviesWithStats,
        count: moviesWithStats.length
      });
    } catch (error) {
      console.error('Error fetching movies:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching movies',
        error: error.message
      });
    }
  }

  async getMovieById(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      const movie = await db.movie.findFirst({
        where: {
          id: parseInt(id),
          companyId
        },
        include: {
          sessions: {
            where: {
              companyId
            },
            orderBy: {
              startTime: 'asc'
            }
          }
        }
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      // Add computed fields
      const movieWithStats = {
        ...movie,
        total_sessions: movie.sessions.length,
        upcoming_sessions: movie.sessions.filter(session => new Date(session.startTime) > new Date()).length
      };

      res.json({
        success: true,
        data: movieWithStats
      });
    } catch (error) {
      console.error('Error fetching movie:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching movie',
        error: error.message
      });
    }
  }

  async searchMovies(req, res) {
    try {
      const { title } = req.query;
      const companyId = req.employee.companyId;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title query parameter is required'
        });
      }

      const movies = await db.movie.findMany({
        where: {
          companyId,
          title: {
            contains: title,
            mode: 'insensitive'
          }
        },
        include: {
          sessions: {
            where: {
              companyId
            },
            orderBy: {
              startTime: 'asc'
            }
          }
        },
        orderBy: {
          title: 'asc'
        }
      });

      // Add computed fields
      const moviesWithStats = movies.map(movie => ({
        ...movie,
        total_sessions: movie.sessions.length,
        upcoming_sessions: movie.sessions.filter(session => new Date(session.startTime) > new Date()).length
      }));

      res.json({
        success: true,
        data: moviesWithStats,
        count: moviesWithStats.length
      });
    } catch (error) {
      console.error('Error searching movies:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching movies',
        error: error.message
      });
    }
  }

  async createMovie(req, res) {
    try {
      const { error, value } = validateMovie(req.body);
      const companyId = req.employee.companyId;

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Check if movie with same title already exists for this company
      const existingMovie = await db.movie.findFirst({
        where: {
          companyId,
          title: value.title
        }
      });

      if (existingMovie) {
        return res.status(409).json({
          success: false,
          message: 'A movie with this title already exists in your company'
        });
      }

      const movie = await db.movie.create({
        data: {
          companyId,
          title: value.title,
          durationMin: value.duration_min,
          genre: value.genre,
          description: value.description,
          rating: value.rating,
          posterUrl: value.poster_url,
          isActive: value.is_active !== undefined ? value.is_active : true
        }
      });

      res.status(201).json({
        success: true,
        data: movie,
        message: 'Movie created successfully'
      });
    } catch (error) {
      console.error('Error creating movie:', error);

      res.status(500).json({
        success: false,
        message: 'Error creating movie',
        error: error.message
      });
    }
  }

  async updateMovie(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;
      const { error, value } = validateMovie(req.body, true); // partial validation

      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const movie = await db.movie.update({
        where: {
          companyId_id: {
            companyId,
            id: parseInt(id)
          }
        },
        data: value
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      res.json({
        success: true,
        data: movie,
        message: 'Movie updated successfully'
      });
    } catch (error) {
      console.error('Error updating movie:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating movie',
        error: error.message
      });
    }
  }

  async deleteMovie(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;
      const { hard_delete } = req.query;

      let movie;
      if (hard_delete === 'true') {
        movie = await db.movie.delete({
          where: {
            companyId_id: {
              companyId,
              id: parseInt(id)
            }
          }
        });
      } else {
        movie = await db.movie.update({
          where: {
            companyId_id: {
              companyId,
              id: parseInt(id)
            }
          },
          data: { isActive: false }
        });
      }

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      res.json({
        success: true,
        data: movie,
        message: hard_delete === 'true' ? 'Movie permanently deleted' : 'Movie deactivated successfully'
      });
    } catch (error) {
      console.error('Error deleting movie:', error);

      if (error.message.includes('existing sessions')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deleting movie',
        error: error.message
      });
    }
  }

  async activateMovie(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      const movie = await db.movie.update({
        where: {
          companyId_id: {
            companyId,
            id: parseInt(id)
          }
        },
        data: { isActive: true }
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      res.json({
        success: true,
        data: movie,
        message: 'Movie activated successfully'
      });
    } catch (error) {
      console.error('Error activating movie:', error);
      res.status(500).json({
        success: false,
        message: 'Error activating movie',
        error: error.message
      });
    }
  }

  async getMovieStats(req, res) {
    try {
      const { id } = req.params;
      const companyId = req.employee.companyId;

      const movie = await db.movie.findUnique({
        where: {
          companyId_id: {
            companyId,
            id: parseInt(id)
          }
        },
        include: {
          sessions: {
            where: { companyId },
            include: {
              tickets: true
            }
          }
        }
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      const stats = {
        movieId: movie.id,
        title: movie.title,
        totalSessions: movie.sessions.length,
        totalTicketsSold: movie.sessions.reduce((sum, session) => sum + session.tickets.length, 0),
        totalRevenue: movie.sessions.reduce((sum, session) =>
          sum + session.tickets.reduce((ticketSum, ticket) => ticketSum + parseFloat(ticket.price), 0), 0
        ),
        upcomingSessions: movie.sessions.filter(s => new Date(s.startTime) > new Date()).length
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching movie stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching movie statistics',
        error: error.message
      });
    }
  }
}

module.exports = new MovieController();