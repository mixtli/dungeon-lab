/**
 * Comprehensive tests for TypedSpeciesConverter
 * 
 * Tests the enhanced species converter with:
 * - Actual XPHB trait extraction (not manufactured data)
 * - Choice objects for skill proficiencies
 * - Lineage system with spell progressions
 * - Proper document reference wrappers
 * - Special senses extraction
 * - Source data fidelity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedSpeciesConverter } from '../species-converter.mjs';
import type { DndSpeciesData, DndSpeciesLineage, DndSpellProgression } from '../../../types/dnd/species.mjs';

describe('TypedSpeciesConverter - Comprehensive Tests', () => {
  let converter: TypedSpeciesConverter;

  beforeEach(() => {
    converter = new TypedSpeciesConverter();
  });

  describe('Basic Conversion Functionality', () => {
    it('should convert all species successfully', async () => {
      const result = await converter.convertSpecies();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats.errors).toBe(0);
    });

    it('should convert expected number of XPHB species', async () => {
      const result = await converter.convertSpecies();
      
      expect(result.success).toBe(true);
      // XPHB 2024 has 8 core species with srd52 flag
      expect(result.results.length).toBe(8);
      expect(result.stats.total).toBe(8);
      expect(result.stats.converted).toBe(8);
    });

    it('should have consistent document structure for all species', async () => {
      const result = await converter.convertSpecies();
      
      expect(result.success).toBe(true);
      
      for (const speciesDoc of result.results) {
        expect(speciesDoc.documentType).toBe('vtt-document');
        expect(speciesDoc.pluginDocumentType).toBe('species');
        expect(speciesDoc.pluginData).toBeDefined();
        
        const data = speciesDoc.pluginData as DndSpeciesData;
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        expect(data.name.length).toBeGreaterThan(0);
        expect(data.description).toBeDefined();
        expect(typeof data.description).toBe('string');
        expect(data.description.length).toBeGreaterThan(10);
        expect(data.creatureType).toBeDefined();
        expect(data.size).toBeDefined();
        expect(data.movement).toBeDefined();
        expect(Array.isArray(data.traits)).toBe(true);
      }
    });
  });

  describe('Elf Species - Complex Example Validation', () => {
    let elfSpecies: DndSpeciesData;

    beforeEach(async () => {
      const result = await converter.convertSpecies();
      const elf = result.results.find(species => 
        species.pluginData.name.toLowerCase() === 'elf'
      );
      expect(elf).toBeDefined();
      elfSpecies = elf!.pluginData;
    });

    it('should extract basic elf properties correctly', () => {
      expect(elfSpecies.name).toBe('Elf');
      expect(elfSpecies.creatureType).toBe('humanoid');
      expect(elfSpecies.size.category).toBe('medium');
      expect(elfSpecies.size.description).toContain('about');
      expect(elfSpecies.movement.walk).toBe(30);
    });

    it('should extract special senses correctly', () => {
      expect(elfSpecies.specialSenses).toBeDefined();
      expect(elfSpecies.specialSenses!.darkvision).toBe(60);
    });

    it('should extract skill proficiency choices correctly', () => {
      expect(elfSpecies.skillProficiencies).toBeDefined();
      expect(elfSpecies.skillProficiencies!.choices).toBeDefined();
      expect(elfSpecies.skillProficiencies!.choices!.length).toBe(1);
      
      const choice = elfSpecies.skillProficiencies!.choices![0];
      expect(choice.count).toBe(1);
      expect(choice.from).toContain('insight');
      expect(choice.from).toContain('perception');
      expect(choice.from).toContain('survival');
      expect(choice.description).toContain('Choose 1 from');
    });

    it('should extract actual XPHB traits (not manufactured)', () => {
      expect(elfSpecies.traits.length).toBeGreaterThan(2);
      
      // Check for actual XPHB trait names
      const traitNames = elfSpecies.traits.map(t => t.name);
      expect(traitNames).toContain('Darkvision');
      expect(traitNames).toContain('Elven Lineage');
      expect(traitNames).toContain('Fey Ancestry');
      expect(traitNames).toContain('Keen Senses');
      expect(traitNames).toContain('Trance');
      
      // Should NOT contain manufactured generic traits
      expect(traitNames).not.toContain('Skill Proficiency');
      expect(traitNames).not.toContain('Spellcasting');
    });

    it('should have meaningful trait descriptions from XPHB source', () => {
      for (const trait of elfSpecies.traits) {
        expect(trait.description).toBeDefined();
        expect(typeof trait.description).toBe('string');
        expect(trait.description.length).toBeGreaterThan(10);
        
        // Should not contain raw 5etools markup
        expect(trait.description).not.toMatch(/{@[^}]+}/);
        expect(trait.description).not.toMatch(/\|[A-Z]+/);
      }
    });

    it('should extract all three elven lineages', () => {
      expect(elfSpecies.lineages).toBeDefined();
      expect(elfSpecies.lineages!.length).toBe(3);
      
      const lineageNames = elfSpecies.lineages!.map(l => l.name);
      expect(lineageNames).toContain('Drow');
      expect(lineageNames).toContain('High Elf');
      expect(lineageNames).toContain('Wood Elf');
    });

    it('should have proper level 1 benefits for each lineage', () => {
      const drow = elfSpecies.lineages!.find(l => l.name === 'Drow')!;
      const highElf = elfSpecies.lineages!.find(l => l.name === 'High Elf')!;
      const woodElf = elfSpecies.lineages!.find(l => l.name === 'Wood Elf')!;
      
      expect(drow.level1Benefits).toContain('120 feet');
      expect(drow.level1Benefits).toContain('Dancing Lights');
      
      expect(highElf.level1Benefits).toContain('Prestidigitation');
      expect(highElf.level1Benefits).toContain('Long Rest');
      
      expect(woodElf.level1Benefits).toContain('35 feet');
      expect(woodElf.level1Benefits).toContain('Druidcraft');
    });
  });

  describe('Spell Progression System', () => {
    let drowLineage: DndSpeciesLineage;
    let highElfLineage: DndSpeciesLineage;
    let woodElfLineage: DndSpeciesLineage;

    beforeEach(async () => {
      const result = await converter.convertSpecies();
      const elf = result.results.find(species => 
        species.pluginData.name.toLowerCase() === 'elf'
      );
      expect(elf).toBeDefined();
      
      drowLineage = elf!.pluginData.lineages!.find(l => l.name === 'Drow')!;
      highElfLineage = elf!.pluginData.lineages!.find(l => l.name === 'High Elf')!;
      woodElfLineage = elf!.pluginData.lineages!.find(l => l.name === 'Wood Elf')!;
    });

    it('should have spell progression for all elven lineages', () => {
      expect(drowLineage.spellProgression).toBeDefined();
      expect(highElfLineage.spellProgression).toBeDefined();
      expect(woodElfLineage.spellProgression).toBeDefined();
    });

    it('should have proper spellcasting ability choices', () => {
      const spellcastingAbilities = ['intelligence', 'wisdom', 'charisma'];
      
      expect(drowLineage.spellProgression!.spellcastingAbility.choice).toEqual(spellcastingAbilities);
      expect(highElfLineage.spellProgression!.spellcastingAbility.choice).toEqual(spellcastingAbilities);
      expect(woodElfLineage.spellProgression!.spellcastingAbility.choice).toEqual(spellcastingAbilities);
    });

    it('should have correct cantrips for each lineage', () => {
      // Drow gets Dancing Lights
      expect(drowLineage.spellProgression!.cantrips).toBeDefined();
      expect(drowLineage.spellProgression!.cantrips!.length).toBe(1);
      expect(drowLineage.spellProgression!.cantrips![0].spell._ref.slug).toBe('dancing-lights');
      expect(drowLineage.spellProgression!.cantrips![0].replaceable).toBe(false);
      
      // High Elf gets Prestidigitation (replaceable)
      expect(highElfLineage.spellProgression!.cantrips).toBeDefined();
      expect(highElfLineage.spellProgression!.cantrips!.length).toBe(1);
      expect(highElfLineage.spellProgression!.cantrips![0].spell._ref.slug).toBe('prestidigitation');
      expect(highElfLineage.spellProgression!.cantrips![0].replaceable).toBe(true);
      expect(highElfLineage.spellProgression!.cantrips![0].replacementOptions).toBeDefined();
      
      // Wood Elf gets Druidcraft
      expect(woodElfLineage.spellProgression!.cantrips).toBeDefined();
      expect(woodElfLineage.spellProgression!.cantrips!.length).toBe(1);
      expect(woodElfLineage.spellProgression!.cantrips![0].spell._ref.slug).toBe('druidcraft');
      expect(woodElfLineage.spellProgression!.cantrips![0].replaceable).toBe(false);
    });

    it('should have correct spell progression by level', () => {
      // All elven lineages get spells at levels 3 and 5
      expect(drowLineage.spellProgression!.spellsByLevel).toBeDefined();
      expect(drowLineage.spellProgression!.spellsByLevel!['3']).toBeDefined();
      expect(drowLineage.spellProgression!.spellsByLevel!['5']).toBeDefined();
      
      // Drow level 3: Faerie Fire, level 5: Darkness
      expect(drowLineage.spellProgression!.spellsByLevel!['3'][0].spell._ref.slug).toBe('faerie-fire');
      expect(drowLineage.spellProgression!.spellsByLevel!['5'][0].spell._ref.slug).toBe('darkness');
      
      // High Elf level 3: Detect Magic, level 5: Misty Step
      expect(highElfLineage.spellProgression!.spellsByLevel!['3'][0].spell._ref.slug).toBe('detect-magic');
      expect(highElfLineage.spellProgression!.spellsByLevel!['5'][0].spell._ref.slug).toBe('misty-step');
      
      // Wood Elf level 3: Longstrider, level 5: Pass Without Trace
      expect(woodElfLineage.spellProgression!.spellsByLevel!['3'][0].spell._ref.slug).toBe('longstrider');
      expect(woodElfLineage.spellProgression!.spellsByLevel!['5'][0].spell._ref.slug).toBe('pass-without-trace');
    });

    it('should have proper spell usage descriptions', () => {
      const level3Spell = drowLineage.spellProgression!.spellsByLevel!['3'][0];
      expect(level3Spell.dailyUses).toBe(1);
      expect(level3Spell.usageDescription).toBe('Once per long rest');
    });
  });

  describe('Document Reference Structure', () => {
    let spellProgression: DndSpellProgression;

    beforeEach(async () => {
      const result = await converter.convertSpecies();
      const elf = result.results.find(species => 
        species.pluginData.name.toLowerCase() === 'elf'
      );
      const drowLineage = elf!.pluginData.lineages!.find(l => l.name === 'Drow')!;
      spellProgression = drowLineage.spellProgression!;
    });

    it('should have proper _ref wrapper structure for cantrips', () => {
      const cantripRef = spellProgression.cantrips![0].spell;
      
      expect(cantripRef._ref).toBeDefined();
      expect(cantripRef._ref.type).toBe('vtt-document');
      expect(cantripRef._ref.pluginType).toBe('spell');
      expect(cantripRef._ref.slug).toBe('dancing-lights');
      expect(cantripRef._ref.source).toBe('XPHB');
    });

    it('should have proper _ref wrapper structure for leveled spells', () => {
      const spellRef = spellProgression.spellsByLevel!['3'][0].spell;
      
      expect(spellRef._ref).toBeDefined();
      expect(spellRef._ref.type).toBe('vtt-document');
      expect(spellRef._ref.pluginType).toBe('spell');
      expect(spellRef._ref.slug).toBe('faerie-fire');
      expect(spellRef._ref.source).toBe('XPHB');
    });

    it('should generate proper slugs from spell names', () => {
      // Drow's level 5 spell is Darkness
      const darknessRef = spellProgression.spellsByLevel!['5'][0].spell;
      expect(darknessRef._ref.slug).toBe('darkness');
      
      // Test with spell name containing spaces and special characters
      const faerieFireRef = spellProgression.spellsByLevel!['3'][0].spell;
      expect(faerieFireRef._ref.slug).toBe('faerie-fire');
    });
  });

  describe('Other Species Validation', () => {
    let allSpecies: DndSpeciesData[];

    beforeEach(async () => {
      const result = await converter.convertSpecies();
      allSpecies = result.results.map(doc => doc.pluginData);
    });

    it('should include all core 2024 species', () => {
      const speciesNames = allSpecies.map(s => s.name.toLowerCase());
      
      // Core XPHB 2024 species
      expect(speciesNames).toContain('dragonborn');
      expect(speciesNames).toContain('dwarf');
      expect(speciesNames).toContain('elf');
      expect(speciesNames).toContain('gnome');
      expect(speciesNames).toContain('goliath');
      expect(speciesNames).toContain('human');
      expect(speciesNames).toContain('orc');
      expect(speciesNames).toContain('tiefling');
    });

    it('should have valid creature types for all species', () => {
      const validCreatureTypes = [
        'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental',
        'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'
      ];
      
      for (const species of allSpecies) {
        expect(validCreatureTypes).toContain(species.creatureType);
      }
    });

    it('should have valid sizes for all species', () => {
      const validSizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
      
      for (const species of allSpecies) {
        expect(validSizes).toContain(species.size.category);
        expect(species.size.description).toBeDefined();
        expect(species.size.description.length).toBeGreaterThan(0);
      }
    });

    it('should have proper movement for all species', () => {
      for (const species of allSpecies) {
        expect(species.movement.walk).toBeGreaterThan(0);
        expect(species.movement.walk).toBeLessThanOrEqual(40); // Reasonable upper bound
        
        // Optional movement types should be valid if present
        if (species.movement.fly) {
          expect(species.movement.fly).toBeGreaterThan(0);
        }
        if (species.movement.swim) {
          expect(species.movement.swim).toBeGreaterThan(0);
        }
        if (species.movement.climb) {
          expect(species.movement.climb).toBeGreaterThan(0);
        }
      }
    });

    it('should have actual traits from XPHB source (not manufactured)', () => {
      for (const species of allSpecies) {
        expect(species.traits.length).toBeGreaterThan(0);
        
        for (const trait of species.traits) {
          expect(trait.name).toBeDefined();
          expect(trait.description).toBeDefined();
          expect(trait.description.length).toBeGreaterThan(10);
          
          // Should not be generic manufactured descriptions
          expect(trait.description).not.toBe('You have proficiency with certain skills.');
          expect(trait.description).not.toBe('You know certain languages.');
          expect(trait.description).not.toBe('You know certain spells as part of your racial heritage.');
        }
      }
    });

    it('should have proper source information', () => {
      for (const species of allSpecies) {
        if (species.source) {
          expect(typeof species.source).toBe('string');
          expect(species.source.length).toBeGreaterThan(0);
        }
        
        if (species.page) {
          expect(typeof species.page).toBe('number');
          expect(species.page).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Special Cases and Edge Cases', () => {
    let allSpecies: DndSpeciesData[];

    beforeEach(async () => {
      const result = await converter.convertSpecies();
      allSpecies = result.results.map(doc => doc.pluginData);
    });

    it('should handle species with special senses correctly', () => {
      const speciesWithDarkvision = allSpecies.filter(s => s.specialSenses?.darkvision);
      expect(speciesWithDarkvision.length).toBeGreaterThan(3); // Multiple species have darkvision
      
      for (const species of speciesWithDarkvision) {
        expect(species.specialSenses!.darkvision).toBeGreaterThan(0);
        expect(species.specialSenses!.darkvision).toBeLessThanOrEqual(120);
      }
    });

    it('should handle species with skill proficiencies correctly', () => {
      const elf = allSpecies.find(s => s.name === 'Elf')!;
      const human = allSpecies.find(s => s.name === 'Human');
      
      // Elf has skill choices
      expect(elf.skillProficiencies?.choices).toBeDefined();
      expect(elf.skillProficiencies!.choices!.length).toBe(1);
      
      // Human might have different skill structure (if any)
      if (human?.skillProficiencies) {
        // Human skill proficiencies should be valid
        expect(human.skillProficiencies).toBeDefined();
      }
    });

    it('should handle species with lineages vs without lineages', () => {
      const elf = allSpecies.find(s => s.name === 'Elf')!;
      const human = allSpecies.find(s => s.name === 'Human')!;
      
      // Elf has lineages
      expect(elf.lineages).toBeDefined();
      expect(elf.lineages!.length).toBe(3);
      
      // Human doesn't have lineages in basic form
      expect(human.lineages).toBeUndefined();
    });

    it('should handle lifespan data when available', () => {
      for (const species of allSpecies) {
        if (species.lifespan) {
          expect(species.lifespan.maturity).toBeGreaterThan(0);
          expect(species.lifespan.average).toBeGreaterThan(species.lifespan.maturity);
          
          if (species.lifespan.maximum) {
            expect(species.lifespan.maximum).toBeGreaterThanOrEqual(species.lifespan.average);
          }
        }
      }
    });
  });

  describe('Error Handling and Data Integrity', () => {
    it('should provide detailed error reporting', async () => {
      const result = await converter.convertSpecies();
      
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });

    it('should maintain data integrity across all species', async () => {
      const result = await converter.convertSpecies();
      
      expect(result.success).toBe(true);
      
      // Check for data consistency issues
      const speciesNames = new Set<string>();
      
      for (const speciesDoc of result.results) {
        const data = speciesDoc.pluginData;
        
        // No duplicate names (but allow different sources)
        const nameSourceKey = `${data.name}-${data.source}`;
        expect(speciesNames.has(nameSourceKey)).toBe(false);
        speciesNames.add(nameSourceKey);
        
        // Required fields present
        expect(data.name).toBeDefined();
        expect(data.description).toBeDefined();
        expect(data.creatureType).toBeDefined();
        expect(data.size).toBeDefined();
        expect(data.movement).toBeDefined();
        expect(data.traits).toBeDefined();
        
        // Name should be properly formatted
        expect(data.name.charAt(0)).toBe(data.name.charAt(0).toUpperCase());
        expect(data.name.length).toBeGreaterThan(0);
        
        // Description should be substantial
        expect(data.description.length).toBeGreaterThan(10);
      }
    });

    it('should handle conversion gracefully even with data issues', async () => {
      // This test ensures the converter is robust against data issues
      const result = await converter.convertSpecies();
      
      // Even if some species fail, the process should continue
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(6); // Should get most species
    });
  });
});