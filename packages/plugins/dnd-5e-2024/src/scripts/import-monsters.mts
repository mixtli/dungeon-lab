/* eslint-disable @typescript-eslint/no-explicit-any */
import { runImportViaAPI, deleteDocumentsViaAPI as _deleteDocumentsViaAPI } from './import-utils.mjs';
import { convert5eToolsMonster } from './convert-5etools-monster.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import config from '../../manifest.json' with { type: 'json' };

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Clear existing monster actor documents for clean import using the REST API
 * @param apiBaseUrl Base URL for the API, defaults to localhost:3000
 * @param authToken Optional authentication token
 * @returns Promise that resolves when deletion is complete
 * @unused This function is kept for potential future use but currently inactive
 */
async function _clearExistingMonstersViaAPI(apiBaseUrl = 'http://localhost:3000', authToken?: string): Promise<number> {
  try {
    console.log("Using REST API to clear existing monster documents");
    
    // We need to specify 'monster' as the type for actors
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // First fetch all monster actors
    const searchParams = new URLSearchParams({
      pluginId: config.id,
      type: 'monster'
    });
    
    const searchResponse = await fetch(`${apiBaseUrl}/api/actors?${searchParams}`, {
      method: 'GET',
      headers
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Failed to search monster actors: ${searchResponse.statusText}`);
    }
    
    const monsters = await searchResponse.json();
    console.log(`Found ${monsters.length} monster actors to delete`);
    
    if (monsters.length === 0) {
      return 0;
    }
    
    // Delete each monster individually
    let deletedCount = 0;
    
    for (const monster of monsters) {
      try {
        const deleteResponse = await fetch(`${apiBaseUrl}/api/actors/${monster.id}`, {
          method: 'DELETE',
          headers
        });
        
        if (deleteResponse.ok) {
          deletedCount++;
        } else {
          console.error(`Failed to delete monster ${monster.id}: ${deleteResponse.statusText}`);
        }
      } catch (error) {
        console.error(`Error deleting monster ${monster.id}:`, error);
      }
    }
    
    console.log(`Deleted ${deletedCount} monster actors via API`);
    return deletedCount;
  } catch (error) {
    console.error(`Error deleting monster actors:`, error);
    return 0;
  }
}

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
    
    // Read the fluff data
    const fluffData = JSON.parse(
        await readFile(join(__dirname, '../../data', fluffFile), 'utf-8')
    );
    
    // Create a map of monster names to their fluff data
    const fluffMap = new Map();
    for (const fluff of fluffData.monsterFluff) {
        fluffMap.set(fluff.name, fluff);
    }
    
    // Run the import with the fluff data
    await runImportViaAPI({
        documentType: 'monster',
        dataFile: bestiaryFile,
        dataKey: 'monster',
        converter: async (data: any) => {
            const { monster, imagePath } = convert5eToolsMonster(data, fluffMap.get(data.name));
            
            // Prepare the result object with monster data
            const result = {
                name: monster.name,
                type: 'monster',
                pluginId: config.id,
                gameSystemId: config.id,
                data: monster,
            };
            
            // If we have an image path, add it to the _images field
            if (imagePath) {
                return {
                    ...result,
                    _images: {
                        token: imagePath
                    }
                };
            }
            
            return result;
        },
        dirPath: join(__dirname, '../../data'),
        isActor: true, // Specify that we're importing an actor
        apiBaseUrl,
        authToken
    });

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