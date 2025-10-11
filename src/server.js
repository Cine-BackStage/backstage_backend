const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { specs, swaggerUi } = require('./config/swagger');
const { databaseService } = require('./database/prisma');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware - completely disable CSP for development
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Rate limiting
app.use(generalLimiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve swagger.json first
app.get('/api/docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Swagger documentation with Safari-compatible setup
app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', (req, res) => {
  res.send(
    swaggerUi.generateHTML(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Cinema Management API Documentation',
      swaggerOptions: {
        url: '/api/docs/swagger.json',
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        tryItOutEnabled: true
      },
      customfavIcon: '/favicon.ico',
      customCssUrl: null
    })
  );
});

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cinema Management System API',
    version: '1.0.0',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      api: '/api',
      health: '/api/health',
      docs: '/api/docs',
      movies: '/api/movies',
      sessions: '/api/sessions',
      tickets: '/api/tickets',
      sales: '/api/sales'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await databaseService.health();

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      database: { status: 'unhealthy', error: error.message }
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Initialize Prisma connection and start server
const startServer = async () => {
  try {
    await databaseService.connect();
    databaseService.handleShutdown();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎬 Cinema Management API is running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
      console.log(`📋 API documentation at: http://localhost:${PORT}/api/docs`);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
const serverPromise = startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  const server = await serverPromise;
  server.close(async () => {
    await databaseService.disconnect();
    console.log('Process terminated');
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  const server = await serverPromise;
  server.close(async () => {
    await databaseService.disconnect();
    console.log('Process terminated');
  });
});

module.exports = app;