import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token from environment variable
if (API_AUTH_TOKEN) {
  api.defaults.headers.common['Authorization'] = `Bearer ${API_AUTH_TOKEN}`;
  console.log('Using API token from environment');
} else {
  console.warn('Warning: API_AUTH_TOKEN not provided. API calls may fail with 401 Unauthorized');
}

// Define proper types for map data
interface MapData {
  id: string;
  name: string;
  description?: string;
  columns: number;
  rows: number;
  campaignId?: string;
  [key: string]: unknown;
}

// Import maps via API
async function importMapsViaAPI() {
  const mapsDir = join(__dirname, '../../data/maps');
  const mapFiles = readdirSync(mapsDir).filter((f) => f.endsWith('.json'));

  console.log(`Found ${mapFiles.length} map files to import`);

  for (const mapFile of mapFiles) {
    const mapData: MapData = JSON.parse(readFileSync(join(mapsDir, mapFile), 'utf-8'));
    console.log(`Processing map: ${mapData.name}`);

    try {
      // Check if map exists by name
      let mapId: string | null = null;

      try {
        const response = await api.get('/api/maps', {
          params: {
            name: mapData.name
          }
        });

        const existingMaps = response.data;
        if (existingMaps.length > 0) {
          mapId = existingMaps[0].id;
          console.log(`Found existing map with ID: ${mapId}`);
        }
      } catch (error) {
        console.warn(`Could not check for existing map: ${mapData.name}`, error);
      }

      // Create or update map via API
      if (mapId) {
        // Update existing map
        console.log(`Updating map: ${mapData.name}`);
        await api.put(`/api/maps/${mapId}`, {
          name: mapData.name,
          description: mapData.description || '',
          gridColumns: mapData.columns,
          campaignId: mapData.campaignId
        });
      } else {
        // Create new map
        console.log(`Creating new map: ${mapData.name}`);
        const createResponse = await api.post('/api/maps', {
          name: mapData.name,
          description: mapData.description || '',
          gridColumns: mapData.columns,
          campaignId: mapData.campaignId
        });

        mapId = createResponse.data.id;
        console.log(`Created new map with ID: ${mapId}`);
      }

      // Upload map image if available
      if (mapId) {
        // Function to safely get file paths
        console.log('got mapid', mapData.image);
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

            // Upload raw image data
            await api.put(`/api/maps/${mapId}/image`, imageData, {
              headers: {
                'Content-Type': contentType
              }
            });

            console.log(`Image uploaded for ${mapData.name}`);
          } catch (error) {
            console.error(`Failed to upload image for ${mapData.name}:`, error);
          }
        }
      }

      console.log(`Successfully processed map: ${mapData.name}`);
    } catch (error) {
      console.error(`Error processing map data for ${mapFile}:`, error);
    }
  }
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
