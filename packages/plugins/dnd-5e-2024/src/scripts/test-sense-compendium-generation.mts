#!/usr/bin/env tsx

/**
 * Test script to check sense compendium generation
 */

import { CompendiumPackGenerator } from '../5etools-converter/generator/compendium-pack-generator.mjs';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

async function testSenseCompendiumGeneration() {
  console.log('👁️ Testing sense compendium generation...\n');

  // Create temporary directory for output
  const tempDir = await mkdtemp(join(tmpdir(), 'dungeon-lab-sense-test-'));
  console.log(`📁 Output directory: ${tempDir}`);

  try {
    const generator = new CompendiumPackGenerator({
      outputDir: tempDir,
      name: 'Sense Test Pack',
      contentTypes: ['senses'], // Only test senses
      srdOnly: true, // Limit to SRD content for faster testing
      includeAssets: false // Skip assets for speed
    });

    await generator.generate();
    
    console.log('\n✅ Sense compendium generation completed successfully!');
    console.log(`📦 Check output at: ${tempDir}`);

  } catch (error) {
    console.error('\n❌ Sense compendium generation failed:', error);
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

testSenseCompendiumGeneration().catch(console.error);