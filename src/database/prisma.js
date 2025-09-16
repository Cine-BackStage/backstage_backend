const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'minimal',
    });

    // Middleware for logging query performance
    this.prisma.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();

      console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
      return result;
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Connected to database via Prisma');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('📤 Disconnected from database');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
    }
  }

  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }

  // Graceful shutdown handling
  handleShutdown() {
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      await this.disconnect();
      process.exit(0);
    });
  }

  // Getter for Prisma client
  get client() {
    return this.prisma;
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = {
  db: databaseService.client,
  databaseService,
};