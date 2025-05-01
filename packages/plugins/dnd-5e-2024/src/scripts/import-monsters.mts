/* eslint-disable @typescript-eslint/no-explicit-any */
import { convert5eToolsMonster } from './convert-5etools-monster.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import fs from 'fs/promises';
import config from '../../manifest.json' with { type: 'json' };
import { configureApiClient, ActorsClient } from '@dungeon-lab/client/index.mjs';
import { nextUser } from './import-utils.mjs';
import { AxiosError } from 'axios';
// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Import monsters from a specific bestiary file
 * @param bestiaryFile Name of the bestiary JSON file to import from
 * @param fluffFile Name of the corresponding fluff JSON file
 * @param apiBaseUrl Base URL for the API
 * @param authToken Optional authentication token
 */
async function importMonstersFromBestiary(
    bestiaryFile: string, 
    fluffFile: string, 
    apiBaseUrl: string, 
    authToken?: string
): Promise<void> {
    console.log(`Importing monsters from ${bestiaryFile} with fluff from ${fluffFile}...`);
    
    // Configure API client
    configureApiClient(apiBaseUrl, authToken);
    
    // Create actors client
    const actorsClient = new ActorsClient();
    
    // Read the bestiary data
    const bestiaryData = JSON.parse(
        await readFile(join(__dirname, '../../data', bestiaryFile), 'utf-8')
    );
    
    // Read the fluff data
    const fluffData = JSON.parse(
        await readFile(join(__dirname, '../../data', fluffFile), 'utf-8')
    );
    
    // Create a map of monster names to their fluff data
    const fluffMap = new Map();
    for (const fluff of fluffData.monsterFluff) {
        fluffMap.set(fluff.name, fluff);
    }
    
    // Stats for reporting
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let imagesProcessed = 0;
    
    // Process each monster in the bestiary
    const monsters = bestiaryData.monster || [];
    console.log(`Found ${monsters.length} monsters to process`);
    
    for (const monsterData of monsters) {
        try {
            // Get actor data from converter
            const { monster, imagePath } = convert5eToolsMonster(monsterData, fluffMap.get(monsterData.name));
            
            // Prepare actor data
            const actorData = {
                name: monster.name,
                type: 'monster',
                pluginId: config.id,
                gameSystemId: config.id,
                data: monster
            };
            
            // Check if actor already exists
            const existingActors = await actorsClient.getActors({
                name: actorData.name,
                type: 'monster',
                pluginId: config.id
            });
            
            const existingActor = existingActors.length > 0 ? existingActors[0] : null;
            
            // Get user ID for creator
            const userId = await nextUser();
            if (!userId) {
                console.warn(`Couldn't get user ID for monster: ${actorData.name}`);
                skipped++;
                continue;
            }
            
            let actorId: string;
            
            // Create or update the actor
            if (existingActor) {
                console.log(`Updating existing monster: ${actorData.name}`);
                await actorsClient.updateActor(existingActor.id, actorData);
                actorId = existingActor.id;
                updated++;
            } else {
                console.log(`Creating new monster: ${actorData.name}`);
                const newActor = await actorsClient.createActor({
                    ...actorData,
                    createdBy: userId
                });
                if (!newActor) {
                    throw new Error(`Failed to create actor: ${actorData.name}`);
                }
                actorId = newActor.id;
                created++;
            }
            
            // Upload token image if available
            if (imagePath) {
                try {
                    // Construct full path to image file
                    const fullImagePath = join(__dirname, '../../submodules/5etools-img', imagePath);
                    console.log(`Processing image: ${fullImagePath}`);
                    
                    // Check if image file exists
                    try {
                        await fs.access(fullImagePath);
                    } catch (_err) {
                        console.warn(`Image file not found: ${fullImagePath}`);
                        continue;
                    }
                    
                    // Read image file
                    const imageBuffer = await fs.readFile(fullImagePath);
                    
                    // Determine content type based on file extension
                    const extension = imagePath.split('.').pop()?.toLowerCase() || 'jpg';
                    let contentType = 'image/jpeg';
                    if (extension === 'png') contentType = 'image/png';
                    if (extension === 'webp') contentType = 'image/webp';
                    
                    // Create a File object from the buffer
                    const tokenFile = new File(
                        [imageBuffer], 
                        `${monster.name.replace(/\s+/g, '_')}.${extension}`,
                        { type: contentType }
                    );
                    
                    // Upload the token
                    await actorsClient.uploadActorToken(actorId, tokenFile);
                    console.log(`Uploaded token image for ${actorData.name}`);
                    imagesProcessed++;
                } catch (imageError) {
                    console.error(`Error uploading token for ${actorData.name}:`, imageError);
                }
            }
        } catch (error) {
            if (error instanceof AxiosError) {
                console.error(`Error processing monster ${monsterData.name}:`, JSON.stringify(error.response?.data, null, 2));
            } else {
                console.log(`Error processing monster ${monsterData.name}:`, error);
            }
            errors++;
        }
    }
    
    // Print import summary
    console.log(`\nMonster Import Summary for ${bestiaryFile}:`);
    console.log(`- Created: ${created} new monsters`);
    console.log(`- Updated: ${updated} existing monsters`);
    console.log(`- Images Processed: ${imagesProcessed} tokens`);
    console.log(`- Skipped: ${skipped} monsters`);
    console.log(`- Errors: ${errors} monsters`);
    
    console.log(`Completed import from ${bestiaryFile}`);
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
    // Configure the API base URL and auth token from environment variables
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const authToken = process.env.API_AUTH_TOKEN; // Optional
    
    // Display initial configuration
    console.log(`Using API URL: ${apiBaseUrl}`);
    console.log(`Authentication: ${authToken ? 'Enabled' : 'Disabled'}`);

    // First clear existing monsters if needed (commented out as per requirements)
    // await _clearExistingMonstersViaAPI(apiBaseUrl, authToken);
    
    // Process both bestiary files in sequence
    try {
        // First import monsters from XMM (Monster Manual)
        await importMonstersFromBestiary(
            'bestiary-xmm.json', 
            'fluff-bestiary-xmm.json',
            apiBaseUrl,
            authToken
        );
        
        // Then import monsters from XPHB (Player's Handbook)
        await importMonstersFromBestiary(
            'bestiary-xphb.json', 
            'fluff-bestiary-xphb.json',
            apiBaseUrl,
            authToken
        );
        
        console.log('🎉 All monster imports complete!');
    } catch (error) {
        console.error('Error during monster import:', error);
    }
} 