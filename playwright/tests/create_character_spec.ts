import { test, expect } from '@playwright/test';
import path from 'path';

// Define path to avatar and token images
const avatarFile = path.join(__dirname, '../../images/avatar.png');

test('create character', async ({ page }) => {
  // Go to the homepage
  await page.goto('http://localhost:8080/');
  
  // Navigate to character creation
  await page.getByRole('button', { name: 'Menu' }).nth(1).hover();
  await page.getByRole('link', { name: 'Characters' }).click();
  await page.getByRole('button', { name: 'Create Character' }).click();
  
  // Step 1: Basic Information
  await page.getByRole('textbox', { name: 'Character Name' }).click();
  await page.getByRole('textbox', { name: 'Character Name' }).fill('Character 1');
  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.getByRole('textbox', { name: 'Description' }).fill('Test Character description');
  
  // File upload approach - Upload avatar
  // The component has a hidden input (with class "hidden") for file upload
  // and a button that triggers the input
  
  // Method 1: Use page.setInputFiles directly on the hidden input
  // This works best because it bypasses the button click and directly sets the file
  const avatarInputSelector = page.locator('input[type="file"][accept="image/*"]').first();
  await avatarInputSelector.setInputFiles(avatarFile);
  
  // Wait for the upload to complete (look for image preview or "Change Image" text)
  await page.waitForSelector('img[alt="Image preview"]', { timeout: 5000 });
  
  // Go to next step
  await page.getByRole('button', { name: 'Next: Character Details' }).click();
  
  // Step 2: Character Details - Class Selection
  await page.getByLabel('Class:').selectOption('67ecf346667b18f0fc232f0b');
  await page.getByRole('checkbox', { name: 'Intimidation' }).check();
  await page.getByRole('checkbox', { name: 'Athletics' }).check();
  await page.getByRole('radio', { name: 'Option A greataxe handaxe (4' }).check();
  await page.getByRole('button', { name: 'Next: Origin' }).click();
  
  // Species and Background selection
  await page.getByLabel('Species:').selectOption('67ecf36d667b18f0fc232f27');
  await page.locator('#subspecies').selectOption('Aasimar variant');
  await page.getByLabel('Background:').selectOption('67ee508b667b18f0fc232fcf');
  await page.getByLabel('Select one equipment option:').selectOption('0');
  await page.getByRole('listbox').selectOption('dwarvish');
  await page.getByRole('listbox').selectOption(['dwarvish', 'elvish']);
  await page.getByRole('button', { name: 'Next: Abilities' }).click();
  
  // Set ability scores
  await page.getByLabel('Choose Method:').selectOption('standard');
  await page.getByLabel('Strength').selectOption('15');
  await page.getByLabel('Dexterity').selectOption('13');
  await page.getByLabel('Constitution').selectOption('14');
  await page.getByLabel('Intelligence').selectOption('12');
  await page.getByLabel('Wisdom').selectOption('10');
  await page.getByLabel('Charisma').selectOption('8');
  await page.getByRole('button', { name: 'Next: Details' }).click();
  
  // Final details
  await page.getByLabel('Alignment:').selectOption('neutral-good');
  
  // Submit the form
  await page.getByRole('button', { name: 'Create Character' }).click();
  
  // Verify the character was created
  //await expect(page.getByRole('heading', { name: 'Character' })).toBeVisible();
  await expect(page.locator('#app')).toContainText('14/14');
});