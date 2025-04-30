/* eslint-disable @typescript-eslint/no-explicit-any */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { convertSpell, uploadSpellImage } from './convert-5etools-spell.mjs';
import { itemDataSchema } from '../shared/types/item.mjs';
import config from '../../manifest.json' with { type: 'json' };
import { configureApiClient, ItemsClient } from '@dungeon-lab/client/index.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validate spell data against our schema
 * @param data Spell data object
 * @returns True if valid, false if not
 */
function validateSpellData(data: any): boolean {
  try {
    itemDataSchema.parse(data);
    return true;
  } catch (error) {
    console.error('Spell data validation failed:', error);
    return false;
  }
}

/**
 * Import spells from 5e-SRD-Spells.json using the REST API
 * @param apiBaseUrl Base URL for the API
 * @param authToken Optional authentication token
 */
async function importSpellsViaAPI(apiBaseUrl = 'http://localhost:3000', authToken?: string): Promise<void> {
  try {
    // Configure the API client
    configureApiClient(apiBaseUrl);
    
    // Create the items client
    const itemsClient = new ItemsClient({
      baseURL: apiBaseUrl,
      apiKey: authToken
    });
    
    // Load spell data
    console.log('Loading spell data...');
    const spellsFilePath = join(__dirname, '../../data/5e-SRD-Spells.json');
    const spellsData = JSON.parse(await readFile(spellsFilePath, 'utf-8'));
    console.log(`Loaded ${spellsData.length} spells`);
    
    // Load fluff data for images
    console.log('Loading spell fluff data...');
    const fluffFilePath = join(__dirname, '../../data/fluff-spells-xphb.json');
    const fluffData = JSON.parse(await readFile(fluffFilePath, 'utf-8'));
    
    // Create a map of spell names to their fluff data
    const fluffMap = new Map<string, any>();
    if (fluffData && fluffData.spellFluff) {
      for (const fluff of fluffData.spellFluff) {
        fluffMap.set(fluff.name.toLowerCase(), fluff);
      }
    }
    console.log(`Loaded ${fluffMap.size} spell fluff entries`);
    
    // Stats for reporting
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each spell
    for (const spellData of spellsData) {
      try {
        // Find matching fluff data
        const fluff = fluffMap.get(spellData.name.toLowerCase());
        
        // Convert the spell
        const { spell, imagePath } = convertSpell(spellData, fluff);
        
        // Upload image if available
        if (imagePath) {
          await uploadSpellImage(imagePath, __dirname);
        }
        
        // Validate the spell data against our schema
        if (!validateSpellData(spell.data)) {
          console.error(`Spell ${spell.name} data does not match schema, skipping.`);
          skipped++;
          continue;
        }
        
        // Create the item data object without image (will be handled separately)
        const itemData = {
          name: spell.name,
          type: 'spell',
          description: spell.description,
          data: spell.data,
          pluginId: config.id,
          gameSystemId: config.id
        };
        
        try {
          // Search for existing spell using filter parameters
          const existingSpells = await itemsClient.getItems({
            name: spell.name,
            type: 'spell',
            pluginId: config.id
          });
          
          const existingSpell = existingSpells.length > 0 ? existingSpells[0] : null;
          
          if (existingSpell) {
            // Update existing spell
            await itemsClient.updateItem(existingSpell.id, itemData);
            console.log(`Updated spell: ${spell.name}`);
            updated++;
          } else {
            // Create new spell
            await itemsClient.createItem(itemData);
            console.log(`Created spell: ${spell.name}`);
            created++;
          }
        } catch (apiError) {
          console.error(`API error processing spell ${spell.name}:`, apiError);
          errors++;
        }
      } catch (error) {
        console.error(`Error processing spell ${spellData.name}:`, error);
        errors++;
      }
    }
    
    // Print import summary
    console.log('\nSpell Import Summary:');
    console.log(`- Created: ${created} new spells`);
    console.log(`- Updated: ${updated} existing spells`);
    console.log(`- Skipped: ${skipped} spells`);
    console.log(`- Errors: ${errors} spells`);
    
  } catch (error) {
    console.error('Error importing spells:', error);
  }
}

// Run the import if this script is executed directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  // Configure the API base URL and auth token from environment variables
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const authToken = process.env.API_AUTH_TOKEN; // Optional
  
  // Display initial configuration
  console.log(`Using API URL: ${apiBaseUrl}`);
  console.log(`Authentication: ${authToken ? 'Enabled' : 'Disabled'}`);
  
  importSpellsViaAPI(apiBaseUrl, authToken).catch(error => {
    console.error('Failed to import spells:', error);
    process.exit(1);
  });
} 