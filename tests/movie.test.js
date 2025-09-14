const request = require('supertest');
const app = require('../src/server');
const Movie = require('../src/models/Movie');

describe('Movie CRUD Operations', () => {
  let testMovieId;
  
  // Test data
  const validMovieData = {
    title: 'Test Movie',
    duration_min: 120,
    genre: 'Action',
    description: 'A test movie for unit testing',
    rating: 'PG-13',
    poster_url: 'https://example.com/poster.jpg'
  };

  const updateMovieData = {
    title: 'Updated Test Movie',
    duration_min: 135,
    genre: 'Action/Adventure',
    description: 'An updated test movie',
    rating: 'R'
  };

  beforeAll(async () => {
    // Ensure we have a clean test environment
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up test data
    if (testMovieId) {
      try {
        await Movie.hardDelete(testMovieId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('POST /api/movies', () => {
    test('should create a new movie with valid data', async () => {
      const response = await request(app)
        .post('/api/movies')
        .send(validMovieData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Movie created successfully'
      });

      expect(response.body.data).toMatchObject({
        title: validMovieData.title,
        duration_min: validMovieData.duration_min,
        genre: validMovieData.genre,
        description: validMovieData.description,
        rating: validMovieData.rating,
        poster_url: validMovieData.poster_url,
        is_active: true
      });

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');

      testMovieId = response.body.data.id;
    });

    test('should return 400 for missing required fields', async () => {
      const invalidData = {
        duration_min: 120
        // Missing title
      };

      const response = await request(app)
        .post('/api/movies')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
      expect(response.body.errors).toBeDefined();
    });

    test('should return 400 for invalid duration', async () => {
      const invalidData = {
        title: 'Invalid Movie',
        duration_min: -10 // Invalid negative duration
      };

      const response = await request(app)
        .post('/api/movies')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });

    test('should return 400 for invalid rating', async () => {
      const invalidData = {
        title: 'Invalid Rating Movie',
        duration_min: 120,
        rating: 'INVALID_RATING'
      };

      const response = await request(app)
        .post('/api/movies')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });

    test('should return 400 for invalid poster URL', async () => {
      const invalidData = {
        title: 'Invalid URL Movie',
        duration_min: 120,
        poster_url: 'not-a-valid-url'
      };

      const response = await request(app)
        .post('/api/movies')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });
  });

  describe('GET /api/movies', () => {
    test('should get all movies', async () => {
      const response = await request(app)
        .get('/api/movies')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });
      expect(response.body.data).toBeDefined();
      expect(response.body.count).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Find our test movie
      const testMovie = response.body.data.find(movie => movie.id === testMovieId);
      expect(testMovie).toBeDefined();
      expect(testMovie.title).toBe(validMovieData.title);
    });

    test('should filter movies by active status', async () => {
      const response = await request(app)
        .get('/api/movies?is_active=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(movie => movie.is_active === true)).toBe(true);
    });

    test('should filter movies by genre', async () => {
      const response = await request(app)
        .get('/api/movies?genre=Action')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should filter movies by title', async () => {
      const response = await request(app)
        .get('/api/movies?title=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some(movie => movie.title.includes('Test'))).toBe(true);
    });
  });

  describe('GET /api/movies/:id', () => {
    test('should get movie by ID', async () => {
      const response = await request(app)
        .get(`/api/movies/${testMovieId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });
      expect(response.body.data).toMatchObject({
        id: testMovieId,
        title: validMovieData.title,
        duration_min: validMovieData.duration_min,
        genre: validMovieData.genre,
        description: validMovieData.description,
        rating: validMovieData.rating,
        poster_url: validMovieData.poster_url
      });
      expect(response.body.data).toHaveProperty('total_sessions');
      expect(response.body.data).toHaveProperty('upcoming_sessions');
    });

    test('should return 404 for non-existent movie', async () => {
      const response = await request(app)
        .get('/api/movies/99999')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Movie not found'
      });
    });
  });

  describe('GET /api/movies/search', () => {
    test('should search movies by title', async () => {
      const response = await request(app)
        .get('/api/movies/search?title=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.count).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should return 400 when title parameter is missing', async () => {
      const response = await request(app)
        .get('/api/movies/search')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Title query parameter is required'
      });
    });

    test('should return empty array for non-matching title', async () => {
      const response = await request(app)
        .get('/api/movies/search?title=NonExistentMovie12345')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PUT /api/movies/:id', () => {
    test('should update movie with valid data', async () => {
      const response = await request(app)
        .put(`/api/movies/${testMovieId}`)
        .send(updateMovieData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Movie updated successfully'
      });
      expect(response.body.data).toMatchObject({
        id: testMovieId,
        title: updateMovieData.title,
        duration_min: updateMovieData.duration_min,
        genre: updateMovieData.genre,
        description: updateMovieData.description,
        rating: updateMovieData.rating
      });
    });

    test('should update only specific fields', async () => {
      const partialUpdate = {
        title: 'Partially Updated Movie'
      };

      const response = await request(app)
        .put(`/api/movies/${testMovieId}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(partialUpdate.title);
      // Other fields should remain unchanged
      expect(response.body.data.duration_min).toBe(updateMovieData.duration_min);
    });

    test('should return 404 for non-existent movie', async () => {
      const response = await request(app)
        .put('/api/movies/99999')
        .send(updateMovieData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Movie not found'
      });
    });

    test('should return 400 for invalid data', async () => {
      const invalidUpdate = {
        duration_min: -5
      };

      const response = await request(app)
        .put(`/api/movies/${testMovieId}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });
  });

  describe('GET /api/movies/:id/stats', () => {
    test('should get movie statistics', async () => {
      const response = await request(app)
        .get(`/api/movies/${testMovieId}/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: 'Partially Updated Movie',
        genre: updateMovieData.genre
      });
      
      // PostgreSQL COUNT returns string, so check for string numbers
      expect(typeof response.body.data.total_sessions).toBe('string');
      expect(typeof response.body.data.completed_sessions).toBe('string');
      expect(typeof response.body.data.total_tickets_sold).toBe('string');
      expect(typeof response.body.data.total_revenue).toBe('string');
    });

    test('should return 404 for non-existent movie stats', async () => {
      const response = await request(app)
        .get('/api/movies/99999/stats')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Movie not found'
      });
    });
  });

  describe('PATCH /api/movies/:id/activate', () => {
    test('should activate a movie', async () => {
      // First deactivate the movie
      await request(app)
        .put(`/api/movies/${testMovieId}`)
        .send({ is_active: false });

      // Then activate it
      const response = await request(app)
        .patch(`/api/movies/${testMovieId}/activate`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Movie activated successfully'
      });
      expect(response.body.data.is_active).toBe(true);
    });

    test('should return 404 for non-existent movie activation', async () => {
      const response = await request(app)
        .patch('/api/movies/99999/activate')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Movie not found'
      });
    });
  });

  describe('DELETE /api/movies/:id', () => {
    test('should soft delete movie by default', async () => {
      const response = await request(app)
        .delete(`/api/movies/${testMovieId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Movie deactivated successfully'
      });
      expect(response.body.data.is_active).toBe(false);

      // Verify movie still exists but is inactive
      const getResponse = await request(app)
        .get(`/api/movies/${testMovieId}`)
        .expect(200);
      
      expect(getResponse.body.data.is_active).toBe(false);
    });

    test('should hard delete movie when specified', async () => {
      const response = await request(app)
        .delete(`/api/movies/${testMovieId}?hard_delete=true`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Movie permanently deleted'
      });

      // Verify movie no longer exists
      await request(app)
        .get(`/api/movies/${testMovieId}`)
        .expect(404);

      testMovieId = null; // Clear the ID since movie is deleted
    });

    test('should return 404 for non-existent movie deletion', async () => {
      const response = await request(app)
        .delete('/api/movies/99999')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Movie not found'
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll just ensure the endpoint exists and handles errors
      const response = await request(app)
        .get('/api/movies/invalid-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error');
    });

    test('should validate all rating enum values', async () => {
      const validRatings = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'];
      
      for (const rating of validRatings) {
        const movieData = {
          title: `Test Movie ${rating}`,
          duration_min: 120,
          rating: rating
        };

        const response = await request(app)
          .post('/api/movies')
          .send(movieData);

        if (response.status === 201) {
          // Clean up created movie
          await Movie.hardDelete(response.body.data.id);
        }
        
        expect([201, 409]).toContain(response.status); // 201 created or 409 if title exists
      }
    });

    test('should handle very long movie descriptions', async () => {
      const longDescription = 'A'.repeat(10000); // Very long description
      const movieData = {
        title: 'Long Description Movie',
        duration_min: 120,
        description: longDescription
      };

      const response = await request(app)
        .post('/api/movies')
        .send(movieData)
        .expect(201);

      expect(response.body.data.description).toBe(longDescription);
      
      // Clean up
      await Movie.hardDelete(response.body.data.id);
    });
  });
});