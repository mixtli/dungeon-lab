/**
 * This file contains the recorded Playwright session for the login process.
 * It demonstrates how to fill out the login form and submit it.
 */

// The following code was generated from a session recording
const { chromium } = require('@playwright/test');

(async () => {
  // Launch the browser
  const browser = await chromium.launch({
    headless: false // Set to true for headless mode
  });
  
  // Create a new browser context
  const context = await browser.newContext();
  
  // Open a new page
  const page = await context.newPage();
  
  // Navigate directly to the login page with the correct path
  await page.goto('http://localhost:8080/auth/login');
  
  // Wait for the login form to be visible
  await page.waitForSelector('input[type="email"]');
  
  // Take a screenshot before login
  await page.screenshot({ path: 'before-login.png' });
  
  // Fill in the email field
  await page.fill('input[type="email"]', 'admin@dungeonlab.com');
  
  // Fill in the password field
  await page.fill('input[type="password"]', 'password'); 
  
  // Click the login button
  await page.click('button[type="submit"]');
  
  // Check for the success notification
  console.log('Waiting for success notification...');
  const successNotification = page.getByText('Login successful');
  await successNotification.waitFor({ timeout: 10000 });
  console.log('Success notification appeared: ', await successNotification.isVisible());
  
  // Take a screenshot with the notification
  await page.screenshot({ path: 'login-notification.png' });
  
  // Wait for navigation to complete (to home page)
  await page.waitForURL('http://localhost:8080/');
  
  // Take a screenshot of the home page
  await page.screenshot({ path: 'home-page.png' });
  
  // Verify that login was successful by checking URL
  console.log('Current URL:', page.url());
  
  // Close browser
  await browser.close();
})(); 