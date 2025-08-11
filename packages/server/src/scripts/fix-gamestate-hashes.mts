// import { GameStateService } from '../features/campaigns/services/game-state.service.mjs';
import { GameStateModel } from '../features/campaigns/models/game-state.model.mjs';
import { serverGameStateWithVirtualsSchema } from '@dungeon-lab/shared/schemas/server-game-state.schema.mjs';
import { generateStateHash } from '../utils/state-hash.mjs';
// import { logger } from '../utils/logger.mjs';
import mongoose from 'mongoose';
import { config } from '../config/index.mjs';

/**
 * Fix existing GameState hashes by parsing with Zod and regenerating hashes
 * This ensures consistency between hash creation and validation
 */
async function fixGameStateHashes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get all GameStates
    console.log('\n📋 Finding all GameStates...');
    const gameStates = await GameStateModel.find({}).exec();
    console.log(`Found ${gameStates.length} GameStates to process`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const gameState of gameStates) {
      try {
        console.log(`\n🔄 Processing GameState ${gameState.id} (Campaign: ${gameState.campaignId})...`);
        
        // Extract current stored state
        const storedStateData = JSON.parse(JSON.stringify(gameState.state));
        console.log(`  Current hash: ${gameState.hash}`);
        
        // Parse with Zod schema to add missing defaults
        const parsedState = serverGameStateWithVirtualsSchema.parse(storedStateData);
        
        // Generate new hash based on parsed state
        const newHash = generateStateHash(parsedState);
        console.log(`  New hash:     ${newHash}`);
        
        if (gameState.hash !== newHash) {
          console.log(`  ⚠️  Hash mismatch - updating...`);
          
          // Update GameState with parsed state and new hash
          await GameStateModel.findByIdAndUpdate(
            gameState.id,
            {
              state: parsedState,  // Store parsed state with proper defaults
              hash: newHash,       // Update hash to match parsed state
              lastUpdate: Date.now()
            }
          ).exec();
          
          console.log(`  ✅ Updated GameState ${gameState.id}`);
          fixedCount++;
        } else {
          console.log(`  ✅ Hash already correct - no update needed`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing GameState ${gameState.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Hash fix complete!`);
    console.log(`  ✅ Fixed: ${fixedCount} GameStates`);
    console.log(`  ❌ Errors: ${errorCount} GameStates`);
    console.log(`  📊 Total processed: ${gameStates.length} GameStates`);
    
  } catch (error) {
    console.error('❌ Error during GameState hash fix:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixGameStateHashes()
    .then(() => {
      console.log('\n🎉 GameState hash fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 GameState hash fix failed:', error);
      process.exit(1);
    });
}

export { fixGameStateHashes };