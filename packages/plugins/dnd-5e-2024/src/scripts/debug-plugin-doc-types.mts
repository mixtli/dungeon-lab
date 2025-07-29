#!/usr/bin/env tsx

/**
 * Debug script to check plugin document types
 */

import { TypedItemConverter } from '../5etools-converter/pipeline/typed-item-converter.mjs';

async function debugPluginDocTypes() {
  console.log('🔍 Debugging plugin document types...\n');

  try {
    const converter = new TypedItemConverter({
      includeAssets: false
    });

    const result = await converter.convertItems();

    if (result.success && result.results.length > 0) {
      console.log(`📊 Total items: ${result.results.length}`);
      
      // Count by plugin document type
      const pluginTypeCounts = result.results.reduce((acc, item) => {
        const pluginType = item.pluginDocumentType;
        acc[pluginType] = (acc[pluginType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n🔌 Plugin document type distribution:');
      Object.entries(pluginTypeCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} items`);
      });

      // Show examples of each plugin type
      console.log('\n📝 Examples by plugin document type:');
      Object.keys(pluginTypeCounts).forEach(pluginType => {
        const examples = result.results
          .filter(item => item.pluginDocumentType === pluginType)
          .slice(0, 5);
        
        console.log(`\n   ${pluginType.toUpperCase()} (${examples.length} shown):`);
        examples.forEach(item => {
          console.log(`     - ${item.name} (itemType: ${item.pluginData.itemType})`);
          if (item.pluginData.itemType === 'armor') {
            console.log(`       Armor type: ${item.pluginData.type || 'undefined'}`);
          }
        });
      });

    } else {
      console.log('❌ No items converted or conversion failed');
    }

  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

debugPluginDocTypes().catch(console.error);