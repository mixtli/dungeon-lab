#!/usr/bin/env tsx

/**
 * Test script for TypedSpeciesConverter
 * Tests the species conversion pipeline with validation and fluff support
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { TypedSpeciesConverter } from '../5etools-converter/pipeline/typed-species-converter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testTypedSpeciesConverter() {
  console.log('🧪 Testing TypedSpeciesConverter...\n');

  const options = {
    srdOnly: false,
    includeAssets: true,
    textProcessing: {
      extractReferences: true,
      cleanText: true,
      preserveMarkup: false
    }
  };

  const converter = new TypedSpeciesConverter(options);

  try {
    console.log('📋 Converting species...');
    const result = await converter.convertSpecies();

    console.log('\n📊 Conversion Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📈 Stats: ${result.stats.converted}/${result.stats.total} converted, ${result.stats.errors} errors`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.slice(0, 5).forEach(error => console.log(`   ${error}`));
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more errors`);
      }
    }

    if (result.results.length > 0) {
      console.log('\n🎯 Sample Results:');
      const sampleResults = result.results.slice(0, 3);
      
      for (const doc of sampleResults) {
        console.log(`\n📄 ${doc.name}:`);
        console.log(`   Document Type: ${doc.documentType}`);
        console.log(`   Plugin Document Type: ${doc.pluginDocumentType}`);
        console.log(`   Creature Type: ${doc.pluginData.creatureType}`);
        console.log(`   Size: ${doc.pluginData.size.category} (${doc.pluginData.size.description})`);
        console.log(`   Movement: walk ${doc.pluginData.movement.walk}${doc.pluginData.movement.fly ? `, fly ${doc.pluginData.movement.fly}` : ''}${doc.pluginData.movement.swim ? `, swim ${doc.pluginData.movement.swim}` : ''}`);
        console.log(`   Senses: ${doc.pluginData.senses ? Object.entries(doc.pluginData.senses).map(([k, v]) => `${k} ${v}`).join(', ') : 'None'}`);
        console.log(`   Traits: ${doc.pluginData.traits.length}`);
        console.log(`   Subraces: ${doc.pluginData.subraces?.length || 0}`);
        console.log(`   Ancestries: ${doc.pluginData.ancestryOptions?.length || 0}`);
        console.log(`   Description: ${doc.pluginData.description.substring(0, 100)}...`);
      }
    }

    const successRate = result.stats.total > 0 ? 
      ((result.stats.converted / result.stats.total) * 100).toFixed(1) : '0.0';
    
    console.log(`\n🎉 Species conversion complete! Success rate: ${successRate}%`);
    
    if (result.success && result.stats.converted > 0) {
      console.log('✅ TypedSpeciesConverter is working correctly!');
    } else {
      console.log('❌ TypedSpeciesConverter needs attention');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testTypedSpeciesConverter().catch(console.error);