import { FullConfig } from '@playwright/test';

/**
 * Global setup function that runs before all tests
 * Sets up the activeGameSystem in localStorage
 */
async function globalSetup(config: FullConfig) {}
// Use the first project's baseURL or fall back to localhost:8080
export default globalSetup;
