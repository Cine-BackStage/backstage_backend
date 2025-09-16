const MoviePrisma = require('../models/MoviePrisma');
const { validateMovie } = require('../utils/validation');

class MovieController {
  async getAllMovies(req, res) {
    try {
      const filters = {
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        genre: req.query.genre,
        title: req.query.title
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const movies = await MoviePrisma.findAll(filters);
      res.json({
        success: true,
        data: movies,
        count: movies.length
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
      const movie = await MoviePrisma.findById(id);
      
      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      res.json({
        success: true,
        data: movie
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
      
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title query parameter is required'
        });
      }

      const movies = await MoviePrisma.findByTitle(title);
      res.json({
        success: true,
        data: movies,
        count: movies.length
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
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const movie = await MoviePrisma.create(value);
      res.status(201).json({
        success: true,
        data: movie,
        message: 'Movie created successfully'
      });
    } catch (error) {
      console.error('Error creating movie:', error);
      
      // Handle duplicate title error
      if (error.code === '23505' && error.constraint === 'movie_title_unique') {
        return res.status(409).json({
          success: false,
          message: 'A movie with this title already exists'
        });
      }

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
      const { error, value } = validateMovie(req.body, true); // partial validation
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const movie = await MoviePrisma.update(id, value);
      
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
      const { hard_delete } = req.query;

      let movie;
      if (hard_delete === 'true') {
        movie = await MoviePrisma.hardDelete(id);
      } else {
        movie = await MoviePrisma.delete(id); // Soft delete
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
      const movie = await MoviePrisma.activate(id);
      
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
      const stats = await MoviePrisma.getMovieStats(id);
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

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