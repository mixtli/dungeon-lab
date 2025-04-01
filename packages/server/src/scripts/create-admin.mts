import mongoose from 'mongoose';
import { config } from '../../src/config/index.mjs';
import { UserModel } from '../../src/models/user.model.mjs';
import { logger } from '../../src/utils/logger.mjs';

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await UserModel.findOne({ email: 'admin@dungeonlab.com' });
    if (existingAdmin) {
      logger.info('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = await UserModel.create({
      username: 'admin',
      email: 'admin@dungeonlab.com',
      password: 'password',
      displayName: 'Admin',
      isAdmin: true,
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: true
      }
    });

    logger.info('Admin user created successfully:', {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email
    });

    process.exit(0);
  } catch (error) {
    logger.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser(); 