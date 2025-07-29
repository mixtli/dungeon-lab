/**
 * Tests for TypedBackgroundConverter
 * 
 * These tests validate the conversion of 5etools background data to the DnD schema,
 * with particular focus on equipment parsing, _ref field generation, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedBackgroundConverter } from '../typed-background-converter.mjs';
import type { DndBackgroundData } from '../../../types/dnd/background.mjs';

describe('TypedBackgroundConverter', () => {
  let converter: TypedBackgroundConverter;

  beforeEach(() => {
    converter = new TypedBackgroundConverter();
  });

  describe('Background Conversion', () => {
    it('should convert backgrounds successfully', async () => {
      const result = await converter.convertBackgrounds();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should convert Sage background with correct structure', async () => {
      const result = await converter.convertBackgrounds();
      
      expect(result.success).toBe(true);
      
      const sage = result.results.find(bg => bg.pluginData.name === 'Sage');
      expect(sage).toBeDefined();
      
      if (sage) {
        expect(sage.pluginDocumentType).toBe('background');
        expect(sage.pluginData.name).toBe('Sage');
        expect(sage.pluginData.description).toContain('traveling between manors');
        expect(sage.pluginData.abilityScores).toEqual(['constitution', 'intelligence', 'wisdom']);
        expect(sage.pluginData.skillProficiencies).toEqual(['arcana', 'history']);
        expect(sage.pluginData.toolProficiencies).toHaveLength(1);
        expect(sage.pluginData.toolProficiencies?.[0].displayName).toBe('Calligrapher\'s Supplies');
        expect(sage.pluginData.toolProficiencies?.[0].tool._ref).toBeDefined();
        expect(sage.pluginData.toolProficiencies?.[0].tool._ref.slug).toBe('calligraphers-supplies');
        expect(sage.pluginData.toolProficiencies?.[0].tool._ref.type).toBe('item');
        expect(sage.pluginData.toolProficiencies?.[0].tool._ref.pluginType).toBe('tool');
        expect(sage.pluginData.toolProficiencies?.[0].tool._ref.source).toBe('xphb');
        expect(sage.pluginData.originFeat.name).toBe('Magic Initiate');
        expect(sage.pluginData.originFeat.feat._ref).toBeDefined();
        expect(sage.pluginData.originFeat.feat._ref?.slug).toBe('magic-initiate-wizard');
        expect(sage.pluginData.originFeat.feat._ref?.type).toBe('vtt-document');
        expect(sage.pluginData.originFeat.feat._ref?.pluginType).toBe('feat');
        expect(sage.pluginData.originFeat.feat._ref?.source).toBe('xphb');
        expect(sage.pluginData.source).toBe('XPHB');
        expect(sage.pluginData.page).toBe(183);
      }
    });

    it('should convert Acolyte background with correct structure', async () => {
      const result = await converter.convertBackgrounds();
      
      expect(result.success).toBe(true);
      
      const acolyte = result.results.find(bg => bg.pluginData.name === 'Acolyte');
      expect(acolyte).toBeDefined();
      
      if (acolyte) {
        expect(acolyte.pluginDocumentType).toBe('background');
        expect(acolyte.pluginData.name).toBe('Acolyte');
        expect(acolyte.pluginData.abilityScores).toEqual(['intelligence', 'wisdom', 'charisma']);
        expect(acolyte.pluginData.skillProficiencies).toEqual(['insight', 'religion']);
        expect(acolyte.pluginData.originFeat.name).toBe('Magic Initiate');
        expect(acolyte.pluginData.originFeat.feat._ref).toBeDefined();
        expect(acolyte.pluginData.originFeat.feat._ref?.slug).toBe('magic-initiate-cleric');
        expect(acolyte.pluginData.originFeat.feat._ref?.type).toBe('vtt-document');
        expect(acolyte.pluginData.originFeat.feat._ref?.pluginType).toBe('feat');
        expect(acolyte.pluginData.originFeat.feat._ref?.source).toBe('xphb');
        expect(acolyte.pluginData.source).toBe('XPHB');
      }
    });
  });

  describe('Equipment Parsing', () => {
    it('should parse Sage equipment correctly', async () => {
      const result = await converter.convertBackgrounds();
      const sage = result.results.find(bg => bg.pluginData.name === 'Sage');
      
      expect(sage).toBeDefined();
      
      if (sage) {
        const equipment = sage.pluginData.equipment;
        
        // Check equipment package
        expect(equipment.equipmentPackage.items).toHaveLength(5);
        expect(equipment.equipmentPackage.goldPieces).toBe(8); // 800 cp = 8 gp
        
        // Check specific items
        const items = equipment.equipmentPackage.items;
        expect(items.some(item => item.name === 'Quarterstaff')).toBe(true);
        expect(items.some(item => item.name === 'Calligrapher\'s Supplies')).toBe(true);
        expect(items.some(item => item.name === 'Book')).toBe(true);
        
        // Check parchment with quantity
        const parchment = items.find(item => item.name === 'Parchment');
        expect(parchment).toBeDefined();
        expect(parchment?.quantity).toBe(8);
        
        // Check gold alternative
        expect(equipment.goldAlternative).toBe(50); // 5000 cp = 50 gp
        expect(equipment.currency).toBe('gp');
      }
    });

    it('should generate proper _ref fields for equipment items', async () => {
      const result = await converter.convertBackgrounds();
      const sage = result.results.find(bg => bg.pluginData.name === 'Sage');
      
      expect(sage).toBeDefined();
      
      if (sage) {
        const items = sage.pluginData.equipment.equipmentPackage.items;
        
        // All items should have item._ref fields (except special items)
        const quarterstaff = items.find(item => item.name === 'Quarterstaff');
        expect(quarterstaff?.item._ref).toBeDefined();
        expect(quarterstaff?.item._ref?.slug).toBe('quarterstaff');
        expect(quarterstaff?.item._ref?.type).toBe('item');
        expect(quarterstaff?.item._ref?.source).toBe('xphb');
        
        const supplies = items.find(item => item.name === 'Calligrapher\'s Supplies');
        expect(supplies?.item._ref).toBeDefined();
        expect(supplies?.item._ref?.slug).toBe('calligraphers-supplies');
        expect(supplies?.item._ref?.source).toBe('xphb');
      }
    });

    it('should convert copper pieces to gold pieces correctly', async () => {
      const result = await converter.convertBackgrounds();
      
      // Test multiple backgrounds to ensure consistent conversion
      const backgrounds = result.results;
      
      for (const background of backgrounds) {
        const equipment = background.pluginData.equipment;
        
        // Gold pieces should be whole numbers (copper / 100)
        expect(equipment.equipmentPackage.goldPieces).toBeGreaterThanOrEqual(0);
        expect(equipment.goldAlternative).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(equipment.equipmentPackage.goldPieces)).toBe(true);
        expect(Number.isInteger(equipment.goldAlternative)).toBe(true);
        
        // Currency should always be gp for backgrounds
        expect(equipment.currency).toBe('gp');
      }
    });

    it('should handle different equipment item formats', async () => {
      const result = await converter.convertBackgrounds();
      
      // Find backgrounds with different equipment types
      for (const background of result.results) {
        const items = background.pluginData.equipment.equipmentPackage.items;
        
        for (const item of items) {
          // All items should have required fields
          expect(item.name).toBeDefined();
          expect(typeof item.name).toBe('string');
          expect(item.name.length).toBeGreaterThan(0);
          
          expect(item.quantity).toBeDefined();
          expect(typeof item.quantity).toBe('number');
          expect(item.quantity).toBeGreaterThan(0);
          
          // _ref field should be either undefined (special items) or valid reference
          if (item._ref) {
            expect(item._ref.slug).toBeDefined();
            expect(item._ref.type).toBe('vtt-document');
            expect(item._ref.pluginType).toBe('item');
            expect(item._ref.source).toBeDefined();
          }
        }
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle backgrounds with minimal equipment', async () => {
      const result = await converter.convertBackgrounds();
      
      // Even if parsing fails, should provide defaults
      for (const background of result.results) {
        const equipment = background.pluginData.equipment;
        
        expect(equipment.equipmentPackage).toBeDefined();
        expect(equipment.equipmentPackage.items).toBeInstanceOf(Array);
        expect(equipment.equipmentPackage.goldPieces).toBeGreaterThanOrEqual(0);
        expect(equipment.goldAlternative).toBeGreaterThanOrEqual(0);
        expect(equipment.currency).toBe('gp');
      }
    });

    it('should provide consistent schema structure', async () => {
      const result = await converter.convertBackgrounds();
      
      for (const background of result.results) {
        const data = background.pluginData;
        
        // Required fields
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        
        // Equipment structure
        expect(data.equipment).toBeDefined();
        expect(data.equipment.equipmentPackage).toBeDefined();
        expect(data.equipment.equipmentPackage.items).toBeInstanceOf(Array);
        
        // Skill proficiencies
        expect(data.skillProficiencies).toBeInstanceOf(Array);
        expect(data.skillProficiencies).toHaveLength(2); // D&D 2024 backgrounds have exactly 2 skills
        
        // Source information
        if (data.source) {
          expect(typeof data.source).toBe('string');
        }
      }
    });

    it('should handle item name formatting correctly', async () => {
      const result = await converter.convertBackgrounds();
      
      for (const background of result.results) {
        const items = background.pluginData.equipment.equipmentPackage.items;
        
        for (const item of items) {
          // Item names should be properly formatted (title case)
          expect(item.name).toMatch(/^[A-Z]/); // Start with capital letter
          expect(item.name).not.toMatch(/\|/); // No source suffixes
          
          // Common formatting checks
          if (item.name.includes(' of ')) {
            expect(item.name).not.toMatch(/ Of /); // "of" should be lowercase
          }
          if (item.name.includes(' the ')) {
            expect(item.name).not.toMatch(/ The /); // "the" should be lowercase  
          }
        }
      }
    });
  });

  describe('Performance and Data Integrity', () => {
    it('should complete conversion within reasonable time', async () => {
      const startTime = Date.now();
      const result = await converter.convertBackgrounds();
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should provide detailed error reporting', async () => {
      const result = await converter.convertBackgrounds();
      
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });

    it('should maintain consistent output structure across all backgrounds', async () => {
      const result = await converter.convertBackgrounds();
      
      // All backgrounds should have the same structure
      for (const background of result.results) {
        expect(background.documentType).toBe('vtt-document');
        expect(background.pluginDocumentType).toBe('background');
        expect(background.pluginData).toBeDefined();
        
        // Validate against schema expectations
        const data = background.pluginData as DndBackgroundData;
        expect(data.name).toBeDefined();
        expect(data.abilityScores).toBeDefined();
        expect(data.originFeat).toBeDefined();
        expect(data.skillProficiencies).toBeDefined();
        expect(data.equipment).toBeDefined();
      }
    });
  });
});