import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { createServer } from 'http';
import { config } from './config/index.mjs';
import { configurePassport } from './config/passport.mjs';
import { createApp } from './app.mjs';
import { createSocketServer } from './websocket/socket-server.mjs';
import { logger } from './utils/logger.mjs';
import { pluginRegistry } from './services/plugin-registry.service.mjs';

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

    // Create HTTP server
    const httpServer = createServer(app);

    // Create WebSocket server
    const io = createSocketServer(httpServer);

    // Start listening
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // Handle shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down...');
      await pluginRegistry.cleanupAll();
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