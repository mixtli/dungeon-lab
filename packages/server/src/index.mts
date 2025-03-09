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
import { PluginManager } from './services/plugin-manager.mjs';
import { pluginRegistry } from './services/plugin-registry.service.mjs';

// Debug environment variables
console.log('Environment Variables:');
console.log('PORT:', process.env.PORT);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

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

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize plugin registry
    await pluginRegistry.initialize();
    console.log('Plugin registry initialized');

    // Create plugin manager
    const pluginManager = new PluginManager();

    // Create and attach Socket.IO server
    const io = createSocketServer(httpServer, pluginManager);
    console.log('Socket.IO server initialized');

    // Start server
    const PORT = config.port;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 