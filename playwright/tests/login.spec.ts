import { test, expect, Page } from '@playwright/test';

test.describe('Authentication', () => {
  test('successful login', async ({ page }: { page: Page }) => {
    // Navigate directly to the login page (based on the actual URL from the logs)
    await page.goto('/auth/login');
    
    // Wait for the login form to load
    await page.waitForSelector('input[type="email"]');

    // Take a screenshot to verify we're on the right page
    await page.screenshot({ path: 'login-page.png' });

    // Fill in the login form
    await page.fill('input[type="email"]', 'admin@dungeonlab.com');
    await page.fill('input[type="password"]', 'password'); // Using the correct password from the rules
    
    // Click the login button
    await page.click('button[type="submit"]');
    
    // Take a screenshot right after clicking login button
    await page.screenshot({ path: 'after-login-button-click.png' });
    
    // Check for the "Login successful" notification
    const successNotification = page.getByText('Login successful');
    await expect(successNotification).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot after successful notification appears
    await page.screenshot({ path: 'login-successful.png' });
    
    // Wait for navigation to complete (redirected to home)
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify we are on the home page
    expect(page.url()).not.toContain('/auth/login');
  });

  test('failed login with incorrect credentials', async ({ page }: { page: Page }) => {
    // Navigate directly to the login page
    await page.goto('/auth/login');
    
    // Wait for the login page to load
    await page.waitForSelector('input[type="email"]');
    
    // Fill in the login form with incorrect credentials
    await page.fill('input[type="email"]', 'admin@dungeonlab.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Click the login button
    await page.click('button[type="submit"]');
    
    // Take a screenshot after failed login attempt
    await page.screenshot({ path: 'failed-login.png' });
    
    // Check for error notification that contains "Login failed" or "An unexpected error occurred"
    const errorNotification = page.locator('text=/Login failed|An unexpected error occurred/i');
    await expect(errorNotification).toBeVisible({ timeout: 10000 });
    
    // We should still be on the login page
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
}); 