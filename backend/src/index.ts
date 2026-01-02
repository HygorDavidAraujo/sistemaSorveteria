import dotenv from 'dotenv';
import { createApp } from './app';
import logger from '@shared/utils/logger';
import prisma from '@infrastructure/database/prisma-client';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✓ Database connected successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║         🍦  GELATINI API SERVER                  ║
║                                                   ║
║  Environment: ${NODE_ENV.padEnd(38)} ║
║  Port: ${String(PORT).padEnd(43)} ║
║  API: http://localhost:${PORT}${process.env.API_PREFIX || '/api/v1'}       ║
║                                                   ║
║  Status: RUNNING ✓                                ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Database connection closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        logger.info('Database connection closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
