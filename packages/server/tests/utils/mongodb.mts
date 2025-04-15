import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../../src/models/user.model.mjs';

// Define a simplified user interface for our tests 
interface ITestUser {
  _id?: string;
  id?: string;
  username: string;
  email: string;
  password?: string;
  isAdmin: boolean;
  displayName?: string;
}

let mongod: MongoMemoryServer;

/**
 * Connect to the in-memory database.
 */
export const connect = async (): Promise<void> => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  await mongoose.connect(uri);
};

/**
 * Disconnect from the in-memory database.
 */
export const closeDatabase = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

/**
 * Clear all data in the database
 */
export const clearDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

/**
 * Seed users for testing
 */
export const seedUsers = async (): Promise<{
  admin: ITestUser;
  user: ITestUser;
  gamemaster: ITestUser;
}> => {
  // Create test users
  const admin = await UserModel.create({
    username: 'admin',
    email: 'admin@example.com',
    password: 'password123',
    isAdmin: true,
    displayName: 'Admin User'
  });

  const user = await UserModel.create({
    username: 'testuser',
    email: 'user@example.com',
    password: 'password123',
    isAdmin: false,
    displayName: 'Regular User'
  });

  const gamemaster = await UserModel.create({
    username: 'gamemaster',
    email: 'gm@example.com',
    password: 'password123',
    isAdmin: false,
    displayName: 'Game Master'
  });

  return { 
    admin: admin.toObject(), 
    user: user.toObject(), 
    gamemaster: gamemaster.toObject() 
  };
}; 