import './utils/setup_debug_logging.js';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { createApp } from './app.mjs';
import { config } from './config/index.mjs';
import { configurePassport } from './config/passport.mjs';
import { backgroundJobService } from './services/background-job.service.mjs';
import { initializeJobs } from './jobs/index.mjs';
import { logger } from './utils/logger.mjs';
import { SocketServer } from './websocket/socket-server.mjs';
import { periodicSyncService } from './features/campaigns/services/periodic-sync.service.mjs';
import { botManager } from './features/chatbots/routes.mjs';

console.log('Starting server...');

// Debug environment variables
console.log('Environment Variables:');
console.log('PORT:', process.env.PORT);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const PORT = process.env.PORT || 3000;

/**
 * Ensure MongoDB is fully ready for operations with retries
 */
async function waitForMongoReady(): Promise<void> {
  const maxRetries = 10;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Simple ping to ensure database is responsive
      await mongoose.connection.db?.admin().ping();
      console.log('MongoDB is ready for operations');
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`MongoDB readiness check attempt ${attempt}/${maxRetries} failed:`, errorMessage);
      
      if (attempt === maxRetries) {
        throw new Error(`MongoDB not ready after ${maxRetries} attempts`);
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function startServer() {
  try {
    // Debug environment variables
    console.log('=== Server Configuration ===');
    console.log('PORT:', config.port);
    console.log('CLIENT_URL:', config.clientUrl);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('==========================');

    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Wait for MongoDB to be fully ready for operations
    await waitForMongoReady();

    // Initialize bot manager now that MongoDB is ready
    try {
      await botManager.initialize();
      logger.info('Bot Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Bot Manager:', error);
      // Continue server startup even if bot manager fails
    }

    // Configure Passport
    configurePassport();
    console.log('Passport configured');

    // Create and configure Express app
    const app = await createApp();


    // Initialize background job service (also waits for MongoDB to be ready)
    try {
      await backgroundJobService.initialize();
      logger.info('Background job service initialized');
    } catch (error) {
      logger.error('Failed to initialize background job service:', error);
      // Continue server startup even if background jobs fail
    }

    // Initialize and register background jobs
    await initializeJobs();

    // Start periodic game state sync service
    periodicSyncService.start(1000 * 60 * 15); // Sync every 15 minutes
    logger.info('Periodic sync service started');

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO server
    const socketServer = new SocketServer(httpServer);
    console.log('Socket.IO server initialized');

    // Start listening
    httpServer.listen(
      { port: PORT, host: '0.0.0.0' },
      () => {
        logger.info(`Server is running on port ${PORT}`);
      }
    );

    // Handle shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down...');
      periodicSyncService.stop();
      logger.info('Periodic sync service stopped');
      await backgroundJobService.shutdown();
      await mongoose.disconnect();
      socketServer.close();
      console.log('Socket.IO server closed');
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
