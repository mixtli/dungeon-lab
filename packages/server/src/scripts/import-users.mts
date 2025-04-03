import mongoose from 'mongoose';
import { config } from '../config/index.mjs';
import { UserModel } from '../models/user.model.mjs';
import { logger } from '../utils/logger.mjs';

const users = [
  {
    username: 'admin',
    email: 'admin@dungeonlab.com',
    password: 'password',
    displayName: 'Admin',
    isAdmin: true,
  }
]

async function createUser(userData: typeof users[number]) {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');

    // Check if admin user already exists
    const existingUser = await UserModel.findOne({ email: userData.email });
    if (existingUser) {
      logger.info('User already exists');
      process.exit(0);
    }

    // Create user
    const user = await UserModel.create({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
      isAdmin: true,
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: true
      }
    });

    logger.info('User created successfully:', {
      id: user.id,
      username: user.username,
      email: user.email
    });

    process.exit(0);
  } catch (error) {
    logger.error('Error creating admin user:', error);
    process.exit(1);
  }
}

users.forEach(createUser);