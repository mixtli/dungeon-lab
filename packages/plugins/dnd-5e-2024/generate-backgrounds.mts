#!/usr/bin/env node

/**
 * Generate backgrounds compendium
 */
import { CompendiumPackGenerator } from './src/5etools-converter/generator/compendium-pack-generator.mjs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateBackgrounds() {
  const outputDir = join(__dirname, 'compendium-output', 'backgrounds-pack');
  
  const generator = new CompendiumPackGenerator({
    outputDir,
    name: 'D&D 5e Backgrounds',
    contentTypes: ['backgrounds'],
    srdOnly: true, // Only SRD content for now
    includeAssets: false // Skip assets for faster generation
  });

  console.log('🎯 Generating backgrounds compendium...');
  await generator.generate();
}

// Run the generator
generateBackgrounds().catch(error => {
  console.error('Failed to generate compendium:', error);
  process.exit(1);
});