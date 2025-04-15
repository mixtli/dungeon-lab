import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { getTestAgent } from '../test-utils.mjs';
import { requestAs, clearAuthCache } from '../utils/auth-test-helpers.mjs';
import { TEST_USERS, createTestUsers, cleanupTestUsers } from '../utils/testUsers.mjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Authentication API', () => {
  let agent: any; // Using any to bypass type issues with superagent
  let testUsers: any;
  let mongoServer: MongoMemoryServer;
  
  // Setup before all tests
  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    agent = await getTestAgent();
    testUsers = await createTestUsers();
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await cleanupTestUsers();
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  // Reset before each test
  beforeEach(async () => {
    // Clear collections but keep connection
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    
    testUsers = await createTestUsers();
    // Clear auth cache between tests to ensure clean state
    clearAuthCache();
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const userData = TEST_USERS.user;
      
      const response = await agent
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      
      // Check that session cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain('connect.sid');
    });

    test('should return 401 with invalid credentials', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.user.email,
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBeFalsy();
      expect(response.body.error.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user profile when authenticated', async () => {
      // Use the new requestAs API with the user key from TEST_USERS
      const userAgent = await requestAs('user');
      
      // Make request - the cookie is automatically attached
      const response = await userAgent.get('/api/auth/me');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.data.username).toBe(TEST_USERS.user.username);
      expect(response.body.data.email).toBe(TEST_USERS.user.email);
    });

    test('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/auth/me');
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Unauthorized' });
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should successfully logout', async () => {
      // Get an authenticated agent
      const userAgent = await requestAs('user');
      
      // Logout
      const logoutResponse = await userAgent.post('/api/auth/logout');
      expect(logoutResponse.status).toBe(200);
      
      // Clear the cache to ensure we don't use the old cookie
      clearAuthCache('user');
      
      // Try to access protected endpoint using userAgent
      // After logout, the session cookie should be cleared
      const meResponse = await userAgent.get('/api/auth/me');
      expect(meResponse.status).toBe(401);
    });
  });
}); 