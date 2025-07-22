import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { nextUser } from './import-utils.mjs';
import { configureApiClient, MapsClient } from '@dungeon-lab/client/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;

// Configure API client
configureApiClient(API_BASE_URL, API_AUTH_TOKEN);

// Create maps client instance
const mapsClient = new MapsClient();

// Display initial configuration
console.log(`Using API URL: ${API_BASE_URL}`);
console.log(`Authentication: ${API_AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);

// Define proper types for map data
interface MapData {
  id: string;
  name: string;
  description?: string;
  columns: number;
  rows: number;
  image?: string;
  [key: string]: unknown;
}

// Import maps via API
async function importMapsViaAPI() {
  const mapsDir = join(__dirname, '../../data/maps');
  const mapFiles = readdirSync(mapsDir).filter((f) => f.endsWith('.json'));

  console.log(`Found ${mapFiles.length} map files to import`);

  // Stats for reporting
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const mapFile of mapFiles) {
    const mapData: MapData = JSON.parse(readFileSync(join(mapsDir, mapFile), 'utf-8'));
    console.log(`Processing map: ${mapData.name}`);

    try {
      // Check if map exists by name
      let mapId: string | null = null;

      try {
        // Get maps with the same name
        const existingMaps = await mapsClient.getMaps();

        // Filter maps by name manually if needed
        const matchingMaps = existingMaps.filter((map) => map.name === mapData.name);

        if (matchingMaps.length > 0) {
          mapId = matchingMaps[0].id;
          console.log(`Found existing map with ID: ${mapId}`);
        }
      } catch (error) {
        console.warn(`Could not check for existing map: ${mapData.name}`, error);
      }

      // Create or update map via client API
      if (mapId) {
        // Update existing map
        console.log(`Updating map: ${mapData.name}`);
        await mapsClient.updateMap(mapId, {
          name: mapData.name,
          description: mapData.description || '',
        });
        updated++;
      } else {
        // Create new map
        console.log(`Creating new map: ${mapData.name}`);

        // Get user ID for creator field
        const userId = await nextUser();

        if (userId) {
          const createMapData = {
            name: mapData.name,
            description: mapData.description || '',
            gridColumns: mapData.columns
          };

          const newMap = await mapsClient.createMap(createMapData);

          if (newMap && newMap.id) {
            mapId = newMap.id;
            console.log(`Created new map with ID: ${mapId}`);
            created++;
          }
        } else {
          console.warn(`Couldn't get user ID for map: ${mapData.name}`);
          errors++;
          continue;
        }
      }

      // Upload map image if available
      if (mapId && mapData.image) {
        // Function to safely get file paths
        const getFilePath = (basePath: string, relativePath: unknown): string => {
          if (!relativePath) return '';
          const safePath = typeof relativePath === 'string' ? relativePath : String(relativePath);
          return join(__dirname, basePath, safePath);
        };

        // Get map image path
        const imageFilePath = mapData.image ? getFilePath('../../data/', mapData.image) : '';

        // Upload image if available
        if (imageFilePath && fs.existsSync(imageFilePath)) {
          console.log(`Uploading image for ${mapData.name}`);

          try {
            // Read image file as binary data
            const imageData = fs.readFileSync(imageFilePath);

            // Determine content type based on file extension
            let contentType = 'image/jpeg'; // Default
            if (imageFilePath.toLowerCase().endsWith('.png')) {
              contentType = 'image/png';
            } else if (imageFilePath.toLowerCase().endsWith('.webp')) {
              contentType = 'image/webp';
            }

            // Create File object
            const fileName = imageFilePath.split('/').pop() || 'image.jpg';
            const imageFile = new File([imageData], fileName, { type: contentType });

            // Upload image using the client
            await mapsClient.uploadMapImage(mapId, imageFile);

            console.log(`Image uploaded for ${mapData.name}`);
          } catch (error) {
            console.error(`Failed to upload image for ${mapData.name}:`, error);
            errors++;
          }
        }
      }

      console.log(`Successfully processed map: ${mapData.name}`);
    } catch (error) {
      console.error(`Error processing map data for ${mapFile}:`, error);
      errors++;
    }
  }

  // Print import summary
  console.log('\nMap Import Summary:');
  console.log(`- Created: ${created} new maps`);
  console.log(`- Updated: ${updated} existing maps`);
  console.log(`- Errors: ${errors} maps`);
}

async function main() {
  try {
    // Import maps via API
    await importMapsViaAPI();

    console.log('Map import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
