/* eslint-disable @typescript-eslint/no-explicit-any */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { convert5eToolsItem } from './convert-5etools-item.mjs';
import { runImportViaAPI } from './import-utils.mjs';
import _config from '../../manifest.json' with { type: 'json' };
import { configureApiClient } from '@dungeon-lab/client/index.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Import items from 5e-SRD-Items.json using the client API
 * @param apiBaseUrl Base URL for the API
 * @param authToken Optional authentication token
 */
async function importItemsViaAPI(
  apiBaseUrl = 'http://localhost:3000',
  authToken?: string
): Promise<void> {
  try {
    // Configure API client

    // Filter to just the XPHB items
    const sourceFilter = (source: string) => source === 'XPHB';

    // Run the specialized item import for various item types
    await importItemSpecializations(apiBaseUrl, authToken, sourceFilter);

    // Run the general item import for remaining items
    await runImportViaAPI({
      documentType: 'items',
      dataFile: 'items.json',
      dataKey: 'item',
      converter: convert5eToolsItem,
      sourceFilter,
      dirPath: join(__dirname, '../../data'),
      isItem: true,
      apiBaseUrl,
      authToken
    });
  } catch (error) {
    console.error('Error importing items:', error);
  }
}

/**
 * Import specific categories of items
 */
async function importItemSpecializations(
  apiBaseUrl: string,
  authToken?: string,
  sourceFilter?: (source: string) => boolean
): Promise<void> {
  // Configure API client
  configureApiClient(apiBaseUrl);

  // List of specializations and their configuration
  const specializations = [
    {
      name: 'Armor',
      dataFile: 'items.json',
      dataKey: 'armor',
      itemType: 'armor'
    },
    {
      name: 'Weapons',
      dataFile: 'items.json',
      dataKey: 'weapon',
      itemType: 'weapon'
    },
    {
      name: 'Magic Armor',
      dataFile: 'items.json',
      dataKey: 'magicArmor',
      itemType: 'armor'
    },
    {
      name: 'Magic Weapons',
      dataFile: 'items.json',
      dataKey: 'magicWeapon',
      itemType: 'weapon'
    },
    {
      name: 'Wondrous Items',
      dataFile: 'items.json',
      dataKey: 'wondrousItem',
      itemType: 'wondrousItem'
    },
    {
      name: 'Rods',
      dataFile: 'items.json',
      dataKey: 'rod',
      itemType: 'rod'
    },
    {
      name: 'Staves',
      dataFile: 'items.json',
      dataKey: 'staff',
      itemType: 'staff'
    },
    {
      name: 'Wands',
      dataFile: 'items.json',
      dataKey: 'wand',
      itemType: 'wand'
    },
    {
      name: 'Rings',
      dataFile: 'items.json',
      dataKey: 'ring',
      itemType: 'ring'
    },
    {
      name: 'Scrolls',
      dataFile: 'items.json',
      dataKey: 'scroll',
      itemType: 'scroll'
    },
    {
      name: 'Potions',
      dataFile: 'items.json',
      dataKey: 'potion',
      itemType: 'potion'
    }
  ];

  // Process each specialization
  for (const spec of specializations) {
    console.log(`\nImporting ${spec.name}...`);
    await runImportViaAPI({
      documentType: spec.name,
      dataFile: spec.dataFile,
      dataKey: spec.dataKey,
      converter: (data) => {
        const result = convert5eToolsItem(data);
        // Ensure the item type is set correctly for specific item categories
        if (result) {
          (result as any).type = spec.itemType;
        }
        return result;
      },
      sourceFilter,
      dirPath: join(__dirname, '../../data'),
      isItem: true,
      apiBaseUrl,
      authToken
    });
  }
}

// Run the import if this script is executed directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  // Configure the API base URL and auth token from environment variables
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const authToken = process.env.API_AUTH_TOKEN;

  // Display initial configuration
  console.log(`Using API URL: ${apiBaseUrl}`);
  console.log(`Authentication: ${authToken ? 'Enabled' : 'Disabled'}`);

  configureApiClient(apiBaseUrl, authToken);
  importItemsViaAPI(apiBaseUrl, authToken).catch((error) => {
    console.error('Failed to import items:', error);
    process.exit(1);
  });
} 