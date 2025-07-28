#!/usr/bin/env tsx

/**
 * Test script to check typed monster converter
 */

import { TypedMonsterConverter } from '../5etools-converter/pipeline/typed-monster-converter.mjs';

async function testTypedMonsterConverter() {
  console.log('🔍 Testing typed monster converter...\n');

  try {
    const converter = new TypedMonsterConverter({
      includeAssets: false
    });

    const result = await converter.convertMonsters();

    if (result.success && result.results.length > 0) {
      console.log(`📊 Total monsters: ${result.results.length}`);
      console.log(`✅ Successfully converted: ${result.stats.converted}`);
      console.log(`❌ Errors: ${result.stats.errors}\n`);
      
      // Show some examples
      console.log('📝 First 5 monster examples:');
      result.results.slice(0, 5).forEach((monster, index) => {
        console.log(`${index + 1}. ${monster.name}`);
        console.log(`   Type: ${monster.pluginData.type} (${monster.pluginData.size})`);
        console.log(`   CR: ${monster.pluginData.challengeRating}`);
        console.log(`   Document Type: ${monster.documentType}`);
        console.log(`   Plugin Document Type: ${monster.pluginDocumentType}`);
        console.log('');
      });

      // Show creature type distribution
      const typeDistribution = result.results.reduce((acc, monster) => {
        const type = monster.pluginData.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('🔍 Creature type distribution:');
      Object.entries(typeDistribution)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count} creatures`);
        });

    } else {
      console.log('❌ No monsters converted or conversion failed');
      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testTypedMonsterConverter().catch(console.error);