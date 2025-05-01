/* eslint-disable @typescript-eslint/no-explicit-any */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { convert5eToolsItem } from './convert-5etools-item.mjs';
import { read5eToolsData } from './import-utils.mjs';
import _config from '../../manifest.json' with { type: 'json' };
import { ItemsClient, configureApiClient } from '@dungeon-lab/client/index.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Item specialization type
interface ItemSpecialization {
  name: string;
  dataFile: string;
  dataKey: string;
  itemType: string;
}

// At the top of the file, add an interface to help with typings
interface ItemRequest {
  name: string;
  type: string;
  description?: string;
  weight?: number;
  cost?: number;
  data: any;
  gameSystemId: string;
  pluginId: string;
  // Intentionally omitting id which is required in validation but shouldn't be included in create requests
}

/**
 * Import items from 5e-SRD-Items.json using the ItemsClient
 * @param apiBaseUrl Base URL for the API
 * @param authToken Optional authentication token
 */
async function importItems(
  apiBaseUrl = 'http://localhost:3000',
  authToken?: string
): Promise<void> {
  try {
    // Configure API client
    configureApiClient(apiBaseUrl, authToken);
    
    // Create items client
    const itemsClient = new ItemsClient();

    // Filter to just the XPHB items
    const sourceFilter = (source: string) => source === 'XPHB';

    // Run the specialized item import for various item types
    await importItemSpecializations(itemsClient, sourceFilter);

    // Run the general item import for remaining items
    const dataPath = join(__dirname, '../../data');
    const itemsData = await read5eToolsData(dataPath, 'items.json');
    
    // Extract general items array
    const itemsArray = itemsData.item || [];
    
    // Filter items
    const filteredItems = itemsArray.filter((item: any) => sourceFilter(item.source));
    
    console.log(`Found ${filteredItems.length} general items to import`);
    
    // Stats for reporting
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process each item
    for (const itemData of filteredItems) {
      try {
        console.log(`Processing item: ${itemData.name}`);
        
        // Convert the item data
        const convertedData = convert5eToolsItem(itemData);
        
        if (!convertedData) {
          console.log(`No valid data for item: ${itemData.name}`);
          skipped++;
          continue;
        }
        
        // Prepare the item with the required fields
        const createItemData: ItemRequest = {
          name: convertedData.item.name,
          type: convertedData.item.type,
          description: convertedData.item.description,
          weight: convertedData.item.weight,
          cost: convertedData.item.cost,
          data: convertedData.item.data,
          gameSystemId: 'dnd-5e-2024',
          pluginId: 'dnd-5e-2024',
        };
        
        // Check if the item already exists by name
        const existingItems = await itemsClient.getItems({
          name: createItemData.name
        });
        
        if (existingItems && existingItems.length > 0) {
          // Update existing item
          const existingItem = existingItems[0];
          await itemsClient.updateItem(existingItem.id, createItemData);
          console.log(`Updated item: ${createItemData.name}`);
          updated++;
        } else {
          // Create new item
          await itemsClient.createItem(createItemData);
          console.log(`Created item: ${createItemData.name}`);
          created++;
        }
      } catch (error) {
        console.error(`Error processing item ${itemData.name}:`, error);
        errors++;
      }
    }
    
    // Print import summary
    console.log('\nGeneral Items Import Summary:');
    console.log(`- Created: ${created} new items`);
    console.log(`- Updated: ${updated} existing items`);
    console.log(`- Skipped: ${skipped} items`);
    console.log(`- Errors: ${errors} items`);
    
  } catch (error) {
    console.error('Error importing items:', error);
    throw error;
  }
}

/**
 * Import specific categories of items
 */
async function importItemSpecializations(
  itemsClient: ItemsClient,
  sourceFilter?: (source: string) => boolean
): Promise<void> {
  // List of specializations and their configuration
  const specializations: ItemSpecialization[] = [
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

  const dataPath = join(__dirname, '../../data');

  // Process each specialization
  for (const spec of specializations) {
    console.log(`\nImporting ${spec.name}...`);
    
    // Stats for reporting
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    try {
      // Read the items data
      const itemsData = await read5eToolsData(dataPath, spec.dataFile);
      
      // Extract items array for this specialization
      const itemsArray = itemsData[spec.dataKey] || [];
      
      // Filter items
      const filteredItems = sourceFilter ? 
        itemsArray.filter((item: any) => sourceFilter(item.source)) : 
        itemsArray;
      
      console.log(`Found ${filteredItems.length} ${spec.name.toLowerCase()} to import`);
      
      // Process each item
      for (const itemData of filteredItems) {
        try {
          console.log(`Processing ${spec.name.toLowerCase()}: ${itemData.name}`);
          
          // Convert the item data
          const convertedData = convert5eToolsItem(itemData);
          
          if (!convertedData) {
            console.log(`No valid data for ${spec.name.toLowerCase()}: ${itemData.name}`);
            skipped++;
            continue;
          }
          
          // Ensure the item type is set correctly for specific item categories
          convertedData.item.type = spec.itemType;
          
          // Prepare the item with the required fields
          const createItemData: ItemRequest = {
            name: convertedData.item.name,
            type: convertedData.item.type,
            description: convertedData.item.description,
            weight: convertedData.item.weight,
            cost: convertedData.item.cost,
            data: convertedData.item.data,
            gameSystemId: 'dnd-5e-2024',
            pluginId: 'dnd-5e-2024',
          };
          
          // Check if the item already exists by name
          const existingItems = await itemsClient.getItems({
            name: createItemData.name,
            type: createItemData.type
          });
          
          if (existingItems && existingItems.length > 0) {
            // Update existing item
            const existingItem = existingItems[0];
            await itemsClient.updateItem(existingItem.id, createItemData);
            console.log(`Updated ${spec.name.toLowerCase()}: ${createItemData.name}`);
            updated++;
          } else {
            // Create new item
            await itemsClient.createItem(createItemData);
            console.log(`Created ${spec.name.toLowerCase()}: ${createItemData.name}`);
            created++;
          }
        } catch (error) {
          console.error(`Error processing ${spec.name.toLowerCase()} ${itemData.name}:`, error);
          errors++;
        }
      }
      
      // Print import summary for this specialization
      console.log(`\n${spec.name} Import Summary:`);
      console.log(`- Created: ${created} new ${spec.name.toLowerCase()}`);
      console.log(`- Updated: ${updated} existing ${spec.name.toLowerCase()}`);
      console.log(`- Skipped: ${skipped} ${spec.name.toLowerCase()}`);
      console.log(`- Errors: ${errors} ${spec.name.toLowerCase()}`);
      
    } catch (error) {
      console.error(`Error importing ${spec.name}:`, error);
    }
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

  // Run the import
  importItems(apiBaseUrl, authToken)
    .then(() => {
      console.log('Items import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to import items:', error);
      process.exit(1);
    });
} 