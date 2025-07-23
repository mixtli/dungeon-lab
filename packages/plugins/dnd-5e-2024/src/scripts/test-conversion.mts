/**
 * Test script to verify 5etools data access and conversion utilities
 */
import { readEtoolsData, filterSrdContent } from './conversion-utils.mjs';

async function testDataAccess() {
  try {
    console.log('Testing 5etools data access...');
    
    // Test reading spell data
    const spellData = await readEtoolsData('spells/spells-xphb.json');
    console.log(`✓ Successfully read spell data: ${spellData.spell?.length || 0} spells`);
    
    // Test SRD filtering on spells
    const srdSpells = filterSrdContent(spellData.spell || []);
    console.log(`✓ SRD spells found: ${srdSpells.length}`);
    
    // Test reading monster data
    const monsterData = await readEtoolsData('bestiary/bestiary-xphb.json');
    console.log(`✓ Successfully read monster data: ${monsterData.monster?.length || 0} monsters`);
    
    // Test SRD filtering on monsters
    const srdMonsters = filterSrdContent(monsterData.monster || []);
    console.log(`✓ SRD monsters found: ${srdMonsters.length}`);
    
    // Show sample SRD spell
    if (srdSpells.length > 0) {
      const sample = srdSpells[0] as any;
      console.log(`\nSample SRD spell: "${sample.name}" (Level ${sample.level}, School: ${sample.school})`);
    }
    
    // Show sample SRD monster
    if (srdMonsters.length > 0) {
      const sample = srdMonsters[0] as any;
      console.log(`Sample SRD monster: "${sample.name}" (CR ${sample.cr}, Size: ${sample.size})`);
    }
    
    console.log('\n✅ All tests passed! 5etools data access is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDataAccess();
}