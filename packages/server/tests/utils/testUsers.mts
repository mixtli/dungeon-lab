import { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserModel } from '../../src/models/user.model.mjs';

// Define test user data
export const TEST_USERS = {
  admin: {
    _id: new Types.ObjectId().toString(),
    email: 'admin@dungeonlab.com',
    username: 'admin',
    password: 'password',
    name: 'Admin User',
    role: 'admin'
  },
  user: {
    _id: new Types.ObjectId().toString(),
    email: 'user@dungeonlab.com',
    username: 'user',
    password: 'password',
    name: 'Regular User',
    role: 'user'
  },
  gm: {
    _id: new Types.ObjectId().toString(),
    email: 'gm@dungeonlab.com',
    username: 'gamemaster',
    password: 'password',
    name: 'Game Master',
    role: 'game_master'
  }
};

/**
 * Create test users in the database
 */
export async function createTestUsers() {
  const saltRounds = 10;
  const createdUsers: Record<string, any> = {};
  
  for (const [key, userData] of Object.entries(TEST_USERS)) {
    // Hash the password for storage
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    // Create a user with the original ObjectId
    const user = await UserModel.create({
      ...userData,
      _id: new Types.ObjectId(userData._id),
      password: hashedPassword
    });
    
    createdUsers[key] = user;
  }
  
  return createdUsers;
}

/**
 * Clean up test users from the database
 */
export async function cleanupTestUsers() {
  const ids = Object.values(TEST_USERS).map(user => user._id);
  await UserModel.deleteMany({ _id: { $in: ids } });
} 