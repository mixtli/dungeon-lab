import { runImport } from './import-utils.mjs';
import { convert5eToolsItem, initItemConverter } from './convert-5etools-item.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { uploadFile, getPublicUrl } from '@dungeon-lab/server/src/services/storage.service.mjs';
import * as mimeTypes from 'mime-types';
import config from '../../manifest.json' with { type: 'json' };
import { itemDataSchema } from '../shared/types/item.mjs';
import mongoose from 'mongoose';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Upload an item image
 * @param imagePath Path to the image in the 5etools-img directory
 * @returns Public URL of the uploaded image
 */
async function uploadItemImage(imagePath: string): Promise<string | undefined> {
    try {
        const fullPath = join(__dirname, '../../submodules/5etools-img', imagePath);
        const buffer = await readFile(fullPath);
        const contentType = mimeTypes.lookup(imagePath) || 'image/jpeg';
        const fileName = imagePath.split('/').pop() || 'item.jpg';
        
        const { key } = await uploadFile(buffer, fileName, contentType, 'items');
        return getPublicUrl(key);
    } catch (error) {
        console.error(`Failed to upload image ${imagePath}:`, error);
        return undefined;
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
 * Import base items from the base items data
 * @param baseItemsData The items-base.json data
 * @param fluffMap Map of fluff data
 * @param userId User ID for creation/update
 */
async function importBaseItems(baseItemsData: any, fluffMap: Map<string, any>, userId: string): Promise<void> {
    console.log('Importing base items...');
    
    // Connect to the database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab');
    
    try {
        // Get the Item model
        const { ItemModel } = await import('@dungeon-lab/server/src/features/items/models/item.model.mjs');
        
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
        
        // Process each item
        for (const item of filteredItems) {
            try {
                // Get fluff data for this item
                const fluffKey = `${item.name}|${item.source}`;
                const fluffEntry = fluffMap.get(fluffKey);
                
                // Convert the item
                const { item: convertedItem, imagePath } = convert5eToolsItem(item, fluffEntry);
                
                // Upload image if available
                let imageUrl: string | undefined;
                if (imagePath) {
                    imageUrl = await uploadItemImage(imagePath);
                }
                
                // Validate the item data against our schema
                if (!validateItemData(convertedItem.data)) {
                    console.error(`Item ${convertedItem.name} data does not match schema, skipping.`);
                    console.log("CONVERTED ITEM",convertedItem)
                    skipped++;
                    continue;
                }
                
                // Create the item data object
                const itemData = {
                    name: convertedItem.name,
                    type: convertedItem.type,
                    image: imageUrl,
                    description: convertedItem.description,
                    weight: convertedItem.weight,
                    cost: convertedItem.cost,
                    data: convertedItem.data,
                    pluginId: config.id,
                    gameSystemId: config.id
                };
                
                // Check if this item already exists
                const existingItem = await ItemModel.findOne({
                    name: itemData.name,
                    type: itemData.type,
                    pluginId: itemData.pluginId
                });
                
                if (existingItem) {
                    await ItemModel.updateOne(
                        { _id: existingItem._id },
                        { 
                            $set: { 
                                ...itemData,
                                updatedBy: userId
                            }
                        }
                    );
                    console.log(`Updated base item: ${item.name}`);
                    updated++;
                } else {
                    await ItemModel.create({
                        ...itemData,
                        createdBy: userId,
                        updatedBy: userId
                    });
                    console.log(`Created base item: ${item.name}`);
                    created++;
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
        console.log(`- Errors: ${errors} base items`);
        
    } finally {
        // Disconnect from the database
        await mongoose.connection.close();
    }
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
    (async () => {
        try {
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

            // Get the user ID for creating/updating items
            const { connectToDatabase, getFirstUserId, disconnectFromDatabase } = await import('./import-utils.mjs');
            await connectToDatabase();
            const userId = await getFirstUserId();
            await disconnectFromDatabase();

            // 1. First import base items
            await importBaseItems(baseItemsData, fluffMap, userId);
            
            // 2. Now import items from items.json
            console.log('Importing regular items...');
            await runImport({
                documentType: 'item',
                dataFile: 'items.json',
                dataKey: 'item',
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
                    
                    // Upload image if available
                    let imageUrl: string | undefined;
                    if (imagePath) {
                        imageUrl = await uploadItemImage(imagePath);
                    }
                    
                    // Validate the item data against our schema
                    if (!validateItemData(item.data)) {
                        console.error(`Item ${item.name} data does not match schema, skipping.`);
                        return null;
                    }
                    
                    return {
                        name: item.name,
                        type: item.type,
                        image: imageUrl,
                        description: item.description,
                        weight: item.weight,
                        cost: item.cost,
                        data: item.data,
                        pluginId: config.id,
                        gameSystemId: config.id
                    };
                },
                dirPath: join(__dirname, '../../data'),
                sourceFilter: undefined, // We'll filter within the converter
                isItem: true // Use Item model instead of VTTDocument
            });
        } catch (error) {
            console.error('Error importing items:', error);
        }
    })();
} 