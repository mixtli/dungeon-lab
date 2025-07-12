import './utils/setup_debug_logging.js';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { createApp } from './app.mjs';
import { config } from './config/index.mjs';
import { configurePassport } from './config/passport.mjs';
import { pluginRegistry } from './services/plugin-registry.service.mjs';
import { backgroundJobService } from './services/background-job.service.mjs';
import { initializeJobs } from './jobs/index.mjs';
import { logger } from './utils/logger.mjs';
import { SocketServer } from './websocket/socket-server.mjs';

console.log('Starting server...');

// Debug environment variables
console.log('Environment Variables:');
console.log('PORT:', process.env.PORT);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const PORT = process.env.PORT || 3000;

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

    // Configure Passport
    configurePassport();
    console.log('Passport configured');

    // Create and configure Express app
    const app = await createApp();

    // Initialize plugins
    await pluginRegistry.initialize();

    // Initialize background job service
    await backgroundJobService.initialize();
    logger.info('Background job service initialized');

    // Initialize and register background jobs
    await initializeJobs();

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
      await backgroundJobService.shutdown();
      await pluginRegistry.cleanupAll();
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
