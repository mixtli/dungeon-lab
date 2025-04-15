import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestAgent } from '../test-utils.mjs';
import * as mongodbMemory from '../utils/mongodb.mjs';

describe('Authentication API', () => {
  let agent: any; // Using any to bypass type issues with superagent
  let testUsers: any;
  
  // Setup before all tests
  beforeAll(async () => {
    await mongodbMemory.connect();
    agent = await getTestAgent();
    testUsers = await mongodbMemory.seedUsers();
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await mongodbMemory.closeDatabase();
  });
  
  // Reset before each test
  beforeEach(async () => {
    await mongodbMemory.clearDatabase();
    testUsers = await mongodbMemory.seedUsers();
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.email).toBe('user@example.com');
      
      // Check that session cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookie = response.headers['set-cookie'][0];
      expect(cookie).toContain('connect.sid');
    });

    test('should return 401 with invalid credentials', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBeFalsy();
      expect(response.body.error.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user profile when authenticated', async () => {
      // First login to get a cookie
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123'
        });
      
      // Get the cookie from the login response
      const cookie = loginResponse.headers['set-cookie'];
      
      // Use the cookie to access the /me endpoint
      const response = await agent
        .get('/api/auth/me')
        .set('Cookie', cookie);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.email).toBe('user@example.com');
    });

    test('should return 401 when not authenticated', async () => {
      const response = await agent.get('/api/auth/me');
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Unauthorized' });
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should successfully logout', async () => {
      // First login to get a cookie
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123'
        });
      
      // Get the cookie from the login response
      const cookie = loginResponse.headers['set-cookie'];
      
      // Use the cookie to logout
      const logoutResponse = await agent
        .post('/api/auth/logout')
        .set('Cookie', cookie);
      
      expect(logoutResponse.status).toBe(200);
      
      // Verify that the me endpoint returns 401 after logout
      const meResponse = await agent
        .get('/api/auth/me')
        .set('Cookie', cookie);
      
      expect(meResponse.status).toBe(401);
    });
  });
}); 