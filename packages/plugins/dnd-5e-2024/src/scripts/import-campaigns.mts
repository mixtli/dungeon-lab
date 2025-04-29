import axios from 'axios';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { nextUser } from './import-utils.mjs';
import * as campaignsClient from '@dungeon-lab/client/campaigns.client.mjs';

// Get the directory path
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

console.log('API_AUTH_TOKEN', API_AUTH_TOKEN);
// Set auth token from environment variable
if (API_AUTH_TOKEN) {
  api.defaults.headers.common['Authorization'] = `Bearer ${API_AUTH_TOKEN}`;
  console.log('Using API token from environment');
} else {
  console.warn('Warning: API_AUTH_TOKEN not provided. Falling back to credentials login.');
}

// Map to store UUID to actor ID mappings
const uuidToActorId = new Map<string, string>();
// User information
let currentUserId: string;

// Get user info or login if token not provided
async function getUserInfo(): Promise<void> {
  // Get current user info to use as game master
  const userResponse = await api.get('/api/auth/me');
  currentUserId = userResponse.data.data.id;
  console.log(`Current user ID: ${currentUserId}`);

  if (!currentUserId) {
    console.error(userResponse.data);
    throw new Error('Failed to get current user ID');
  }
}

// Fetch all character actors and create UUID to ID mapping
async function mapCharacterIds(): Promise<void> {
  try {
    console.log('Fetching all character actors...');
    const response = await api.get('/api/actors', {
      params: { type: 'character' }
    });

    const actors = response.data;
    console.log(`Found ${actors.length} character actors`);

    // Debug the first actor structure to understand where UUID is stored
    if (actors.length > 0) {
      console.log('First actor structure example:');
      console.log(JSON.stringify(actors[0], null, 2));
    }

    // Map UUID to actor ID - checking various possible locations for the UUID
    let mappedCount = 0;
    for (const actor of actors) {
      // Try different potential locations for UUID
      const uuid = actor.userData?.uuid;

      if (uuid) {
        uuidToActorId.set(uuid, actor.id);
        console.log(`Mapped UUID ${uuid} to actor ID ${actor.id}`);
        mappedCount++;
      }
    }

    console.log(`Created mapping for ${mappedCount} characters`);

    // If no mappings were created, something might be wrong with our UUID path
    if (mappedCount === 0 && actors.length > 0) {
      console.warn(
        'WARNING: No UUID mappings created. UUID might be located in a different path in the actor data structure.'
      );
    }
  } catch (error) {
    console.error('Error mapping character IDs:', error);
    throw error;
  }
}

// Import campaigns from JSON files
async function importCampaigns(): Promise<void> {
  try {
    const campaignsDir = join(__dirname, '../../data/campaigns');
    console.log(`Reading campaign files from ${campaignsDir}`);
    const campaignFiles = readdirSync(campaignsDir).filter((f) => f.endsWith('.json'));

    console.log(`Found ${campaignFiles.length} campaign files to import`);

    for (const campaignFile of campaignFiles) {
      console.log(`Processing campaign file: ${campaignFile}`);
      const campaignData = JSON.parse(readFileSync(join(campaignsDir, campaignFile), 'utf-8'));

      // Check if campaign already exists by name
      let existingCampaign: { id: string; name: string } | undefined;
      try {
        const searchResponse = await api.get('/api/campaigns', {
          params: { name: campaignData.name }
        });
        existingCampaign = searchResponse.data.find(
          (c: { id: string; name: string }) => c.name === campaignData.name
        );
        console.log(searchResponse.data);
        console.log(existingCampaign);
      } catch (error) {
        console.warn(`Error checking if campaign '${campaignData.name}' exists:`, error);
      }

      // Map the character UUIDs to actor IDs
      const actorIds = (campaignData.characters || [])
        .map((uuid: string) => {
          const actorId = uuidToActorId.get(uuid);
          if (!actorId) {
            console.warn(`No actor found for UUID ${uuid}`);
          }
          return actorId;
        })
        .filter(Boolean); // Filter out undefined values

      // Warning if no actor IDs were mapped
      if (actorIds.length === 0) {
        console.warn(
          `WARNING: No actor IDs were mapped for campaign '${campaignData.name}'. Check character UUIDs.`
        );
      }

      // Prepare campaign object for API
      const campaignApiData: Record<string, unknown> = {
        name: campaignData.name,
        description: campaignData.description || '',
        gameSystemId: 'dnd-5e-2024',
        members: actorIds,
        status: 'active',
        setting: campaignData.setting || '',
        startDate: campaignData.start_date || new Date().toISOString()
      };

      // Create or update the campaign
      if (existingCampaign) {
        console.log(`Updating existing campaign: ${campaignData.name}`);
        await api.put(`/api/campaigns/${existingCampaign.id}`, campaignApiData);
        console.log(`Campaign '${campaignData.name}' updated successfully`);
      } else {
        const u = nextUser.next();
        campaignApiData.createdBy = u;
        campaignApiData.gameMasterId = u;
        console.log(`Creating new campaign: ${campaignData.name}`);
        console.log(campaignApiData);
        const response = await api.post('/api/campaigns', campaignApiData);
        console.log(`Campaign '${campaignData.name}' created with ID ${response.data.id}`);
      }
    }

    console.log('All campaigns imported successfully');
  } catch (error) {
    console.error('Error importing campaigns:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting campaign import...');

    // Get user info or login
    //await getUserInfo();

    // Map character UUIDs to actor IDs
    await mapCharacterIds();

    // Import campaigns
    await importCampaigns();

    console.log('Campaign import completed successfully');
  } catch (error) {
    console.error('Campaign import failed:', error);
    process.exit(1);
  }
}

// Run the main function
main();
