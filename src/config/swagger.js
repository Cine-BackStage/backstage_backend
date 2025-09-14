const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cinema Management API',
      version: '1.0.0',
      description: 'A comprehensive API for managing cinema operations including movies, sessions, rooms, and inventory',
      contact: {
        name: 'Cinema Management Team',
        email: 'support@cinemamanagement.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Movie: {
          type: 'object',
          required: ['title', 'duration_min', 'genre'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the movie',
              example: 1
            },
            title: {
              type: 'string',
              description: 'Movie title',
              example: 'Avatar: The Way of Water'
            },
            duration_min: {
              type: 'integer',
              description: 'Movie duration in minutes',
              example: 192
            },
            genre: {
              type: 'string',
              description: 'Movie genre',
              example: 'Sci-Fi'
            },
            description: {
              type: 'string',
              description: 'Movie description',
              example: 'Jake Sully and Ney\'tiri have formed a family and are doing everything to stay together...'
            },
            rating: {
              type: 'string',
              description: 'Movie rating',
              example: 'PG-13'
            },
            poster_url: {
              type: 'string',
              description: 'URL to movie poster image',
              example: 'https://example.com/posters/avatar2.jpg'
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the movie is currently active',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Movie creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Movie last update timestamp'
            }
          }
        },
        MovieInput: {
          type: 'object',
          required: ['title', 'duration_min', 'genre'],
          properties: {
            title: {
              type: 'string',
              description: 'Movie title',
              example: 'Avatar: The Way of Water'
            },
            duration_min: {
              type: 'integer',
              description: 'Movie duration in minutes',
              example: 192
            },
            genre: {
              type: 'string',
              description: 'Movie genre',
              example: 'Sci-Fi'
            },
            description: {
              type: 'string',
              description: 'Movie description',
              example: 'Jake Sully and Ney\'tiri have formed a family and are doing everything to stay together...'
            },
            rating: {
              type: 'string',
              description: 'Movie rating',
              example: 'PG-13'
            },
            poster_url: {
              type: 'string',
              description: 'URL to movie poster image',
              example: 'https://example.com/posters/avatar2.jpg'
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the movie is currently active',
              example: true
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Validation error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field that failed validation'
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi
};