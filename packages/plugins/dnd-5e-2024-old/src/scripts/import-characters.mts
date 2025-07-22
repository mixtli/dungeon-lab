/* eslint-disable @typescript-eslint/no-explicit-any */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, readdir } from 'fs/promises';
import * as fs from 'fs';
import * as mimeTypes from 'mime-types';
// import { runImportViaAPI } from './import-utils.mjs';
import { nextUser } from './import-utils.mjs';
import _config from '../../manifest.json' with { type: 'json' };
import { configureApiClient, ActorsClient } from '@dungeon-lab/client/index.mjs';
import { IActorCreateData } from '@dungeon-lab/shared/types/index.mjs';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates a File object from a file path
 * @param imagePath Path to the image file
 * @param basePath Base path to resolve relative paths
 * @returns File object or null if file doesn't exist
 */
async function createFileFromPath(imagePath: string): Promise<File | null> {
  try {
    const fullPath = join(__dirname, "../../data", imagePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.warn(`Image file not found: ${fullPath}`);
      return null;
    }
    
    // Read file
    const buffer = await readFile(fullPath);
    
    // Determine MIME type
    const contentType = mimeTypes.lookup(fullPath) || 'image/png';
    
    // Create File object
    const fileName = fullPath.split('/').pop() || 'image.png';
    return new File([buffer], fileName, { type: contentType });
  } catch (error) {
    console.error(`Error creating File from path ${imagePath}:`, error);
    return null;
  }
}

/**
 * Import characters from individual JSON files and create actors
 * @param apiBaseUrl Base URL for the API
 * @param authToken Optional authentication token
 */
async function importCharactersViaAPI(): Promise<void> {
  try {
    // Configure API client

    // Create the actors client
    const actorsClient = new ActorsClient();
    
    // Load character data from individual files
    console.log('Loading character data from individual files...');
    const charactersDir = join(__dirname, '../../data/characters');
    const characterFiles = await readdir(charactersDir);
    const jsonFiles = characterFiles.filter(file => file.endsWith('.json'));
    console.log(`Found ${jsonFiles.length} character files`);
    
    // Stats for reporting
    let created = 0;
    let updated = 0;
    const skipped = 0;
    let errors = 0;
    
    // Process each character file
    for (const characterFile of jsonFiles) {
      try {
        // Read character file
        const characterFilePath = join(charactersDir, characterFile);
        const characterData = JSON.parse(await readFile(characterFilePath, 'utf-8'));
        
        // Get user ID for creator field (alternate between users)
        const userId = await nextUser();
        if (!userId) {
          console.warn(`Couldn't get user ID for character: ${characterData.name}`);
          errors++;
          continue;
        }
        
        // Create the actor data
        const actorData: IActorCreateData = {
          name: characterData.name,
          type: 'character',
          gameSystemId: 'dnd-5e-2024-old',
          description: characterData.description,
          userData: characterData.userData,
          data: characterData.data,
          createdBy: userId
        };
        
        // Process avatar image if available
        if (characterData.avatar && characterData.avatar.url) {
          const avatarFile = await createFileFromPath(characterData.avatar.url);
          if (avatarFile) {
            actorData.avatar = avatarFile;
          }
        }
        
        // Process token image if available
        if (characterData.token && characterData.token.url) {
          const tokenFile = await createFileFromPath(characterData.token.url);
          if (tokenFile) {
            actorData.token = tokenFile;
          }
        }
        
        try {
          // Use query params to find existing character instead of loading all actors
          console.log("searching for existing actor", characterData.name);
          const existingActors = await actorsClient.getActors({
            name: characterData.name,
            type: 'character'
          });
          //console.log("existingActors", existingActors);
          
          // Find exact match with plugin ID
          const existingActor = existingActors.find(
            actor => (actor as any).gameSystemId === 'dnd-5e-2024-old'
          );
          
          if (existingActor) {
            // Update existing actor
            await actorsClient.updateActor(existingActor.id, actorData);
            console.log(`Updated character actor: ${characterData.name}`);
            updated++;
          } else {
            // Create new actor
            console.log(`Creating character actor: ${characterData.name}`);
            //console.log(actorData);
            await actorsClient.createActor(actorData);
            console.log(`Created character actor: ${characterData.name}`);
            created++;
          }
        } catch (apiError) {
          console.error(`API error processing character ${characterData.name}:`);
          console.error(JSON.stringify((apiError as any)?.response?.data || apiError, null, 2));
          errors++;
        }
      } catch (error) {
        console.error(`Error processing character file ${characterFile}:`, error);
        errors++;
      }
    }
    
    // Print import summary
    console.log('\nCharacter Import Summary:');
    console.log(`- Created: ${created} new character actors`);
    console.log(`- Updated: ${updated} existing character actors`);
    console.log(`- Skipped: ${skipped} characters`);
    console.log(`- Errors: ${errors} characters`);
    
  } catch (error) {
    console.error('Error importing characters:', error);
  }
}

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
const authToken = process.env.API_AUTH_TOKEN; // Optional
configureApiClient(apiBaseUrl, authToken);

// Display initial configuration
console.log(`Using API URL: ${apiBaseUrl}`);
console.log(`Authentication: ${authToken ? 'Enabled' : 'Disabled'}`);
  
importCharactersViaAPI().catch(error => {
  console.error('Failed to import characters:', error);
  process.exit(1);
});
