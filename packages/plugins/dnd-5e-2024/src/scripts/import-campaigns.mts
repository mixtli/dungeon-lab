#!/usr/bin/env tsx

/**
 * Campaign Import Script
 * 
 * Imports campaign JSON files from plugins/dnd-5e-2024/data/campaigns/
 * into the system database and assigns characters to campaigns by matching
 * userData.uuid fields.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Import models from the server package
import { CampaignModel } from '../../../../server/src/features/campaigns/models/campaign.model.mjs';
import { DocumentModel } from '../../../../server/src/features/documents/models/document.model.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CampaignData {
  name: string;
  setting?: string;
  description?: string;
  characters: string[]; // Array of UUIDs that match userData.uuid in character documents
  start_date?: string;
}

interface ImportResult {
  campaignName: string;
  campaignId: string;
  charactersAssigned: number;
  charactersNotFound: string[];
  errors: string[];
}

class CampaignImporter {
  private dryRun: boolean = false;
  
  constructor(dryRun = false) {
    this.dryRun = dryRun;
  }

  async connectToDatabase(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  }

  async loadCampaignFiles(): Promise<CampaignData[]> {
    const campaignsDir = path.join(__dirname, '../../data/campaigns');
    console.log(`📂 Loading campaigns from: ${campaignsDir}`);

    try {
      const files = await fs.readdir(campaignsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`📄 Found ${jsonFiles.length} campaign files: ${jsonFiles.join(', ')}`);
      
      const campaigns: CampaignData[] = [];
      
      for (const file of jsonFiles) {
        const filePath = path.join(campaignsDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const campaignData: CampaignData = JSON.parse(fileContent);
        
        console.log(`  📋 Loaded campaign: "${campaignData.name}" with ${campaignData.characters.length} characters`);
        campaigns.push(campaignData);
      }
      
      return campaigns;
    } catch (error) {
      throw new Error(`Failed to load campaign files: ${error}`);
    }
  }

  async importCampaign(campaignData: CampaignData): Promise<ImportResult> {
    const result: ImportResult = {
      campaignName: campaignData.name,
      campaignId: '',
      charactersAssigned: 0,
      charactersNotFound: [],
      errors: []
    };

    try {
      console.log(`\n🏰 Processing campaign: "${campaignData.name}"`);
      
      // Check if campaign already exists
      const existingCampaign = await CampaignModel.findOne({ 
        name: campaignData.name,
        pluginId: 'dnd-5e-2024'
      });

      if (existingCampaign) {
        console.log(`⚠️  Campaign "${campaignData.name}" already exists, skipping...`);
        result.campaignId = existingCampaign._id.toString();
        result.errors.push('Campaign already exists');
        return result;
      }

      // Create campaign document
      if (!this.dryRun) {
        // Create a system ObjectId for createdBy/updatedBy/gameMasterId 
        const systemUserId = new mongoose.Types.ObjectId();
        
        const newCampaign = await CampaignModel.create({
          name: campaignData.name,
          description: campaignData.description || '',
          setting: campaignData.setting || '',
          pluginId: 'dnd-5e-2024',
          pluginData: {},
          status: 'active',
          startDate: campaignData.start_date ? new Date().toISOString() : new Date().toISOString(),
          gameMasterId: systemUserId, // Required field
          createdBy: systemUserId, // System-created
          updatedBy: systemUserId
        });
        result.campaignId = newCampaign._id.toString();
        console.log(`✅ Created campaign with ID: ${result.campaignId}`);
      } else {
        result.campaignId = 'DRY_RUN_ID';
        console.log(`🔍 [DRY RUN] Would create campaign "${campaignData.name}"`);
      }

      // Find and update character documents
      console.log(`🔍 Looking for ${campaignData.characters.length} characters...`);

      for (const characterUuid of campaignData.characters) {
        try {
          // Find character document by userData.uuid
          const character = await DocumentModel.findOne({
            'userData.uuid': characterUuid,
            documentType: 'character',
            pluginId: 'dnd-5e-2024'
          });

          if (character) {
            if (!this.dryRun) {
              // Update character with campaignId
              await DocumentModel.updateOne(
                { _id: character._id },
                { 
                  $set: { 
                    campaignId: result.campaignId
                    // updatedBy will be automatically set by the model if needed
                  }
                }
              );
            }
            
            result.charactersAssigned++;
            console.log(`  ✅ ${this.dryRun ? '[DRY RUN] Would assign' : 'Assigned'} character: ${character.name} (${characterUuid})`);
          } else {
            result.charactersNotFound.push(characterUuid);
            console.log(`  ❌ Character not found for UUID: ${characterUuid}`);
          }
        } catch (error) {
          const errorMsg = `Failed to process character ${characterUuid}: ${error}`;
          result.errors.push(errorMsg);
          console.error(`  ❌ ${errorMsg}`);
        }
      }

      console.log(`📊 Campaign "${campaignData.name}" summary:`);
      console.log(`   Characters assigned: ${result.charactersAssigned}`);
      console.log(`   Characters not found: ${result.charactersNotFound.length}`);
      
      if (result.charactersNotFound.length > 0) {
        console.log(`   Missing UUIDs: ${result.charactersNotFound.join(', ')}`);
      }

    } catch (error) {
      const errorMsg = `Failed to import campaign "${campaignData.name}": ${error}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    return result;
  }

  async run(): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    try {
      // Load campaign data
      const campaigns = await this.loadCampaignFiles();
      
      if (campaigns.length === 0) {
        console.log('⚠️  No campaign files found to import');
        return results;
      }

      // Connect to database
      await this.connectToDatabase();

      // Import each campaign
      console.log(`\n🚀 Starting import of ${campaigns.length} campaigns...`);
      
      for (const campaignData of campaigns) {
        const result = await this.importCampaign(campaignData);
        results.push(result);
      }

      // Summary
      console.log('\n📈 Import Summary:');
      console.log('='.repeat(50));
      
      let totalAssigned = 0;
      let totalNotFound = 0;
      let totalErrors = 0;

      for (const result of results) {
        console.log(`Campaign: ${result.campaignName}`);
        console.log(`  Status: ${result.errors.length > 0 ? '❌ Failed' : '✅ Success'}`);
        console.log(`  Characters assigned: ${result.charactersAssigned}`);
        console.log(`  Characters not found: ${result.charactersNotFound.length}`);
        console.log(`  Errors: ${result.errors.length}`);
        
        totalAssigned += result.charactersAssigned;
        totalNotFound += result.charactersNotFound.length;
        totalErrors += result.errors.length;
        console.log('');
      }

      console.log(`Total characters assigned: ${totalAssigned}`);
      console.log(`Total characters not found: ${totalNotFound}`);
      console.log(`Total errors: ${totalErrors}`);

    } catch (error) {
      console.error(`💥 Fatal error during import: ${error}`);
      throw error;
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }

    return results;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database');
  }

  const importer = new CampaignImporter(dryRun);
  
  try {
    await importer.run();
    console.log('\n✅ Campaign import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Campaign import failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}