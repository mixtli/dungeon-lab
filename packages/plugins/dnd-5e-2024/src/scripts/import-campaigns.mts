import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { nextUser } from './import-utils.mjs';
import { configureApiClient, CampaignsClient, ActorsClient } from '@dungeon-lab/client/index.mjs';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;

// Configure API client
configureApiClient(API_BASE_URL, API_AUTH_TOKEN);

// Create client instances
const actorsClient = new ActorsClient();
const campaignsClient = new CampaignsClient();

// Display initial configuration
console.log(`Using API URL: ${API_BASE_URL}`);
console.log(`Authentication: ${API_AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);

// Map to store UUID to actor ID mappings
const uuidToActorId = new Map<string, string>();

// Fetch all character actors and create UUID to ID mapping
async function mapCharacterIds(): Promise<void> {
  try {
    console.log('Fetching all character actors...');
    const actors = await actorsClient.getActors({ type: 'character' });

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
        const campaigns = await campaignsClient.getCampaigns();
        existingCampaign = campaigns.find(
          (c: { id: string; name: string }) => c.name === campaignData.name
        );
        console.log(`Found ${campaigns.length} campaigns`);
        console.log(
          existingCampaign
            ? `Found existing campaign: ${existingCampaign.name}`
            : 'No existing campaign found'
        );
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

      // Create or update the campaign
      if (existingCampaign) {
        console.log(`Updating existing campaign: ${campaignData.name}`);

        // Create a partial update object according to the patch schema
        const updateData = {
          name: campaignData.name,
          description: campaignData.description || '',
          gameSystemId: 'dnd-5e-2024',
          characterIds: actorIds as string[],
          status: 'active',
          setting: campaignData.setting || '',
          startDate: campaignData.start_date || new Date().toISOString()
        };

        // Use type assertion to work around type mismatch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await campaignsClient.updateCampaign(existingCampaign.id, updateData as any);
        console.log(`Campaign '${campaignData.name}' updated successfully`);
      } else {
        // Get user ID for creator field
        const userId = await nextUser();

        if (!userId) {
          console.warn(`Couldn't get user ID for campaign: ${campaignData.name}`);
          continue;
        }

        // Create campaign object according to create schema
        const createData = {
          name: campaignData.name,
          description: campaignData.description || '',
          gameSystemId: 'dnd-5e-2024',
          characterIds: actorIds as string[],
          status: 'active',
          setting: campaignData.setting || '',
          startDate: campaignData.start_date || new Date().toISOString(),
          gameMasterId: userId
          // createdBy is handled by the server
        } as const;

        console.log(`Creating new campaign: ${campaignData.name}`);
        console.log(createData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await campaignsClient.createCampaign(createData);
        console.log(`Campaign '${campaignData.name}' created with ID ${response.id}`);
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

    // Map character UUIDs to actor IDs
    await mapCharacterIds();

    // Import campaigns
    await importCampaigns();

    console.log('Campaign import completed successfully');
  } catch (error) {
    console.error('Campaign import failed:', error);
  }
}

// Run the main function
main();
