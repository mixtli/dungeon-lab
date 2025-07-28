#!/usr/bin/env tsx

/**
 * Test script for TypedClassConverter
 * Tests the class conversion pipeline with validation and fluff support
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { TypedClassConverter } from '../5etools-converter/pipeline/typed-class-converter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testTypedClassConverter() {
  console.log('🧪 Testing TypedClassConverter...\n');

  const options = {
    srdOnly: false,
    includeAssets: true,
    textProcessing: {
      extractReferences: true,
      cleanText: true,
      preserveMarkup: false
    }
  };

  const converter = new TypedClassConverter(options);

  try {
    console.log('📋 Converting classes...');
    const result = await converter.convertClasses();

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
        console.log(`   Primary Abilities: ${doc.pluginData.primaryAbilities?.join(', ') || 'None'}`);
        console.log(`   Hit Die: d${doc.pluginData.hitDie}`);
        console.log(`   Features: ${Object.keys(doc.pluginData.features || {}).length} levels`);
        console.log(`   Subclasses: ${doc.pluginData.subclasses?.length || 0}`);
        console.log(`   Spellcasting: ${doc.pluginData.spellcasting ? doc.pluginData.spellcasting.type : 'None'}`);
        console.log(`   Weapon Mastery: ${doc.pluginData.weaponMastery ? 'Yes' : 'No'}`);
        console.log(`   Description: ${doc.pluginData.description.substring(0, 100)}...`);
      }
    }

    const successRate = result.stats.total > 0 ? 
      ((result.stats.converted / result.stats.total) * 100).toFixed(1) : '0.0';
    
    console.log(`\n🎉 Class conversion complete! Success rate: ${successRate}%`);
    
    if (result.success && result.stats.converted > 0) {
      console.log('✅ TypedClassConverter is working correctly!');
    } else {
      console.log('❌ TypedClassConverter needs attention');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testTypedClassConverter().catch(console.error);