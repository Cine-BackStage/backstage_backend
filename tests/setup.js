// Jest setup file for test environment configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Use different port for tests
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'cinema_management';
process.env.DB_USER = 'cinema_user';
process.env.DB_PASSWORD = 'cinema_pass';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Wait for database to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
});

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup here if needed
});