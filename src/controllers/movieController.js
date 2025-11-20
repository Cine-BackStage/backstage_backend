const { db } = require('../database/prisma');
const { validateMovie } = require('../utils/validation');

class MovieController {
  async getAllMovies(req, res) {
    try {
      const companyId = req.employee.companyId; // Get from authenticated employee

      const where = {
        companyId, // Add tenant scoping
        deletedAt: null // Exclude soft-deleted movies
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
              deletedAt: null, // Exclude soft-deleted sessions
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
          id,
          companyId,
          deletedAt: null
        },
        include: {
          sessions: {
            where: {
              companyId,
              deletedAt: null
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
          deletedAt: null,
          title: {
            contains: title,
            mode: 'insensitive'
          }
        },
        include: {
          sessions: {
            where: {
              companyId,
              deletedAt: null
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
          releaseDate: value.release_date,
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

      // Map snake_case validation fields to camelCase Prisma fields
      const updateData = {};
      if (value.title !== undefined) updateData.title = value.title;
      if (value.duration_min !== undefined) updateData.durationMin = value.duration_min;
      if (value.genre !== undefined) updateData.genre = value.genre;
      if (value.description !== undefined) updateData.description = value.description;
      if (value.rating !== undefined) updateData.rating = value.rating;
      if (value.poster_url !== undefined) updateData.posterUrl = value.poster_url;
      if (value.release_date !== undefined) updateData.releaseDate = value.release_date;
      if (value.is_active !== undefined) updateData.isActive = value.is_active;

      // First verify the movie belongs to this company
      const existingMovie = await db.movie.findUnique({
        where: { id },
        select: { companyId: true }
      });

      if (!existingMovie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      if (existingMovie.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this movie'
        });
      }

      const movie = await db.movie.update({
        where: { id },
        data: updateData
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

      // Check if movie exists
      const movie = await db.movie.findUnique({
        where: {
          id
        },
        include: {
          sessions: {
            where: {
              companyId,
              deletedAt: null
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

      // Soft delete the movie
      const now = new Date();
      const updatedMovie = await db.movie.update({
        where: {
          id
        },
        data: {
          deletedAt: now,
          isActive: false
        }
      });

      // Cascade soft delete to all associated sessions
      if (movie.sessions.length > 0) {
        await db.session.updateMany({
          where: {
            movieId: id,
            companyId,
            deletedAt: null
          },
          data: {
            deletedAt: now,
            status: 'CANCELED'
          }
        });
      }

      res.json({
        success: true,
        data: updatedMovie,
        message: `Movie soft deleted successfully. ${movie.sessions.length} associated session(s) also soft deleted.`,
        cascadeInfo: {
          deletedSessions: movie.sessions.length
        }
      });
    } catch (error) {
      console.error('Error deleting movie:', error);

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

      // First verify the movie belongs to this company
      const existingMovie = await db.movie.findUnique({
        where: { id },
        select: { companyId: true }
      });

      if (!existingMovie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      if (existingMovie.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to activate this movie'
        });
      }

      const movie = await db.movie.update({
        where: { id },
        data: { isActive: true }
      });

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
          id
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

  async getMovieHistory(req, res) {
    try {
      const companyId = req.employee.companyId;

      const deletedMovies = await db.movie.findMany({
        where: {
          companyId,
          deletedAt: {
            not: null
          }
        },
        include: {
          sessions: {
            where: {
              companyId,
              deletedAt: {
                not: null
              }
            },
            orderBy: {
              startTime: 'asc'
            }
          }
        },
        orderBy: {
          deletedAt: 'desc'
        }
      });

      const moviesWithStats = deletedMovies.map(movie => ({
        ...movie,
        total_sessions: movie.sessions.length,
        upcoming_sessions: 0
      }));

      res.json({
        success: true,
        data: moviesWithStats,
        count: moviesWithStats.length,
        message: 'Deleted movies history retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching movie history:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching movie history',
        error: error.message
      });
    }
  }
}

module.exports = new MovieController();