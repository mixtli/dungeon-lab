#!/usr/bin/env tsx

/**
 * Test script to check typed rule converter
 */

import { TypedRuleConverter } from '../5etools-converter/pipeline/typed-rule-converter.mjs';

async function testTypedRuleConverter() {
  console.log('📖 Testing typed rule converter...\n');

  try {
    const converter = new TypedRuleConverter({
      includeAssets: false
    });

    const result = await converter.convertRules();

    if (result.success && result.results.length > 0) {
      console.log(`📊 Total rules: ${result.results.length}`);
      console.log(`✅ Successfully converted: ${result.stats.converted}`);
      console.log(`❌ Errors: ${result.stats.errors}\n`);
      
      // Show some examples
      console.log('📝 First 5 rule examples:');
      result.results.slice(0, 5).forEach((rule, index) => {
        console.log(`${index + 1}. ${rule.name}`);
        console.log(`   Description: ${rule.pluginData.description.substring(0, 100)}...`);
        console.log(`   Rule Type: ${rule.pluginData.ruleType}`);
        console.log(`   Category: ${rule.pluginData.category || 'None'}`);
        console.log(`   Source: ${rule.pluginData.source || 'Unknown'}`);
        console.log(`   Is Basic Rule: ${rule.pluginData.isBasicRule ? 'Yes' : 'No'}`);
        console.log(`   Document Type: ${rule.documentType}`);
        console.log(`   Plugin Document Type: ${rule.pluginDocumentType}`);
        console.log('');
      });

      // Show rule type distribution
      const typeStats = result.results.reduce((acc, rule) => {
        const type = rule.pluginData.ruleType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('🎯 Rule type distribution:');
      Object.entries(typeStats).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} rules`);
      });

      // Show category distribution
      const categoryStats = result.results.reduce((acc, rule) => {
        const category = rule.pluginData.category || 'uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('\n📂 Category distribution:');
      Object.entries(categoryStats).forEach(([category, count]) => {
        console.log(`   ${category}: ${count} rules`);
      });

      // Show mechanics analysis
      const mechanicsStats = result.results.reduce((acc, rule) => {
        const mechanics = rule.pluginData.mechanics;
        if (mechanics?.modifiesCoreMechanics) acc.modifiesCore++;
        if (mechanics?.complexity === 'simple') acc.simple++;
        if (mechanics?.complexity === 'moderate') acc.moderate++;
        if (mechanics?.complexity === 'complex') acc.complex++;
        if (mechanics?.affects?.length) acc.hasAffects++;
        return acc;
      }, { modifiesCore: 0, simple: 0, moderate: 0, complex: 0, hasAffects: 0 });

      console.log('\n⚙️ Mechanics analysis:');
      console.log(`   Modifies core mechanics: ${mechanicsStats.modifiesCore} rules`);
      console.log(`   Simple complexity: ${mechanicsStats.simple} rules`);
      console.log(`   Moderate complexity: ${mechanicsStats.moderate} rules`);
      console.log(`   Complex complexity: ${mechanicsStats.complex} rules`);
      console.log(`   Has specific affects: ${mechanicsStats.hasAffects} rules`);

      // Show basic vs advanced rules
      const basicStats = result.results.reduce((acc, rule) => {
        if (rule.pluginData.isBasicRule) {
          acc.basic++;
        } else {
          acc.advanced++;
        }
        return acc;
      }, { basic: 0, advanced: 0 });

      console.log('\n📚 Rule accessibility:');
      console.log(`   Basic/SRD rules: ${basicStats.basic} rules`);
      console.log(`   Advanced rules: ${basicStats.advanced} rules`);

      // Show subsection analysis
      const subsectionStats = result.results.reduce((acc, rule) => {
        if (rule.pluginData.subsections?.length) {
          acc.hasSubsections++;
          acc.totalSubsections += rule.pluginData.subsections.length;
        }
        return acc;
      }, { hasSubsections: 0, totalSubsections: 0 });

      console.log('\n📑 Structure analysis:');
      console.log(`   Rules with subsections: ${subsectionStats.hasSubsections} rules`);
      console.log(`   Total subsections: ${subsectionStats.totalSubsections}`);
      console.log(`   Average subsections per rule: ${subsectionStats.hasSubsections > 0 ? (subsectionStats.totalSubsections / subsectionStats.hasSubsections).toFixed(1) : 0}`);

      // Show prerequisite analysis
      const prereqStats = result.results.reduce((acc, rule) => {
        const prereqs = rule.pluginData.prerequisites;
        if (prereqs?.level) acc.hasLevel++;
        if (prereqs?.dmApproval) acc.requiresDM++;
        if (prereqs?.otherRules?.length) acc.hasOtherRules++;
        return acc;
      }, { hasLevel: 0, requiresDM: 0, hasOtherRules: 0 });

      console.log('\n📋 Prerequisites:');
      console.log(`   Has level requirement: ${prereqStats.hasLevel} rules`);
      console.log(`   Requires DM approval: ${prereqStats.requiresDM} rules`);
      console.log(`   Depends on other rules: ${prereqStats.hasOtherRules} rules`);

    } else {
      console.log('❌ No rules converted or conversion failed');
      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testTypedRuleConverter().catch(console.error);