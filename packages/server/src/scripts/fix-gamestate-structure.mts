import mongoose from 'mongoose';
import { GameStateModel } from '../features/campaigns/models/game-state.model.mjs';
import { logger } from '../utils/logger.mjs';
import { config } from '../config/index.mjs';
import { generateStateHash } from '../utils/state-hash.mjs';

// Import all models to ensure they're registered
import '../models/user.model.mjs';
import '../features/assets/models/asset.model.mjs';
import '../features/documents/models/document.model.mjs';

interface StructureFixStats {
  gameStatesChecked: number;
  gameStatesFixed: number;
  gameStatesFailed: number;
  errors: Array<{ gameStateId: string; error: string }>;
}

/**
 * Fix GameState structure inconsistencies:
 * 1. Ensure pluginData field exists
 * 2. Update hashes to match the corrected structure
 */
async function fixGameStateStructure(dryRun = false) {
  const stats: StructureFixStats = {
    gameStatesChecked: 0,
    gameStatesFixed: 0,
    gameStatesFailed: 0,
    errors: []
  };

  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to database for GameState structure fix');

    if (dryRun) {
      logger.info('🔍 DRY RUN MODE - No changes will be made');
    }

    // Get all GameState documents
    const gameStates = await GameStateModel.find({}).exec();
    stats.gameStatesChecked = gameStates.length;
    
    logger.info(`Found ${gameStates.length} GameState documents to check`);

    if (gameStates.length === 0) {
      logger.info('No GameState documents found');
      return stats;
    }

    for (const gameState of gameStates) {
      try {
        const gameStateId = gameState._id.toString();
        logger.info(`Processing GameState: ${gameStateId} (campaign: ${gameState.campaignId})`);

        // Extract current state
        const currentState = JSON.parse(JSON.stringify(gameState.state));
        let needsUpdate = false;
        const changes: string[] = [];

        // Fix 1: Ensure pluginData field exists
        if (!Object.prototype.hasOwnProperty.call(currentState, 'pluginData')) {
          currentState.pluginData = {};
          needsUpdate = true;
          changes.push('Added missing pluginData field');
        }

        // Fix 2: Ensure all required top-level fields exist
        const requiredFields = {
          campaign: null,
          characters: [],
          actors: [],
          items: [],
          currentEncounter: null,
          pluginData: {},
          turnManager: null
        };

        for (const [field, defaultValue] of Object.entries(requiredFields)) {
          if (!Object.prototype.hasOwnProperty.call(currentState, field)) {
            currentState[field] = defaultValue;
            needsUpdate = true;
            changes.push(`Added missing ${field} field`);
          }
        }

        if (!needsUpdate) {
          logger.info(`  ✅ GameState ${gameStateId} structure is already correct`);
          continue;
        }

        if (dryRun) {
          logger.info(`  🔍 Would fix GameState ${gameStateId}: ${changes.join(', ')}`);
          stats.gameStatesFixed++;
          continue;
        }

        // Generate new hash for the corrected structure
        const newHash = generateStateHash(currentState);
        const oldHash = gameState.hash;

        // Update the GameState document
        const updateResult = await GameStateModel.updateOne(
          { _id: gameState._id },
          {
            $set: {
              state: currentState,
              hash: newHash,
              lastUpdate: Date.now()
            }
          }
        ).exec();

        if (updateResult.modifiedCount > 0) {
          logger.info(`  ✅ Fixed GameState ${gameStateId}:`, {
            changes,
            oldHash: oldHash?.substring(0, 16) + '...',
            newHash: newHash.substring(0, 16) + '...'
          });
          stats.gameStatesFixed++;
        } else {
          logger.warn(`  ⚠️  No changes made to GameState ${gameStateId}`);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`  ❌ Failed to fix GameState ${gameState._id}: ${errorMsg}`);
        stats.gameStatesFailed++;
        stats.errors.push({
          gameStateId: gameState._id.toString(),
          error: errorMsg
        });
      }
    }

    // Print final statistics
    logger.info('🎉 GameState structure fix completed!');
    logger.info('📊 Fix Statistics:');
    logger.info(`  GameStates checked: ${stats.gameStatesChecked}`);
    logger.info(`  GameStates fixed: ${stats.gameStatesFixed}`);
    logger.info(`  GameStates failed: ${stats.gameStatesFailed}`);

    if (stats.errors.length > 0) {
      logger.warn('⚠️  Errors encountered:');
      for (const error of stats.errors) {
        logger.warn(`  - ${error.gameStateId}: ${error.error}`);
      }
    }

    if (dryRun) {
      logger.info('🔍 DRY RUN COMPLETE - No actual changes were made');
    }

    process.exit(stats.gameStatesFailed > 0 ? 1 : 0);

  } catch (error) {
    logger.error('💥 Fatal error during GameState structure fix:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

// Run the structure fix
logger.info('🚀 Starting GameState structure fix', { dryRun });
fixGameStateStructure(dryRun);