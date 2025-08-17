import { GameStateService } from '../features/campaigns/services/game-state.service.mjs';
import { serverGameStateWithVirtualsSchema } from '@dungeon-lab/shared/schemas/server-game-state.schema.mjs';
import { generateStateHash } from '../utils/state-hash.mjs';
// import { logger } from '../utils/logger.mjs';
import mongoose from 'mongoose';
import { config } from '../config/index.mjs';

/**
 * Debug script to investigate hash validation inconsistencies
 * Compares hashes between raw loadCampaignData output and Zod-parsed data
 */
async function debugHashValidation() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const gameStateService = new GameStateService();
    
    // Test with existing GameState that has hash validation issues
    const campaignId = '6893140ca9931296918b0442'; // Fellowship of the Ring campaign
    const gameStateId = '68989f54b3686b9a4a99d7d4'; // Existing GameState
    
    console.log(`🔍 Debugging hash validation for campaign: ${campaignId}`);
    console.log(`🔍 Testing with existing GameState: ${gameStateId}\n`);
    
    // Get the existing GameState from database
    console.log('🗂️ Step 1: Getting existing GameState from database...');
    const GameStateModel = (await import('../features/campaigns/models/game-state.model.mjs')).GameStateModel;
    const existingGameState = await GameStateModel.findById(gameStateId).exec();
    
    if (!existingGameState) {
      throw new Error(`GameState not found: ${gameStateId}`);
    }
    
    console.log(`Found GameState - Version: ${existingGameState.version}, Hash: ${existingGameState.hash}`);
    
    // 2. Extract stored state and simulate applyFullStateUpdate validation
    console.log('\n📋 Step 2: Extracting stored state (what applyFullStateUpdate does)...');
    const storedStateData = JSON.parse(JSON.stringify(existingGameState.state));
    console.log('Stored state keys:', Object.keys(storedStateData));
    
    // 3. Parse with Zod schema (what applyFullStateUpdate does at line 159)
    console.log('📝 Step 3: Parsing stored state with Zod schema...');
    const parsedState = serverGameStateWithVirtualsSchema.parse(storedStateData);
    console.log('Parsed state keys:', Object.keys(parsedState));
    
    // 4. Generate hash of parsed data (what validation does at line 162)
    console.log('🔨 Step 4: Generating hash of parsed stored state...');
    const parsedHash = generateStateHash(parsedState);
    console.log(`Stored->Parsed hash: ${parsedHash}`);
    
    // 5. Compare with stored hash
    console.log('\n🎯 HASH VALIDATION CHECK:');
    console.log(`Database hash:     ${existingGameState.hash}`);
    console.log(`Parsed state hash: ${parsedHash}`);
    console.log(`Validation passes: ${existingGameState.hash === parsedHash ? '✅ YES' : '❌ NO'}`);
    
    // 6. Also test the fresh data generation path
    console.log('\n\n🔄 TESTING FRESH DATA GENERATION PATH:');
    console.log('📋 Step 6: Reinitializing game state with fresh campaign data...');
    const reinitResult = await gameStateService.initializeGameState(campaignId);
    if (!reinitResult.success) {
      console.log(`❌ Failed to reinitialize game state: ${reinitResult.error?.message}`);
      return;
    }
    
    // Get the fresh state data
    const freshStateData = await gameStateService.getGameState(campaignId);
    if (!freshStateData) {
      console.log(`❌ Failed to get game state after reinitialization`);
      return;
    }
    const rawState = freshStateData.gameState;
    if (!rawState) {
      console.log(`❌ No game state data found after reinitialization`);
      return;
    }
    
    console.log('🔨 Step 7: Generating hash of fresh raw data...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawHash = generateStateHash(rawState as any); // Type assertion for debug script
    console.log(`Fresh raw data hash: ${rawHash}`);
    
    console.log('📝 Step 8: Parsing fresh data with Zod schema...');
    const parsedFreshState = serverGameStateWithVirtualsSchema.parse(rawState);
    
    console.log('🔨 Step 9: Generating hash of parsed fresh data...');
    const parsedFreshHash = generateStateHash(parsedFreshState);
    console.log(`Fresh parsed hash: ${parsedFreshHash}`);
    
    // 7. Compare all hashes
    console.log('\n🎯 COMPLETE HASH COMPARISON:');
    console.log(`Database stored hash:        ${existingGameState.hash}`);
    console.log(`Database->Parsed hash:       ${parsedHash}`);
    console.log(`Fresh raw data hash:         ${rawHash}`);
    console.log(`Fresh data->Parsed hash:     ${parsedFreshHash}`);
    console.log(`\nDB validation passes:        ${existingGameState.hash === parsedHash ? '✅ YES' : '❌ NO'}`);
    console.log(`Fresh data consistency:      ${rawHash === parsedFreshHash ? '✅ YES' : '❌ NO'}`);
    console.log(`DB vs Fresh match:           ${existingGameState.hash === rawHash ? '✅ YES' : '❌ NO'}`);
    
    if (existingGameState.hash !== parsedHash) {
      console.log('\n🔍 ANALYZING DIFFERENCES:');
      
      // Compare JSON strings to see what's different
      const rawJson = JSON.stringify(rawState, null, 2);
      const parsedJson = JSON.stringify(parsedState, null, 2);
      
      console.log('Raw data structure keys:', Object.keys(rawState!));
      console.log('Parsed data structure keys:', Object.keys(parsedState));
      
      // Check for differences in nested structures
      console.log('\nCampaign comparison:');
      console.log('Raw campaign:', rawState!.campaign ? 'present' : 'null');
      console.log('Parsed campaign:', parsedState.campaign ? 'present' : 'null');
      
      console.log('\nDocuments comparison:');
      const rawDocumentsCount = Object.keys(rawState!.documents || {}).length;
      const parsedDocumentsCount = Object.keys(parsedState.documents || {}).length;
      console.log('Raw documents count:', rawDocumentsCount);
      console.log('Parsed documents count:', parsedDocumentsCount);
      
      if (rawDocumentsCount > 0) {
        const rawDocuments = Object.values(rawState!.documents || {});
        const parsedDocuments = Object.values(parsedState.documents || {});
        const rawDoc = rawDocuments[0];
        const parsedDoc = parsedDocuments[0];
        console.log('First document raw keys:', Object.keys(rawDoc || {}));
        console.log('First document parsed keys:', Object.keys(parsedDoc || {}));
        
        // Check specific fields that might be different
        console.log('\nFirst character field comparison:');
        // console.log('Raw createdAt type:', typeof rawChar?.createdAt);
        // console.log('Parsed createdAt type:', typeof parsedChar?.createdAt);
        // console.log('Raw updatedAt type:', typeof rawChar?.updatedAt);
        // console.log('Parsed updatedAt type:', typeof parsedChar?.updatedAt);
      }
      
      // Save detailed comparison to files for analysis
      await import('fs').then(fs => {
        fs.writeFileSync('/tmp/raw-state.json', rawJson);
        fs.writeFileSync('/tmp/parsed-state.json', parsedJson);
        console.log('\n📁 Detailed JSON saved to:');
        console.log('  Raw: /tmp/raw-state.json');
        console.log('  Parsed: /tmp/parsed-state.json');
      });
    }
    
    console.log('\n✅ Debug analysis complete');
    
  } catch (error) {
    console.error('❌ Error during hash debug:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugHashValidation()
    .then(() => {
      console.log('\n🎉 Hash validation debug completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Hash validation debug failed:', error);
      process.exit(1);
    });
}

export { debugHashValidation };