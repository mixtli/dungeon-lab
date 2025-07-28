#!/usr/bin/env tsx

/**
 * Test script to check typed sense converter
 */

import { TypedSenseConverter } from '../5etools-converter/pipeline/typed-sense-converter.mjs';

async function testTypedSenseConverter() {
  console.log('👁️ Testing typed sense converter...\n');

  try {
    const converter = new TypedSenseConverter({
      includeAssets: false
    });

    const result = await converter.convertSenses();

    if (result.success && result.results.length > 0) {
      console.log(`📊 Total senses: ${result.results.length}`);
      console.log(`✅ Successfully converted: ${result.stats.converted}`);
      console.log(`❌ Errors: ${result.stats.errors}\n`);
      
      // Show some examples
      console.log('📝 First 5 sense examples:');
      result.results.slice(0, 5).forEach((sense, index) => {
        console.log(`${index + 1}. ${sense.name}`);
        console.log(`   Description: ${sense.pluginData.description.substring(0, 100)}...`);
        console.log(`   Source: ${sense.pluginData.source || 'Unknown'}`);
        console.log(`   Default Range: ${sense.pluginData.mechanics?.defaultRange || 'N/A'} feet`);
        console.log(`   Works in Darkness: ${sense.pluginData.mechanics?.worksInDarkness ? 'Yes' : 'No'}`);
        console.log(`   Document Type: ${sense.documentType}`);
        console.log(`   Plugin Document Type: ${sense.pluginDocumentType}`);
        console.log('');
      });

      // Show sense mechanics distribution
      const mechanicsStats = result.results.reduce((acc, sense) => {
        const mechanics = sense.pluginData.mechanics;
        if (mechanics?.worksInDarkness) acc.worksInDarkness++;
        if (mechanics?.detectsInvisible) acc.detectsInvisible++;
        if (mechanics?.defaultRange) acc.hasRange++;
        if (mechanics?.detects?.length) acc.hasDetectionTypes++;
        return acc;
      }, { worksInDarkness: 0, detectsInvisible: 0, hasRange: 0, hasDetectionTypes: 0 });

      console.log('🔍 Sense mechanics analysis:');
      console.log(`   Works in darkness: ${mechanicsStats.worksInDarkness} senses`);
      console.log(`   Detects invisible: ${mechanicsStats.detectsInvisible} senses`);
      console.log(`   Has range specified: ${mechanicsStats.hasRange} senses`);
      console.log(`   Has detection types: ${mechanicsStats.hasDetectionTypes} senses`);

      // Show acquisition methods
      const acquisitionStats = result.results.reduce((acc, sense) => {
        const acquisition = sense.pluginData.acquisition;
        if (acquisition?.magicalMeans) acc.magical++;
        if (acquisition?.magicalItems) acc.items++;
        if (acquisition?.spells?.length) acc.spells++;
        return acc;
      }, { magical: 0, items: 0, spells: 0 });

      console.log('\n🎯 Acquisition methods:');
      console.log(`   Can be gained magically: ${acquisitionStats.magical} senses`);
      console.log(`   Can be gained through items: ${acquisitionStats.items} senses`);
      console.log(`   Granted by spells: ${acquisitionStats.spells} senses`);

    } else {
      console.log('❌ No senses converted or conversion failed');
      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testTypedSenseConverter().catch(console.error);