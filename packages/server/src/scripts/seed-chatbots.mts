#!/usr/bin/env node

import mongoose from 'mongoose';
import { config } from '../config/index.mjs';
import { seedDefaultChatbots } from '../features/chatbots/seed.mjs';
import { logger } from '../utils/logger.mjs';

/**
 * Seed chatbots script
 */
async function main() {
  try {
    logger.info('Starting chatbot seeding process...');
    
    // Connect to database
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');
    
    // Run seed function
    await seedDefaultChatbots();
    
    logger.info('Chatbot seeding completed successfully!');
    
    // Disconnect from database
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed chatbots:', error);
    process.exit(1);
  }
}

// Run the script
main(); 