import path from 'path';
import { defineConfig, devices } from '@playwright/test';
export const STORAGE_STATE = path.join(__dirname, 'playwright/.auth/storage-state.json');

export default defineConfig({
  testDir: './playwright/tests',
  //fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  //reporter: 'html',
  // Global setup that runs before all tests
  //globalSetup: './playwright/global-setup',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Use the storage state from global setup
  },
  projects: [
     {
       name: 'setup',
       use: { ...devices['Desktop Chrome'] },
       testMatch: /spec-setup\.ts/,
     },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
       testMatch: /.*spec\.ts/,
      dependencies: ['setup'],
    },
  ],
}); 