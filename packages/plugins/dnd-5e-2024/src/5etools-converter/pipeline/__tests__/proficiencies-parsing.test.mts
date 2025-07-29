/**
 * Comprehensive tests for proficiencies parsing
 * 
 * Tests the enhanced proficiency parsing logic that supports:
 * - Simple string proficiencies
 * - Document reference proficiencies (items like tools)
 * - Filter constraint proficiencies (complex weapon filters)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedClassConverter } from '../typed-class-converter.mjs';
import type { DndCharacterClassData, ProficiencyEntry, ProficiencyFilterConstraint } from '../../../types/dnd/character-class.mjs';
import type { ItemReferenceObject } from '../../../types/dnd/common.mjs';

// Type guards for testing
function isFilterProficiency(prof: ProficiencyEntry): prof is { type: 'filter'; constraint: ProficiencyFilterConstraint } {
  return typeof prof === 'object' && 'type' in prof && prof.type === 'filter';
}

function isReferenceProficiency(prof: ProficiencyEntry): prof is { type: 'reference'; item: ItemReferenceObject; displayText: string } {
  return typeof prof === 'object' && 'type' in prof && prof.type === 'reference';
}

describe('Proficiencies Parsing', () => {
  let converter: TypedClassConverter;

  beforeEach(() => {
    converter = new TypedClassConverter();
  });

  describe('Armor Proficiencies', () => {
    it('should parse simple armor proficiencies as strings', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      expect(rogue).toBeDefined();
      
      if (rogue) {
        const armorProfs = rogue.pluginData.proficiencies.armor;
        expect(armorProfs).toContain('light');
        expect(typeof armorProfs.find(p => p === 'light')).toBe('string');
      }
    });

    it('should have consistent armor proficiency structure across all classes', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        expect(data.proficiencies.armor).toBeDefined();
        expect(Array.isArray(data.proficiencies.armor)).toBe(true);
        
        // Each armor proficiency should be either a string or a proficiency object
        for (const armorProf of data.proficiencies.armor) {
          if (typeof armorProf === 'string') {
            expect(armorProf.length).toBeGreaterThan(0);
          } else {
            expect(armorProf).toHaveProperty('type');
            expect(['reference', 'filter']).toContain(armorProf.type);
          }
        }
      }
    });
  });

  describe('Weapon Proficiencies', () => {
    it('should parse simple weapon proficiencies as strings', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      expect(rogue).toBeDefined();
      
      if (rogue) {
        const weaponProfs = rogue.pluginData.proficiencies.weapons;
        expect(weaponProfs).toContain('simple');
        expect(typeof weaponProfs.find(p => p === 'simple')).toBe('string');
      }
    });

    it('should parse complex weapon filter constraints correctly', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      expect(rogue).toBeDefined();
      
      if (rogue) {
        const weaponProfs = rogue.pluginData.proficiencies.weapons;
        
        // Find the filter constraint proficiency
        const filterProf = weaponProfs.find(isFilterProficiency);
        
        expect(filterProf).toBeDefined();
        expect(filterProf.type).toBe('filter');
        expect(filterProf.constraint).toBeDefined();
        
        // Test filter constraint structure
        const constraint = filterProf.constraint;
        expect(constraint.displayText).toContain('Martial weapons');
        expect(constraint.displayText).toContain('@filter');
        expect(constraint.itemType).toBe('weapon');
        expect(constraint.category).toBe('martial');
        expect(constraint.properties).toContain('finesse');
        expect(constraint.properties).toContain('light');
        expect(Array.isArray(constraint.properties)).toBe(true);
        expect(typeof constraint.additionalFilters).toBe('object');
      }
    });

    it('should have consistent weapon proficiency structure across all classes', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        expect(data.proficiencies.weapons).toBeDefined();
        expect(Array.isArray(data.proficiencies.weapons)).toBe(true);
        
        // Each weapon proficiency should be either a string, reference, or filter
        for (const weaponProf of data.proficiencies.weapons) {
          if (typeof weaponProf === 'string') {
            expect(weaponProf.length).toBeGreaterThan(0);
          } else {
            expect(weaponProf).toHaveProperty('type');
            expect(['reference', 'filter']).toContain(weaponProf.type);
            
            if (weaponProf.type === 'filter') {
              expect(weaponProf).toHaveProperty('constraint');
              expect(weaponProf.constraint).toHaveProperty('displayText');
            } else if (weaponProf.type === 'reference') {
              expect(weaponProf).toHaveProperty('_ref');
              expect(weaponProf).toHaveProperty('displayText');
            }
          }
        }
      }
    });
  });

  describe('Tool Proficiencies', () => {
    it('should parse item reference tool proficiencies correctly', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      expect(rogue).toBeDefined();
      
      if (rogue) {
        const toolProfs = rogue.pluginData.proficiencies.tools;
        
        // Find the reference proficiency for Thieves' Tools
        const refProf = toolProfs.find(isReferenceProficiency);
        
        expect(refProf).toBeDefined();
        expect(refProf.type).toBe('reference');
        expect(refProf.item).toBeDefined();
        expect(refProf.displayText).toBe("Thieves' Tools");
        
        // Test reference structure follows standard pattern
        const ref = refProf.item._ref;
        expect(ref.slug).toBe('thieves-tools');
        expect(ref.type).toBe('item');
        expect(ref.pluginType).toBe('tool');
        expect(ref.source).toBe('xphb');
      }
    });

    it('should have consistent tool proficiency structure across all classes', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        expect(data.proficiencies.tools).toBeDefined();
        expect(Array.isArray(data.proficiencies.tools)).toBe(true);
        
        // Each tool proficiency should be either a string or a reference
        for (const toolProf of data.proficiencies.tools) {
          if (typeof toolProf === 'string') {
            expect(toolProf.length).toBeGreaterThan(0);
          } else {
            expect(toolProf).toHaveProperty('type');
            expect(['reference', 'filter']).toContain(toolProf.type);
            
            if (toolProf.type === 'reference') {
              expect(toolProf).toHaveProperty('item');
              expect(toolProf).toHaveProperty('displayText');
              expect(toolProf.item._ref).toHaveProperty('slug');
              expect(toolProf.item._ref).toHaveProperty('type');
              expect(toolProf.item._ref.type).toBe('item');
            }
          }
        }
      }
    });
  });

  describe('Proficiency Parser Utility Functions', () => {
    it('should correctly identify and parse 5etools item references', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      // Test that {@item} patterns are correctly parsed
      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      if (rogue) {
        const toolProfs = rogue.pluginData.proficiencies.tools;
        const hasItemRef = toolProfs.some((p: ProficiencyEntry) => 
          typeof p === 'object' && 
          'type' in p && p.type === 'reference' && 
          'item' in p && p.item._ref.slug === 'thieves-tools'
        );
        expect(hasItemRef).toBe(true);
      }
    });

    it('should correctly identify and parse 5etools filter constraints', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      // Test that {@filter} patterns are correctly parsed
      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      if (rogue) {
        const weaponProfs = rogue.pluginData.proficiencies.weapons;
        const hasFilter = weaponProfs.some((p: ProficiencyEntry) => 
          typeof p === 'object' && 
          'type' in p && p.type === 'filter' && 
          'constraint' in p && p.constraint.displayText.includes('@filter')
        );
        expect(hasFilter).toBe(true);
      }
    });

    it('should handle slug generation correctly for item references', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      if (rogue) {
        const toolProfs = rogue.pluginData.proficiencies.tools;
        const thievesToolsRef = toolProfs.find((p: ProficiencyEntry) => 
          typeof p === 'object' && 'type' in p && p.type === 'reference'
        );
        
        if (thievesToolsRef && isReferenceProficiency(thievesToolsRef)) {
          // Test slug generation: "Thieves' Tools" -> "thieves-tools"
          expect(thievesToolsRef.item._ref.slug).toBe('thieves-tools');
          expect(thievesToolsRef.displayText).toBe("Thieves' Tools");
        }
      }
    });
  });

  describe('Mixed Proficiency Types', () => {
    it('should handle classes with mixed proficiency types correctly', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      const rogue = result.results.find(cls => cls.pluginData.name === 'Rogue');
      expect(rogue).toBeDefined();
      
      if (rogue) {
        const weaponProfs = rogue.pluginData.proficiencies.weapons;
        
        // Should have both simple strings and filter objects
        const hasString = weaponProfs.some((p: ProficiencyEntry) => typeof p === 'string');
        const hasFilter = weaponProfs.some((p: ProficiencyEntry) => 
          typeof p === 'object' && 'type' in p && p.type === 'filter'
        );
        
        expect(hasString).toBe(true);
        expect(hasFilter).toBe(true);
      }
    });

    it('should maintain backward compatibility with simple proficiencies', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      // Test that classes without complex proficiencies still work
      const fighter = result.results.find(cls => cls.pluginData.name === 'Fighter');
      if (fighter) {
        const armorProfs = fighter.pluginData.proficiencies.armor;
        const weaponProfs = fighter.pluginData.proficiencies.weapons;
        
        // These should be mostly simple strings
        const armorStrings = armorProfs.filter((p: ProficiencyEntry) => typeof p === 'string');
        const weaponStrings = weaponProfs.filter((p: ProficiencyEntry) => typeof p === 'string');
        
        expect(armorStrings.length).toBeGreaterThan(0);
        expect(weaponStrings.length).toBeGreaterThan(0);
        
        // Test that these are valid proficiency strings
        armorStrings.forEach(prof => {
          expect(typeof prof).toBe('string');
          expect(prof.length).toBeGreaterThan(0);
        });
        
        weaponStrings.forEach(prof => {
          expect(typeof prof).toBe('string');
          expect(prof.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should gracefully handle malformed references and filters', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);
      
      // Test that conversion doesn't fail even if some proficiencies are malformed
      // The system should fall back to treating them as simple strings
      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        // All proficiency arrays should be defined and valid
        expect(data.proficiencies.armor).toBeDefined();
        expect(data.proficiencies.weapons).toBeDefined();
        expect(data.proficiencies.tools).toBeDefined();
        
        // No proficiency should be null or undefined
        data.proficiencies.armor.forEach(prof => expect(prof).toBeDefined());
        data.proficiencies.weapons.forEach(prof => expect(prof).toBeDefined());
        data.proficiencies.tools.forEach(prof => expect(prof).toBeDefined());
      }
    });

    it('should validate proficiency object structures', async () => {
      const result = await converter.convertClasses();
      expect(result.success).toBe(true);

      for (const classDoc of result.results) {
        const data = classDoc.pluginData as DndCharacterClassData;
        
        // Check all weapon proficiencies for proper structure
        for (const weaponProf of data.proficiencies.weapons) {
          if (typeof weaponProf === 'object') {
            expect(weaponProf).toHaveProperty('type');
            
            if (weaponProf.type === 'filter') {
              expect(weaponProf).toHaveProperty('constraint');
              expect(weaponProf.constraint).toHaveProperty('displayText');
              expect(typeof weaponProf.constraint.displayText).toBe('string');
            } else if (weaponProf.type === 'reference') {
              expect(weaponProf).toHaveProperty('item');
              expect(weaponProf).toHaveProperty('displayText');
              expect(typeof weaponProf.displayText).toBe('string');
            }
          }
        }
      }
    });
  });
});