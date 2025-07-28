#!/usr/bin/env tsx

/**
 * Test script to check typed action converter
 */

import { TypedActionConverter } from '../5etools-converter/pipeline/typed-action-converter.mjs';

async function testTypedActionConverter() {
  console.log('⚔️ Testing typed action converter...\n');

  try {
    const converter = new TypedActionConverter({
      includeAssets: false
    });

    const result = await converter.convertActions();

    if (result.success && result.results.length > 0) {
      console.log(`📊 Total actions: ${result.results.length}`);
      console.log(`✅ Successfully converted: ${result.stats.converted}`);
      console.log(`❌ Errors: ${result.stats.errors}\n`);
      
      // Show some examples
      console.log('📝 First 5 action examples:');
      result.results.slice(0, 5).forEach((action, index) => {
        console.log(`${index + 1}. ${action.name}`);
        console.log(`   Description: ${action.pluginData.description.substring(0, 100)}...`);
        console.log(`   Action Type: ${action.pluginData.actionType}`);
        console.log(`   Source: ${action.pluginData.source || 'Unknown'}`);
        console.log(`   Trigger: ${action.pluginData.trigger || 'None'}`);
        console.log(`   Document Type: ${action.documentType}`);
        console.log(`   Plugin Document Type: ${action.pluginDocumentType}`);
        console.log('');
      });

      // Show action type distribution
      const typeStats = result.results.reduce((acc, action) => {
        const type = action.pluginData.actionType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('🎯 Action type distribution:');
      Object.entries(typeStats).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} actions`);
      });

      // Show requirements analysis
      const requirementStats = result.results.reduce((acc, action) => {
        const requirements = action.pluginData.requirements;
        if (requirements?.level) acc.hasLevel++;
        if (requirements?.features?.length) acc.hasFeatures++;
        if (requirements?.equipment?.length) acc.hasEquipment++;
        return acc;
      }, { hasLevel: 0, hasFeatures: 0, hasEquipment: 0 });

      console.log('\n📋 Requirements analysis:');
      console.log(`   Has level requirement: ${requirementStats.hasLevel} actions`);
      console.log(`   Has feature requirement: ${requirementStats.hasFeatures} actions`);
      console.log(`   Has equipment requirement: ${requirementStats.hasEquipment} actions`);

      // Show effects analysis
      const effectStats = result.results.reduce((acc, action) => {
        const effects = action.pluginData.effects;
        if (effects?.attackRoll) acc.attackRoll++;
        if (effects?.savingThrow) acc.savingThrow++;
        if (effects?.damage) acc.damage++;
        if (effects?.area) acc.area++;
        if (effects?.range) acc.range++;
        return acc;
      }, { attackRoll: 0, savingThrow: 0, damage: 0, area: 0, range: 0 });

      console.log('\n⚡ Effects analysis:');
      console.log(`   Requires attack roll: ${effectStats.attackRoll} actions`);
      console.log(`   Requires saving throw: ${effectStats.savingThrow} actions`);
      console.log(`   Deals damage: ${effectStats.damage} actions`);
      console.log(`   Has area effect: ${effectStats.area} actions`);
      console.log(`   Has range specified: ${effectStats.range} actions`);

      // Show usage limitation analysis
      const usageStats = result.results.reduce((acc, action) => {
        const uses = action.pluginData.uses;
        if (uses) {
          acc.limited++;
          acc.byType[uses.per] = (acc.byType[uses.per] || 0) + 1;
        } else {
          acc.unlimited++;
        }
        return acc;
      }, { limited: 0, unlimited: 0, byType: {} as Record<string, number> });

      console.log('\n🔄 Usage limitations:');
      console.log(`   Unlimited use: ${usageStats.unlimited} actions`);
      console.log(`   Limited use: ${usageStats.limited} actions`);
      Object.entries(usageStats.byType).forEach(([type, count]) => {
        console.log(`     Per ${type}: ${count} actions`);
      });

    } else {
      console.log('❌ No actions converted or conversion failed');
      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testTypedActionConverter().catch(console.error);