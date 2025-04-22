/* eslint-disable @typescript-eslint/no-explicit-any */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { convertSpell, uploadSpellImage } from './convert-5etools-spell.mjs';
import { itemDataSchema } from '../shared/types/item.mjs';
import config from '../../manifest.json' with { type: 'json' };
import fetch from 'node-fetch';

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
    // Setup headers with auth token if provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
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
        let imageUrl: string | undefined;
        if (imagePath) {
          imageUrl = await uploadSpellImage(imagePath, __dirname);
        }
        
        // Validate the spell data against our schema
        if (!validateSpellData(spell.data)) {
          console.error(`Spell ${spell.name} data does not match schema, skipping.`);
          skipped++;
          continue;
        }
        
        // Create the item data object
        const itemData = {
          name: spell.name,
          type: 'spell',
          image: imageUrl,
          description: spell.description,
          data: spell.data,
          pluginId: config.id,
          gameSystemId: config.id
        };
        
        // Check if this spell already exists using the REST API
        const searchParams = new URLSearchParams({
          name: itemData.name,
          type: 'spell',
          pluginId: config.id
        });
        
        const searchResponse = await fetch(`${apiBaseUrl}/api/items?${searchParams}`, {
          method: 'GET',
          headers
        });
        
        const searchResults = await searchResponse.json();
        
        if (searchResults && searchResults.length > 0) {
          // Update existing spell
          const existingSpell = searchResults[0];
          
          const updateResponse = await fetch(`${apiBaseUrl}/api/items/${existingSpell.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(itemData)
          });
          
          if (updateResponse.ok) {
            console.log(`Updated spell: ${spell.name}`);
            updated++;
          } else {
            console.error(`Failed to update spell: ${spell.name}`, await updateResponse.text());
            errors++;
          }
        } else {
          // Create new spell
          const createResponse = await fetch(`${apiBaseUrl}/api/items`, {
            method: 'POST',
            headers,
            body: JSON.stringify(itemData)
          });
          
          if (createResponse.ok) {
            console.log(`Created spell: ${spell.name}`);
            created++;
          } else {
            console.error(`Failed to create spell: ${spell.name}`, await createResponse.text());
            errors++;
          }
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