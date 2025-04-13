import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config';

setup('setup', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  console.log('Navigated to baseURL');

  await page.getByRole('button', { name: 'Login' }).nth(1).click();
  console.log('Clicked Login button');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('admin@dungeonlab.com');
  await page.getByRole('textbox', { name: 'Email' }).press('Tab');
  console.log('Filled Email');
  await page.getByRole('textbox', { name: 'Password' }).fill('password');

  // Use a more specific selector for the login form button
  await page.locator('form').getByRole('button', { name: 'Login' }).click();

  // Wait for navigation to complete and authentication to be established
  // We need to wait for something that confirms we're logged in
  await page.waitForSelector('header:has-text("Menu")', { timeout: 10000 });

  // Additional verification that we're logged in
  const isLoggedIn = await page.evaluate(() => {
    return document.body.textContent?.includes('Menu') || false;
  });

  if (!isLoggedIn) {
    throw new Error('Login failed - not seeing logged-in state');
  }

  console.log('Login successful');

  // Set the activeGameSystem in localStorage
  await page.evaluate(() => {
    localStorage.setItem('activeGameSystem', 'dnd-5e-2024');
    console.log('Set activeGameSystem to dnd-5e-2024 in localStorage');
  });

  // Additional wait to ensure cookies are fully set
  await page.waitForTimeout(1000);

  // Save the storage state
  await page.context().storageState({ path: STORAGE_STATE });
  console.log('Saved storage state with authentication');

  // Log the cookies to verify they're being captured
  const cookies = await page.context().cookies();
  console.log(`Captured ${cookies.length} cookies`);
});
