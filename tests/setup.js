// Jest setup file for test environment configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002'; // Use port 3002 for tests to avoid conflicts
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'cinema_management';
process.env.DB_USER = 'cinema_user';
process.env.DB_PASSWORD = 'cinema_pass';

// Increase timeout for database operations
jest.setTimeout(30000);