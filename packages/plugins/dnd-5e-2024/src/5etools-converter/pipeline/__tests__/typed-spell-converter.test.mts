/**
 * Tests for TypedSpellConverter
 * 
 * Focuses on validating the conversion of 5etools spell data to D&D 5e 2024 format,
 * with particular attention to class availability population using lookup data.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedSpellConverter } from '../typed-spell-converter.mjs';
import type { EtoolsSpell } from '../../../5etools-types/spells.mjs';

describe('TypedSpellConverter', () => {
  let converter: TypedSpellConverter;

  beforeEach(() => {
    converter = new TypedSpellConverter();
  });

  describe('Basic Spell Conversion', () => {
    it('should convert a basic spell without class information', async () => {
      const basicSpell: EtoolsSpell = {
        name: 'Test Spell',
        source: 'XPHB',
        page: 100,
        level: 1,
        school: 'A',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'point', distance: { type: 'touch' } },
        components: { v: true, s: true },
        duration: [{ type: 'instant' }],
        entries: ['A test spell that does something magical.']
      };

      const result = await converter.convertItem(basicSpell);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      
      if (result.document) {
        expect(result.document.name).toBe('Test Spell');
        expect(result.document.pluginData.name).toBe('Test Spell');
        expect(result.document.pluginData.level).toBe(1);
        expect(result.document.pluginData.school).toBe('abjuration');
        expect(result.document.pluginData.castingTime).toBe('Action');
        expect(result.document.pluginData.range).toBe('Touch');
        expect(result.document.pluginData.components.verbal).toBe(true);
        expect(result.document.pluginData.components.somatic).toBe(true);
        expect(result.document.pluginData.duration).toBe('Instantaneous');
      }
    });
  });

  describe('Class Availability from Lookup Data', () => {
    it('should populate classList for Detect Magic using lookup data', async () => {
      const detectMagicSpell: EtoolsSpell = {
        name: 'Detect Magic',
        source: 'XPHB',
        page: 262,
        level: 1,
        school: 'D',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'sphere', distance: { type: 'feet', amount: 30 } },
        components: { v: true, s: true },
        duration: [{ type: 'timed', duration: { type: 'minute', amount: 10 }, concentration: true }],
        entries: ['For the duration, you sense the presence of magic within 30 feet of you.'],
        meta: { ritual: true, concentration: true }
      };

      const result = await converter.convertItem(detectMagicSpell);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      
      if (result.document) {
        const classAvailability = result.document.pluginData.classAvailability;
        
        // Should have populated classList from lookup data
        expect(classAvailability.classList).toBeDefined();
        expect(classAvailability.classList.length).toBeGreaterThan(0);
        
        // Based on the lookup data we saw, Detect Magic should be available to many classes
        const expectedClasses = ['bard', 'cleric', 'druid', 'ranger', 'sorcerer', 'warlock', 'wizard', 'paladin'];
        expectedClasses.forEach(className => {
          expect(classAvailability.classList).toContain(className);
        });
        
        // Should not contain artificer (it's in TCE, not XPHB section)
        expect(classAvailability.classList).not.toContain('artificer');
      }
    });

    it('should populate classList for Fireball using lookup data', async () => {
      const fireballSpell: EtoolsSpell = {
        name: 'Fireball',
        source: 'XPHB',
        page: 241,
        level: 3,
        school: 'V',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'point', distance: { type: 'feet', amount: 150 } },
        components: { v: true, s: true, m: 'a tiny ball of bat guano and sulfur' },
        duration: [{ type: 'instant' }],
        entries: ['A bright streak flashes from your pointing finger to a point you choose.'],
        damageInflict: ['fire'],
        savingThrow: ['dexterity'],
        areaTags: ['S']
      };

      const result = await converter.convertItem(fireballSpell);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      
      if (result.document) {
        const classAvailability = result.document.pluginData.classAvailability;
        
        // Should have populated classList from lookup data
        expect(classAvailability.classList).toBeDefined();
        expect(classAvailability.classList.length).toBeGreaterThan(0);
        
        // Based on the lookup data, Fireball should be available to Sorcerer and Wizard
        expect(classAvailability.classList).toContain('sorcerer');
        expect(classAvailability.classList).toContain('wizard');
        
        // Should not contain all classes like Detect Magic does
        expect(classAvailability.classList.length).toBeLessThan(8);
      }
    });

    it('should handle spell names with different casing', async () => {
      const acidSplashSpell: EtoolsSpell = {
        name: 'Acid Splash',
        source: 'XPHB',
        page: 211,
        level: 0,
        school: 'C',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'point', distance: { type: 'feet', amount: 60 } },
        components: { v: true, s: true },
        duration: [{ type: 'instant' }],
        entries: ['You hurl a bubble of acid.'],
        damageInflict: ['acid'],
        spellAttack: ['ranged']
      };

      const result = await converter.convertItem(acidSplashSpell);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      
      if (result.document) {
        const classAvailability = result.document.pluginData.classAvailability;
        
        // Should find "acid splash" in lookup data despite different casing
        expect(classAvailability.classList).toBeDefined();
        expect(classAvailability.classList.length).toBeGreaterThan(0);
        
        // Based on lookup data, should be available to Sorcerer and Wizard
        expect(classAvailability.classList).toContain('sorcerer');
        expect(classAvailability.classList).toContain('wizard');
      }
    });

    it('should fallback gracefully for spells not in lookup data', async () => {
      const unknownSpell: EtoolsSpell = {
        name: 'Unknown Spell That Does Not Exist',
        source: 'XPHB',
        page: 999,
        level: 1,
        school: 'T',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'point', distance: { type: 'self' } },
        components: { v: true },
        duration: [{ type: 'instant' }],
        entries: ['This spell does not exist in the lookup data.']
      };

      const result = await converter.convertItem(unknownSpell);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      
      if (result.document) {
        const classAvailability = result.document.pluginData.classAvailability;
        
        // Should have empty classList since no lookup data and no classes field
        expect(classAvailability.classList).toEqual([]);
      }
    });
  });

  describe('School Mapping', () => {
    it('should correctly map school abbreviations to full names', async () => {
      const schoolTests = [
        { input: 'A', expected: 'abjuration' },
        { input: 'C', expected: 'conjuration' },
        { input: 'D', expected: 'divination' },
        { input: 'E', expected: 'enchantment' },
        { input: 'I', expected: 'illusion' },
        { input: 'N', expected: 'necromancy' },
        { input: 'T', expected: 'transmutation' },
        { input: 'V', expected: 'evocation' }
      ];

      for (const test of schoolTests) {
        const spell: EtoolsSpell = {
          name: `Test ${test.expected} Spell`,
          source: 'XPHB',
          level: 1,
          school: test.input,
          time: [{ number: 1, unit: 'action' }],
          range: { type: 'point', distance: { type: 'self' } },
          components: { v: true },
          duration: [{ type: 'instant' }],
          entries: [`A ${test.expected} spell.`]
        };

        const result = await converter.convertItem(spell);
        
        expect(result.success).toBe(true);
        expect(result.document?.pluginData.school).toBe(test.expected);
      }
    });
  });

  describe('Component Parsing', () => {
    it('should correctly parse component requirements', async () => {
      const materialSpell: EtoolsSpell = {
        name: 'Material Component Test',
        source: 'XPHB',
        level: 1,
        school: 'V',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'point', distance: { type: 'touch' } },
        components: { 
          v: true, 
          s: true, 
          m: 'a pinch of sulfur and powdered iron' 
        },
        duration: [{ type: 'instant' }],
        entries: ['A spell with material components.']
      };

      const result = await converter.convertItem(materialSpell);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      
      if (result.document) {
        const components = result.document.pluginData.components;
        
        expect(components.verbal).toBe(true);
        expect(components.somatic).toBe(true);
        expect(components.material).toBe(true);
        expect(components.materialComponents).toBeDefined();
        expect(components.materialComponents?.description).toBe('a pinch of sulfur and powdered iron');
        expect(components.materialComponents?.consumed).toBe(false);
        expect(components.materialComponents?.focusSubstitute).toBe(true);
      }
    });
  });

  describe('Duration and Concentration', () => {
    it('should correctly parse concentration spells', async () => {
      const concentrationSpell: EtoolsSpell = {
        name: 'Concentration Test',
        source: 'XPHB',
        level: 2,
        school: 'E',
        time: [{ number: 1, unit: 'action' }],
        range: { type: 'point', distance: { type: 'feet', amount: 60 } },
        components: { v: true, s: true },
        duration: [{ 
          type: 'timed', 
          duration: { type: 'minute', amount: 10 }, 
          concentration: true 
        }],
        entries: ['A spell requiring concentration.']
      };

      const result = await converter.convertItem(concentrationSpell);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      
      if (result.document) {
        expect(result.document.pluginData.concentration).toBe(true);
        expect(result.document.pluginData.duration).toBe('Concentration, up to 10 minutes');
      }
    });
  });
});