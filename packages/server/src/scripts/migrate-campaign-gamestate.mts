import mongoose from 'mongoose';
import { GameStateService } from '../features/campaigns/services/game-state.service.mjs';
import { CampaignModel } from '../features/campaigns/models/campaign.model.mjs';
import { GameStateModel } from '../features/campaigns/models/game-state.model.mjs';
import { logger } from '../utils/logger.mjs';
import { config } from '../config/index.mjs';
import { generateStateHash } from '../utils/state-hash.mjs';

// Import all models to ensure they're registered
import '../models/user.model.mjs';
import '../features/assets/models/asset.model.mjs';
import '../features/documents/models/document.model.mjs';
import '../features/encounters/models/encounter.model.mjs';

interface MigrationStats {
  totalCampaigns: number;
  campaignsMigrated: number;
  campaignsSkipped: number;
  campaignsFailed: number;
  hashesRegenerated: number;
  hashesSkipped: number;
  hashesFailed: number;
  errors: Array<{ campaignId: string; campaignName: string; error: string }>;
}

async function migrateCampaignGameStates(dryRun = false, regenerateHashes = false, forceRegenerate = false) {
  const stats: MigrationStats = {
    totalCampaigns: 0,
    campaignsMigrated: 0,
    campaignsSkipped: 0,
    campaignsFailed: 0,
    hashesRegenerated: 0,
    hashesSkipped: 0,
    hashesFailed: 0,
    errors: []
  };

  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to database for GameState migration');

    if (dryRun) {
      logger.info('🔍 DRY RUN MODE - No changes will be made');
    }

    if (regenerateHashes) {
      logger.info('🔄 HASH REGENERATION MODE - Will recalculate hashes for existing GameState records');
    }

    if (forceRegenerate) {
      logger.info('🔥 FORCE REGENERATE MODE - Will delete and recreate all GameState records from scratch');
    }

    // Get all campaigns
    const campaigns = await CampaignModel.find({}).select('_id name').exec();
    stats.totalCampaigns = campaigns.length;
    
    const mode = forceRegenerate ? 'GameState force regeneration' : 
                 regenerateHashes ? 'hash regeneration' : 'GameState migration';
    logger.info(`Found ${campaigns.length} campaigns to check for ${mode}`);

    if (campaigns.length === 0) {
      logger.info('No campaigns found - migration complete');
      return stats;
    }

    const gameStateService = new GameStateService();

    for (const campaign of campaigns) {
      const campaignId = campaign.id;
      const campaignName = campaign.name;

      try {
        logger.info(`Processing campaign: ${campaignName} (${campaignId})`);

        // Check if GameState already exists
        const existingGameState = await GameStateModel.findOne({ campaignId }).exec();
        
        if (existingGameState) {
          if (forceRegenerate) {
            // Delete existing GameState to force complete regeneration
            logger.info(`  🔥 Deleting existing GameState for forced regeneration (version: ${existingGameState.version})`);
            
            if (dryRun) {
              logger.info(`    🔍 Would delete GameState record ${existingGameState._id}`);
            } else {
              await GameStateModel.deleteOne({ _id: existingGameState._id }).exec();
              logger.info(`    🗑️  Existing GameState deleted successfully`);
            }
            // Continue to recreation logic below
          } else if (regenerateHashes) {
            // Regenerate hash for existing GameState
            try {
              logger.info(`  🔄 Regenerating hash for existing GameState (version: ${existingGameState.version})`);
              
              // Extract the state from the new GameState structure and generate hash
              const gameStateToHash = JSON.parse(JSON.stringify(existingGameState.state));
              const newHash = generateStateHash(gameStateToHash);
              
              if (dryRun) {
                logger.info(`    🔍 Would update hash from ${existingGameState.hash?.substring(0, 16)}... to ${newHash.substring(0, 16)}...`);
                stats.hashesRegenerated++;
              } else {
                // Update the hash in the database
                await GameStateModel.updateOne(
                  { _id: existingGameState._id },
                  { hash: newHash }
                ).exec();
                
                logger.info(`    ✅ Hash updated successfully`);
                stats.hashesRegenerated++;
              }
              
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              logger.error(`    ❌ Failed to regenerate hash: ${errorMsg}`);
              stats.hashesFailed++;
              stats.errors.push({
                campaignId,
                campaignName,
                error: `Hash regeneration failed: ${errorMsg}`
              });
            }
            continue;
          } else {
            logger.info(`  ✅ GameState already exists (version: ${existingGameState.version})`);
            stats.campaignsSkipped++;
            continue;
          }
        }

        if (dryRun) {
          logger.info(`  🔄 Would create GameState for campaign: ${campaignName}`);
          stats.campaignsMigrated++;
          continue;
        }

        // Use the existing initializeGameState method which handles everything
        logger.info(`  🔄 Creating GameState for campaign...`);
        const result = await gameStateService.initializeGameState(campaignId);

        if (result.success) {
          logger.info(`  ✅ GameState created successfully (version: ${result.newVersion})`);
          stats.campaignsMigrated++;
        } else {
          const errorMsg = result.error?.message || 'Unknown error during initialization';
          logger.error(`  ❌ Failed to create GameState: ${errorMsg}`);
          stats.campaignsFailed++;
          stats.errors.push({
            campaignId,
            campaignName,
            error: errorMsg
          });
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`  ❌ Error processing campaign ${campaignName}: ${errorMsg}`);
        stats.campaignsFailed++;
        stats.errors.push({
          campaignId,
          campaignName,
          error: errorMsg
        });
      }
    }

    // Print final statistics
    logger.info('🎉 Migration completed!');
    logger.info('📊 Migration Statistics:');
    logger.info(`  Total campaigns: ${stats.totalCampaigns}`);
    
    if (regenerateHashes) {
      logger.info(`  Hashes regenerated: ${stats.hashesRegenerated}`);
      logger.info(`  Hash regeneration failed: ${stats.hashesFailed}`);
    } else if (forceRegenerate) {
      logger.info(`  GameStates force regenerated: ${stats.campaignsMigrated}`);
      logger.info(`  GameState regeneration failed: ${stats.campaignsFailed}`);
    } else {
      logger.info(`  GameStates created: ${stats.campaignsMigrated}`);
      logger.info(`  Already had GameState: ${stats.campaignsSkipped}`);
    }
    
    logger.info(`  Failed: ${stats.campaignsFailed}`);

    if (stats.errors.length > 0) {
      logger.warn('⚠️  Errors encountered:');
      for (const error of stats.errors) {
        logger.warn(`  - ${error.campaignName} (${error.campaignId}): ${error.error}`);
      }
    }

    if (dryRun) {
      logger.info('🔍 DRY RUN COMPLETE - No actual changes were made');
    }

    process.exit(stats.campaignsFailed > 0 ? 1 : 0);

  } catch (error) {
    logger.error('💥 Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const regenerateHashes = args.includes('--regenerate-hashes') || args.includes('--update-hashes');
const forceRegenerate = args.includes('--force-regenerate') || args.includes('--force');

// Validation: force-regenerate and regenerate-hashes are mutually exclusive
if (forceRegenerate && regenerateHashes) {
  logger.error('❌ --force-regenerate and --regenerate-hashes flags cannot be used together');
  logger.info('💡 Use --force-regenerate to delete and recreate GameState records');
  logger.info('💡 Use --regenerate-hashes to update hashes only');
  process.exit(1);
}

// Run the migration
migrateCampaignGameStates(dryRun, regenerateHashes, forceRegenerate);