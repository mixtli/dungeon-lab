#!/usr/bin/env tsx

/**
 * Test script to check action compendium generation
 */

import { CompendiumPackGenerator } from '../5etools-converter/generator/compendium-pack-generator.mjs';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

async function testActionCompendiumGeneration() {
  console.log('⚔️ Testing action compendium generation...\n');

  // Create temporary directory for output
  const tempDir = await mkdtemp(join(tmpdir(), 'dungeon-lab-action-test-'));
  console.log(`📁 Output directory: ${tempDir}`);

  try {
    const generator = new CompendiumPackGenerator({
      outputDir: tempDir,
      name: 'Action Test Pack',
      contentTypes: ['actions'], // Only test actions
      srdOnly: true, // Limit to SRD content for faster testing
      includeAssets: false // Skip assets for speed
    });

    await generator.generate();
    
    console.log('\n✅ Action compendium generation completed successfully!');
    console.log(`📦 Check output at: ${tempDir}`);

  } catch (error) {
    console.error('\n❌ Action compendium generation failed:', error);
    process.exit(1);
  } finally {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned up temporary directory: ${tempDir}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to clean up ${tempDir}:`, cleanupError);
    }
  }
}

testActionCompendiumGeneration().catch(console.error);