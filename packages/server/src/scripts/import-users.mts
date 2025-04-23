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
    apiKey: '3c185b285d615ae21de877fcf31b46b8b903a48333525527d5be767c7ef68860'
  },
  {
    username: 'test1',
    email: 'test1@dungeonlab.com',
    password: 'password',
    displayName: 'Test User 1'
  },
  {
    username: 'test2',
    email: 'test2@dungeonlab.com',
    password: 'password',
    displayName: 'Test User 2'
  }
];

async function createUser(userData: (typeof users)[number]) {
  try {
    // Check if admin user already exists
    const existingUser = await UserModel.findOne({ email: userData.email });
    if (existingUser) {
      logger.info('User already exists');
      return;
    }

    // Create user
    const user = await UserModel.create({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
      apiKey: userData.apiKey,
      isAdmin: userData.isAdmin,
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
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

async function main() {
  // Connect to MongoDB
  await mongoose.connect(config.mongoUri);
  logger.info('Connected to MongoDB');

  for (const user of users) {
    await createUser(user);
  }

  // Disconnect from MongoDB
  await mongoose.disconnect();
  logger.info('Disconnected from MongoDB');
}

main();
