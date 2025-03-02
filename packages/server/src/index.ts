import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';

// Debug environment variables
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('Current working directory:', process.cwd());

import { config } from './config/index.js';
import { configurePassport } from './config/passport.js';
import { createApp } from './app.js';
console.log(config)

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

    // Start server
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  console.error('Unhandled server startup error:', error);
  process.exit(1);
}); 