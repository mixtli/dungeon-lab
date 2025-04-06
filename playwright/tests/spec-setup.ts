
import { test as setup, expect } from '@playwright/test';

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
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  console.log('Login successful');
  //await page.locator('form').getByRole('button', { name: 'Login' }).click();
  
  // Set the activeGameSystem in localStorage
  await page.evaluate(() => {
     localStorage.setItem('activeGameSystem', 'dnd-5e-2024');
     console.log('Set activeGameSystem to dnd-5e-2024 in localStorage');
  });
  await page.context().storageState({ path: './auth/storage-state.json'});
  
});