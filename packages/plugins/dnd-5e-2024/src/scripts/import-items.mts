/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImportViaAPI } from './import-utils.mjs';
import { convert5eToolsItem, initItemConverter } from './convert-5etools-item.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import * as mimeTypes from 'mime-types';
import config from '../../manifest.json' with { type: 'json' };
import { itemDataSchema } from '../shared/types/item.mjs';
import fetch from 'node-fetch';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Reads an image file and returns its buffer and content type
 * @param imagePath Path to the image in the 5etools-img directory
 * @returns Object containing buffer and contentType
 */
async function readItemImage(imagePath: string): Promise<{buffer: Buffer, contentType: string} | null> {
    try {
        const fullPath = join(__dirname, '../../submodules/5etools-img', imagePath);
        const buffer = await readFile(fullPath);
        const contentType = mimeTypes.lookup(imagePath) || 'image/jpeg';
        return { buffer, contentType };
    } catch (error) {
        console.error(`Failed to read image ${imagePath}:`, error);
        return null;
    }
}

/**
 * Upload item image directly to the item via the API
 * @param itemId The item ID
 * @param imagePath Path to the image in the 5etools-img directory
 * @param apiBaseUrl Base URL for the API
 * @param headers Request headers including auth
 * @returns Promise that resolves when the upload is complete
 */
async function uploadItemImageViaAPI(
    itemId: string, 
    imagePath: string, 
    apiBaseUrl: string,
    headers: Record<string, string>
): Promise<boolean> {
    try {
        const imageData = await readItemImage(imagePath);
        if (!imageData) return false;
        
        const { buffer, contentType } = imageData;
        
        // Clone headers and set content type for binary upload
        const imageHeaders = { ...headers };
        delete imageHeaders['Content-Type']; // Remove JSON content type
        imageHeaders['Content-Type'] = contentType;
        
        const uploadResponse = await fetch(`${apiBaseUrl}/api/items/${itemId}/image`, {
            method: 'PUT',
            headers: imageHeaders,
            body: buffer
        });
        
        if (uploadResponse.ok) {
            console.log(`Uploaded image for item ${itemId}`);
            return true;
        } else {
            console.error(`Failed to upload image for item ${itemId}:`, await uploadResponse.text());
            return false;
        }
    } catch (error) {
        console.error(`Error uploading image for item ${itemId}:`, error);
        return false;
    }
}

/**
 * Validate item data against our schema
 * @param data Item data object
 * @returns True if valid, false if not
 */
function validateItemData(data: any): boolean {
    try {
        itemDataSchema.parse(data);
        return true;
    } catch (error) {
        console.error('Item data validation failed:', error);
        console.log("DATA",data)
        return false;
    }
}

/**
 * Clear existing item documents for clean import using the REST API
 * This function is commented out to avoid linter warning but kept for future use
 * @param apiBaseUrl Base URL for the API, defaults to localhost:3000
 * @param authToken Optional authentication token
 * @returns Promise that resolves when deletion is complete
 */
/* 
async function clearExistingItemsViaAPI(apiBaseUrl = 'http://localhost:3000', authToken?: string): Promise<number> {
    try {
        console.log("Using REST API to clear existing item documents");
        
        const deletedCount = await deleteDocumentsViaAPI('item', config.id, apiBaseUrl, authToken);
        
        return deletedCount;
    } catch (error) {
        console.error("Error clearing existing items:", error);
        return 0;
    }
}
*/

/**
 * Import base items from the base items data via REST API
 * @param baseItemsData The items-base.json data
 * @param fluffMap Map of fluff data
 * @param apiBaseUrl Base URL for the API
 * @param authToken Optional authentication token
 */
async function importBaseItemsViaAPI(
    baseItemsData: any, 
    fluffMap: Map<string, any>, 
    apiBaseUrl = 'http://localhost:3000',
    authToken?: string
): Promise<void> {
    console.log('Importing base items via REST API...');

    // Setup headers with auth token if provided
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    try {
        // Get the base items
        const baseItems = baseItemsData.baseitem || [];
        console.log(`Found ${baseItems.length} base items in source file`);
        
        // Filter for our sources
        const filteredItems = baseItems.filter((item: any) => 
            item.source === 'XPHB' || item.source === 'XDMG'
        );
        
        console.log(`Found ${filteredItems.length} filtered base items to import`);
        
        // Stats for reporting
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;
        let imagesUploaded = 0;
        
        // Process each item
        for (const item of filteredItems) {
            try {
                // Get fluff data for this item
                const fluffKey = `${item.name}|${item.source}`;
                const fluffEntry = fluffMap.get(fluffKey);
                
                // Convert the item
                const { item: convertedItem, imagePath } = convert5eToolsItem(item, fluffEntry);
                
                // Validate the item data against our schema
                if (!validateItemData(convertedItem.data)) {
                    console.error(`Item ${convertedItem.name} data does not match schema, skipping.`);
                    console.log("CONVERTED ITEM",convertedItem)
                    skipped++;
                    continue;
                }
                
                // Create the item data object - without the image field
                const itemData = {
                    name: convertedItem.name,
                    type: convertedItem.type,
                    description: convertedItem.description,
                    weight: convertedItem.weight,
                    cost: convertedItem.cost,
                    data: convertedItem.data,
                    pluginId: config.id,
                    gameSystemId: config.id
                };
                
                // Check if this item already exists
                const searchParams = new URLSearchParams({
                    name: itemData.name,
                });
                
                const searchResponse = await fetch(`${apiBaseUrl}/api/items?${searchParams}`, {
                    method: 'GET',
                    headers
                });
                
                const searchResults = await searchResponse.json();
                let itemId: string;
                
                if (searchResults && searchResults.length > 0) {
                    // Update existing item
                    const existingItem = searchResults[0];
                    itemId = existingItem.id;
                    
                    const updateResponse = await fetch(`${apiBaseUrl}/api/items/${itemId}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(itemData)
                    });
                    
                    if (updateResponse.ok) {
                        console.log(`Updated base item: ${item.name}`);
                        updated++;
                    } else {
                        console.error(`Failed to update base item: ${item.name}`, await updateResponse.text());
                        errors++;
                        continue; // Skip image upload if update failed
                    }
                } else {
                    // Create new item
                    const createResponse = await fetch(`${apiBaseUrl}/api/items`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(itemData)
                    });
                    
                    if (createResponse.ok) {
                        const createdItem = await createResponse.json();
                        itemId = createdItem.id;
                        console.log(`Created base item: ${item.name}`);
                        created++;
                    } else {
                        console.error(`Failed to create base item: ${item.name}`, await createResponse.text());
                        errors++;
                        continue; // Skip image upload if create failed
                    }
                }
                
                // Upload image separately if available
                if (imagePath && itemId) {
                    const imageUploaded = await uploadItemImageViaAPI(itemId, imagePath, apiBaseUrl, headers);
                    if (imageUploaded) {
                        imagesUploaded++;
                    }
                }
                
            } catch (error) {
                console.error(`Error processing base item ${item.name}:`, error);
                errors++;
            }
        }
        
        // Print import summary
        console.log('\nBase Items Import Summary:');
        console.log(`- Created: ${created} new base items`);
        console.log(`- Updated: ${updated} existing base items`);
        console.log(`- Skipped: ${skipped} base items`);
        console.log(`- Images uploaded: ${imagesUploaded} images`);
        console.log(`- Errors: ${errors} base items`);
        
    } catch (error) {
        console.error("Fatal error during base items import:", error);
    }
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
    (async () => {
        try {
            // Configure the API base URL and auth token from environment variables
            const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
            const authToken = process.env.API_AUTH_TOKEN; // Optional
            
            // Display initial configuration
            console.log(`Using API URL: ${apiBaseUrl}`);
            console.log(`Authentication: ${authToken ? 'Enabled' : 'Disabled'}`);
            
            // First load base items and initialize converter
            console.log('Loading base item data...');
            const baseItemsData = JSON.parse(
                await readFile(join(__dirname, '../../data/items-base.json'), 'utf-8')
            );
            
            // Initialize the converter with reference data
            initItemConverter(baseItemsData);
            console.log('Item converter initialized with reference data');
            
            // Load fluff data for images
            console.log('Loading item fluff data...');
            const fluffData = JSON.parse(
                await readFile(join(__dirname, '../../data/fluff-items.json'), 'utf-8')
            );
            
            // Create a map of item names to their fluff data
            const fluffMap = new Map();
            for (const fluff of fluffData.itemFluff) {
                const key = `${fluff.name}|${fluff.source}`;
                fluffMap.set(key, fluff);
            }
            console.log(`Loaded ${fluffMap.size} fluff entries for items`);
            
            // First clear existing items, then run the import
            // Uncomment the next line if you want to clear existing items before importing
            // await clearExistingItemsViaAPI(apiBaseUrl, authToken);
            
            // 1. First import base items
            await importBaseItemsViaAPI(baseItemsData, fluffMap, apiBaseUrl, authToken);
            
            // 2. Now import items from items.json
            console.log('Importing regular items via REST API...');
            await runImportViaAPI({
                documentType: 'item',
                dataFile: 'items.json',
                dataKey: 'item',
                isItem: true,
                apiBaseUrl,
                authToken,
                dirPath: join(__dirname, '../../data'),
                converter: async (data: any) => {
                    // Filter for XPHB or XDMG sources
                    if (data.source !== 'XPHB' && data.source !== 'XDMG') {
                        return null;
                    }
                    
                    // Get fluff data for this item
                    const fluffKey = `${data.name}|${data.source}`;
                    const fluffEntry = fluffMap.get(fluffKey);
                    
                    // Convert the item
                    const { item, imagePath } = convert5eToolsItem(data, fluffEntry);
                    
                    // Validate the item data against our schema
                    if (!validateItemData(item.data)) {
                        console.error(`Item ${item.name} data does not match schema, skipping.`);
                        return null;
                    }
                    
                    // Return item data with the _images field to be used by the API wrapper
                    return {
                        name: item.name,
                        type: item.type,
                        description: item.description,
                        weight: item.weight,
                        cost: item.cost,
                        data: item.data,
                        pluginId: config.id,
                        gameSystemId: config.id,
                        // Store imagePath in _images.image format for uploadImageToAPI
                        _images: imagePath ? { image: imagePath } : undefined
                    };
                }
            });
                        
        } catch (error) {
            console.error('Error running item import:', error);
        }
    })();
} 