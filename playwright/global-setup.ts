import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

// Define the storage state path for reuse
export const STORAGE_STATE = path.join(__dirname, '.auth/storage-state.json');

/**
 * Global setup function that runs before all tests
 * Sets up the activeGameSystem in localStorage
 */
async function globalSetup(config: FullConfig) {
  // Use the first project's baseURL or fall back to localhost:8080
  const { baseURL = 'http://localhost:8080' } = config.projects[0].use;
  
  // Launch a browser
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to the application
  console.log(`Hi. Navigating to ${baseURL} to set localStorage...`);
  await page.goto(baseURL);
  console.log('Navigated to baseURL');

  await page.getByRole('button', { name: 'Login' }).nth(1).click();
  console.log('Clicked Login button');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('admin@dungeonlab.com');
  await page.getByRole('textbox', { name: 'Email' }).press('Tab');
  console.log('Filled Email');
  await page.getByRole('textbox', { name: 'Password' }).fill('password');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  console.log('Login successful');
  await page.screenshot({ path: 'screenshot.png' });
  await page.locator('form').getByRole('button', { name: 'Login' }).click();
  
  // Set the activeGameSystem in localStorage
//   await page.evaluate(() => {
//     localStorage.setItem('activeGameSystem', 'dnd-5e-2024');
//     console.log('Set activeGameSystem to dnd-5e-2024 in localStorage');
//   });
  
  // Save the storage state to a file
  // This makes cookies and localStorage available to all tests
  await page.context().storageState({ path: STORAGE_STATE });
  
  // Close everything
  await browser.close();
  
  console.log(`Global setup complete. Storage state saved to ${STORAGE_STATE}`);
}

export default globalSetup; 