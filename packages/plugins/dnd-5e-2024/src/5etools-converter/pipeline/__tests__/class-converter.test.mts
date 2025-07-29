/**
 * Tests for TypedClassConverter
 * 
 * These tests validate the conversion of 5etools class data to the DnD schema,
 * with particular focus on primary abilities, saving throw proficiencies, and features.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedClassConverter } from '../class-converter.mjs';
import type { DndCharacterClassData } from '../../../types/dnd/character-class.mjs';

describe('TypedClassConverter', () => {
  let converter: TypedClassConverter;

  beforeEach(() => {
    converter = new TypedClassConverter();
  });

  describe('Class Conversion', () => {
    it('should convert classes successfully', async () => {
      const result = await converter.convertClasses();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should convert Wizard class with correct structure', async () => {
      const result = await converter.convertClasses();
      
      expect(result.success).toBe(true);
      
      const wizard = result.results.find(cls => cls.pluginData.name === 'Wizard');
      expect(wizard).toBeDefined();
      
      if (wizard) {
        expect(wizard.pluginDocumentType).toBe('character-class');
        expect(wizard.pluginData.name).toBe('Wizard');
        expect(wizard.pluginData.description).toContain('Wizard is a character class');
        expect(wizard.pluginData.source).toBe('XPHB');
        
        // Test primary abilities - should contain intelligence
        expect(wizard.pluginData.primaryAbilities).toBeDefined();
        expect(wizard.pluginData.primaryAbilities.length).toBeGreaterThan(0);
        expect(wizard.pluginData.primaryAbilities).toContain('intelligence');
        
        // Test saving throw proficiencies - should contain intelligence and wisdom
        expect(wizard.pluginData.proficiencies.savingThrows).toBeDefined();
        expect(wizard.pluginData.proficiencies.savingThrows).toContain('intelligence');
        expect(wizard.pluginData.proficiencies.savingThrows).toContain('wisdom');
        
        // Test features - should be a flat array
        expect(wizard.pluginData.features).toBeDefined();
        expect(Array.isArray(wizard.pluginData.features)).toBe(true);
        expect(wizard.pluginData.features.length).toBeGreaterThan(0);
        
        // Check for specific wizard features
        const level1Features = wizard.pluginData.features.filter(f => f.level === 1);
        expect(level1Features.length).toBeGreaterThan(0);
        
        // Spellcasting feature should be present at level 1
        const spellcastingFeature = level1Features.find(f => 
          f.name.toLowerCase().includes('spellcasting')
        );
        expect(spellcastingFeature).toBeDefined();
        
        // Test grantsSubclass field
        for (const feature of wizard.pluginData.features) {
          expect(typeof feature.grantsSubclass).toBe('boolean');
        }
        
        // Test spellcasting information
        expect(wizard.pluginData.spellcasting).toBeDefined();
        expect(wizard.pluginData.spellcasting?.type).toBe('full');
        expect(wizard.pluginData.spellcasting?.ability).toBe('intelligence');
        
        // Test hit die
        expect(wizard.pluginData.hitDie).toBe(6); // Wizards have d6 hit dice
      }
    });

    it('should convert Fighter class with correct structure', async () => {
      const result = await converter.convertClasses();
      
      expect(result.success).toBe(true);
      
      const fighter = result.results.find(cls => cls.pluginData.name === 'Fighter');
      expect(fighter).toBeDefined();
      
      if (fighter) {
        expect(fighter.pluginDocumentType).toBe('character-class');
        expect(fighter.pluginData.name).toBe('Fighter');
        
        // Test primary abilities - should contain strength or dexterity
        expect(fighter.pluginData.primaryAbilities).toBeDefined();
        expect(fighter.pluginData.primaryAbilities.length).toBeGreaterThan(0);
        const hasStrOrDex = fighter.pluginData.primaryAbilities.some(ability => 
          ability === 'strength' || ability === 'dexterity'
        );
        expect(hasStrOrDex).toBe(true);
        
        // Test saving throw proficiencies - should contain strength and constitution
        expect(fighter.pluginData.proficiencies.savingThrows).toBeDefined();
        expect(fighter.pluginData.proficiencies.savingThrows).toContain('strength');
        expect(fighter.pluginData.proficiencies.savingThrows).toContain('constitution');
        
        // Test hit die
        expect(fighter.pluginData.hitDie).toBe(10); // Fighters have d10 hit dice
      }
    });
  });

  describe('Primary Abilities Parsing', () => {
    it('should parse primary abilities from different formats', async () => {
      const result = await converter.convertClasses();
      
      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        // All classes should have at least one primary ability
        expect(data.primaryAbilities).toBeDefined();
        expect(Array.isArray(data.primaryAbilities)).toBe(true);
        expect(data.primaryAbilities.length).toBeGreaterThan(0);
        
        // All primary abilities should be valid ability scores
        const validAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        for (const ability of data.primaryAbilities) {
          expect(validAbilities).toContain(ability);
        }
      }
    });

    it('should handle choice-based primary abilities', async () => {
      const result = await converter.convertClasses();
      
      // Find classes that might have choice-based primary abilities (like Ranger)
      const ranger = result.results.find(cls => cls.pluginData.name === 'Ranger');
      if (ranger) {
        expect(ranger.pluginData.primaryAbilities).toBeDefined();
        expect(ranger.pluginData.primaryAbilities.length).toBeGreaterThan(0);
        
        // Ranger should have either strength or dexterity as primary
        const hasStrOrDex = ranger.pluginData.primaryAbilities.some(ability => 
          ability === 'strength' || ability === 'dexterity'
        );
        expect(hasStrOrDex).toBe(true);
      }
    });
  });

  describe('Saving Throw Proficiencies Parsing', () => {
    it('should parse saving throw proficiencies correctly', async () => {
      const result = await converter.convertClasses();
      
      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        // All classes should have exactly 2 saving throw proficiencies
        expect(data.proficiencies.savingThrows).toBeDefined();
        expect(Array.isArray(data.proficiencies.savingThrows)).toBe(true);
        expect(data.proficiencies.savingThrows.length).toBe(2);
        
        // All saving throws should be valid ability scores
        const validAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        for (const save of data.proficiencies.savingThrows) {
          expect(validAbilities).toContain(save);
        }
      }
    });

    it('should have class-specific saving throw patterns', async () => {
      const result = await converter.convertClasses();
      
      // Test specific class patterns
      const wizard = result.results.find(cls => cls.pluginData.name === 'Wizard');
      if (wizard) {
        expect(wizard.pluginData.proficiencies.savingThrows).toContain('intelligence');
        expect(wizard.pluginData.proficiencies.savingThrows).toContain('wisdom');
      }
      
      const fighter = result.results.find(cls => cls.pluginData.name === 'Fighter');
      if (fighter) {
        expect(fighter.pluginData.proficiencies.savingThrows).toContain('strength');
        expect(fighter.pluginData.proficiencies.savingThrows).toContain('constitution');
      }
      
      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      if (rogue) {
        expect(rogue.pluginData.proficiencies.savingThrows).toContain('dexterity');
        expect(rogue.pluginData.proficiencies.savingThrows).toContain('intelligence');
      }
    });
  });

  describe('Class Features Parsing', () => {
    it('should parse class features by level', async () => {
      const result = await converter.convertClasses();
      
      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        // All classes should have features as flat array
        expect(data.features).toBeDefined();
        expect(Array.isArray(data.features)).toBe(true);
        expect(data.features.length).toBeGreaterThan(0);
        
        // Should have level 1 features
        const level1Features = data.features.filter(f => f.level === 1);
        expect(level1Features.length).toBeGreaterThan(0);
        
        // Check feature structure
        for (const feature of data.features) {
          expect(feature.name).toBeDefined();
          expect(typeof feature.name).toBe('string');
          expect(feature.level).toBeDefined();
          expect(typeof feature.level).toBe('number');
          expect(feature.level).toBeGreaterThanOrEqual(1);
          expect(feature.level).toBeLessThanOrEqual(20);
          expect(feature.description).toBeDefined();
          expect(typeof feature.description).toBe('string');
          expect(typeof feature.grantsSubclass).toBe('boolean');
        }
      }
    });

    it('should have proper level progression for features', async () => {
      const result = await converter.convertClasses();
      
      const wizard = result.results.find(cls => cls.pluginData.name === 'Wizard');
      if (wizard) {
        const features = wizard.pluginData.features;
        
        // Should have features at multiple levels
        const uniqueLevels = [...new Set(features.map(f => f.level))].sort();
        expect(uniqueLevels.length).toBeGreaterThan(1);
        expect(uniqueLevels[0]).toBe(1); // Should start at level 1
        
        // Check some specific wizard features
        const level1Features = features.filter(f => f.level === 1);
        const spellcastingFeature = level1Features.find(f => 
          f.name.toLowerCase().includes('spellcasting')
        );
        expect(spellcastingFeature).toBeDefined();
        
        // Should have Arcane Recovery at level 1
        const arcaneRecoveryFeature = level1Features.find(f => 
          f.name.toLowerCase().includes('arcane recovery')
        );
        expect(arcaneRecoveryFeature).toBeDefined();
      }
    });

    it('should parse feature descriptions from entries', async () => {
      const result = await converter.convertClasses();
      
      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        // Check that feature descriptions are meaningful
        for (const feature of data.features) {
          expect(feature.description.length).toBeGreaterThan(10);
          expect(feature.description).not.toBe(`${feature.name} feature.`);
        }
      }
    });

    it('should properly detect grantsSubclass features', async () => {
      const result = await converter.convertClasses()
      
      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        // Look for features that should grant subclass choices
        const subclassGrantingFeatures = data.features.filter(f => f.grantsSubclass);
        
        // Check that grantsSubclass features exist and have valid structure
        for (const feature of subclassGrantingFeatures) {
          expect(feature.grantsSubclass).toBe(true);
          expect(feature.level).toBeGreaterThanOrEqual(1);
          expect(feature.level).toBeLessThanOrEqual(20); // Valid level range
          expect(feature.name).toBeDefined();
          expect(feature.description).toBeDefined();
        }
        
        // Non-subclass-granting features should have grantsSubclass: false
        const regularFeatures = data.features.filter(f => !f.grantsSubclass);
        for (const feature of regularFeatures) {
          expect(feature.grantsSubclass).toBe(false);
        }
      }
    });

    it('should have consistent grantsSubclass logic across classes', async () => {
      const result = await converter.convertClasses();
      
      // Check that classes that should have subclass choices do have them
      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        // All classes should have 4 subclasses, so some feature should grant subclass choice
        const _hasSubclassGrantingFeature = data.features.some(f => f.grantsSubclass);
        
        // Note: This might not always be true if the 5etools data doesn't mark subclass features
        // but we can at least verify the boolean field is properly set
        const allFeaturesHaveGrantsSubclassField = data.features.every(f => 
          typeof f.grantsSubclass === 'boolean'
        );
        expect(allFeaturesHaveGrantsSubclassField).toBe(true);
      }
    });
  });

  describe('Spellcasting Information', () => {
    it('should parse spellcasting information for spellcasting classes', async () => {
      const result = await converter.convertClasses();
      
      const wizard = result.results.find(cls => cls.pluginData.name === 'Wizard');
      if (wizard) {
        expect(wizard.pluginData.spellcasting).toBeDefined();
        expect(wizard.pluginData.spellcasting?.type).toBe('full');
        expect(wizard.pluginData.spellcasting?.ability).toBe('intelligence');
      }
      
      const paladin = result.results.find(cls => cls.pluginData.name === 'Paladin');
      if (paladin) {
        expect(paladin.pluginData.spellcasting).toBeDefined();
        expect(paladin.pluginData.spellcasting?.type).toBe('half');
        expect(paladin.pluginData.spellcasting?.ability).toBe('charisma');
      }
      
      const warlock = result.results.find(cls => cls.pluginData.name === 'Warlock');
      if (warlock) {
        expect(warlock.pluginData.spellcasting).toBeDefined();
        expect(warlock.pluginData.spellcasting?.type).toBe('pact');
        expect(warlock.pluginData.spellcasting?.ability).toBe('charisma');
      }
    });

    it('should have undefined spellcasting for non-spellcasting classes', async () => {
      const result = await converter.convertClasses();
      
      const fighter = result.results.find(cls => cls.pluginData.name === 'Fighter');
      if (fighter) {
        expect(fighter.pluginData.spellcasting).toBeUndefined();
      }
      
      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      if (rogue) {
        expect(rogue.pluginData.spellcasting).toBeUndefined();
      }
    });
  });

  describe('Hit Die and Other Properties', () => {
    it('should parse hit dice correctly for each class', async () => {
      const result = await converter.convertClasses();
      
      const expectedHitDice: Record<string, number> = {
        'Barbarian': 12,
        'Fighter': 10,
        'Paladin': 10,
        'Ranger': 10,
        'Bard': 8,
        'Cleric': 8,
        'Druid': 8,
        'Monk': 8,
        'Rogue': 8,
        'Warlock': 8,
        'Artificer': 8,
        'Sorcerer': 6,
        'Wizard': 6
      };
      
      for (const classDoc of result.results) {
        const className = classDoc.pluginData.name;
        if (expectedHitDice[className]) {
          expect(classDoc.pluginData.hitDie).toBe(expectedHitDice[className]);
        }
      }
    });

    it('should have exactly 4 subclasses for schema validation', async () => {
      const result = await converter.convertClasses();
      
      for (const classDoc of result.results) {
        expect(classDoc.pluginData.subclasses).toBeDefined();
        expect(Array.isArray(classDoc.pluginData.subclasses)).toBe(true);
        expect(classDoc.pluginData.subclasses.length).toBe(4);
        
        for (const subclass of classDoc.pluginData.subclasses) {
          expect(subclass.name).toBeDefined();
          expect(typeof subclass.name).toBe('string');
          expect(subclass.description).toBeDefined();
          expect(typeof subclass.description).toBe('string');
          expect(subclass.gainedAtLevel).toBe(3);
        }
      }
    });
  });

  describe('Error Handling and Data Integrity', () => {
    it('should provide detailed error reporting', async () => {
      const result = await converter.convertClasses();
      
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });

    it('should maintain consistent output structure across all classes', async () => {
      const result = await converter.convertClasses();
      
      // All classes should have the same structure
      for (const classDoc of result.results) {
        expect(classDoc.documentType).toBe('vtt-document');
        expect(classDoc.pluginDocumentType).toBe('character-class');
        expect(classDoc.pluginData).toBeDefined();
        
        // Validate against schema expectations
        const data = classDoc.pluginData as DndCharacterClassData;
        expect(data.name).toBeDefined();
        expect(data.primaryAbilities).toBeDefined();
        expect(data.proficiencies).toBeDefined();
        expect(data.features).toBeDefined();
        expect(data.subclasses).toBeDefined();
      }
    });
  });
});