import { Application } from 'express';
import { createApp } from '../src/app.mjs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach } from 'vitest';

/**
 * Test utilities for the Express server tests
 */

// Shared app instance for tests
let app: Application;

/**
 * Set up the Express app for testing
 */
export const setupTestApp = async () => {
  if (!app) {
    app = await createApp();
  }
  return app;
};

/**
 * Create a supertest agent with the app
 */
export const getTestAgent = async () => {
  const app = await setupTestApp();
  return request(app);
};

/**
 * Set up test hooks for Vitest
 */
export const setupTestHooks = () => {
  let testApp: Application;

  beforeAll(async () => {
    testApp = await setupTestApp();
  });

  beforeEach(() => {
    // Add any test initialization here
  });

  afterAll(() => {
    // Add any cleanup here
  });

  return { getTestApp: () => testApp };
}; 