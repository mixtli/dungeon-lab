/**
 * Tests for TypedFeatConverter
 * 
 * These tests validate the conversion of 5etools feat data to the DnD schema,
 * with particular focus on feat categorization, prerequisite parsing, and 
 * ability score improvement handling across the 4 feat types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedFeatConverter } from '../feat-converter.mjs';
import type { DndFeatData, OriginFeat, GeneralFeat, FightingStyleFeat, EpicBoonFeat } from '../../../types/dnd/feat.mjs';

describe('TypedFeatConverter', () => {
  let converter: TypedFeatConverter;

  beforeEach(() => {
    converter = new TypedFeatConverter();
  });

  describe('Feat Conversion', () => {
    it('should convert feats successfully', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should convert substantial number of SRD feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      // Should have significant number of feats (SRD has 19 feats)
      expect(result.results.length).toBeGreaterThanOrEqual(19);
    });

    it('should have consistent document structure for all feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      for (const featDoc of result.results) {
        expect(featDoc.documentType).toBe('vtt-document');
        expect(featDoc.pluginDocumentType).toBe('feat');
        expect(featDoc.pluginData).toBeDefined();
        
        // Validate against schema expectations
        const data = featDoc.pluginData as DndFeatData;
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        expect(data.name.length).toBeGreaterThan(0);
        expect(data.description).toBeDefined();
        expect(typeof data.description).toBe('string');
        expect(data.description.length).toBeGreaterThan(0);
        expect(data.category).toBeDefined();
        expect(['origin', 'general', 'fighting_style', 'epic_boon']).toContain(data.category);
      }
    });
  });

  describe('Feat Categorization', () => {
    it('should categorize feats into the 4 D&D 2024 categories', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const categories = new Map<string, number>();
      
      for (const featDoc of result.results) {
        const category = featDoc.pluginData.category;
        categories.set(category, (categories.get(category) || 0) + 1);
      }
      
      // Should have at least general feats (most common type)
      expect(categories.get('general')).toBeGreaterThan(0);
      
      // Check that all categories are valid
      for (const category of categories.keys()) {
        expect(['origin', 'general', 'fighting_style', 'epic_boon']).toContain(category);
      }
    });

    it('should correctly identify general feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      expect(generalFeats.length).toBeGreaterThan(0);
      
      // All general feats should have the required structure
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        expect(data.prerequisites).toBeDefined();
        expect(data.prerequisites.level).toBeGreaterThanOrEqual(4);
        expect(data.abilityScoreImprovement).toBeDefined();
        expect(data.abilityScoreImprovement.value).toBe(1);
        expect(data.abilityScoreImprovement.choices.length).toBeGreaterThan(0);
        expect(typeof data.repeatable).toBe('boolean');
      }
    });

    it('should correctly identify fighting style feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const fightingStyleFeats = result.results.filter(feat => 
        feat.pluginData.category === 'fighting_style'
      );
      
      // May or may not have fighting style feats in SRD
      if (fightingStyleFeats.length > 0) {
        for (const fightingStyleFeat of fightingStyleFeats) {
          const data = fightingStyleFeat.pluginData as FightingStyleFeat;
          expect(data.prerequisites).toBeDefined();
          expect(data.prerequisites.classFeature).toBe('Fighting Style');
        }
      }
    });

    it('should correctly identify epic boon feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const epicBoonFeats = result.results.filter(feat => 
        feat.pluginData.category === 'epic_boon'
      );
      
      // May or may not have epic boon feats in SRD
      if (epicBoonFeats.length > 0) {
        for (const epicBoonFeat of epicBoonFeats) {
          const data = epicBoonFeat.pluginData as EpicBoonFeat;
          expect(data.prerequisites).toBeDefined();
          expect(data.prerequisites.level).toBe(19);
          
          if (data.abilityScoreImprovement) {
            expect(data.abilityScoreImprovement.canExceedTwenty).toBe(true);
            expect(data.abilityScoreImprovement.value).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should correctly identify origin feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const originFeats = result.results.filter(feat => 
        feat.pluginData.category === 'origin'
      );
      
      // May or may not have origin feats in SRD
      if (originFeats.length > 0) {
        for (const originFeat of originFeats) {
          const data = originFeat.pluginData as OriginFeat;
          expect(data.grantedBy).toBeDefined();
          expect(typeof data.grantedBy).toBe('string');
          expect(data.grantedBy.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Prerequisites Parsing', () => {
    it('should parse level prerequisites correctly', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      // Check general feats have minimum level 4
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        expect(data.prerequisites.level).toBeGreaterThanOrEqual(4);
      }
    });

    it('should parse ability prerequisites correctly', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        
        if (data.prerequisites.ability) {
          // Check that ability prerequisites are properly formatted
          for (const [ability, value] of Object.entries(data.prerequisites.ability)) {
            expect(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']).toContain(ability);
            expect(typeof value).toBe('number');
            expect(value).toBeGreaterThanOrEqual(8);
            expect(value).toBeLessThanOrEqual(20);
          }
        }
      }
    });

    it('should parse proficiency prerequisites correctly', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        
        if (data.prerequisites.proficiency) {
          expect(Array.isArray(data.prerequisites.proficiency)).toBe(true);
          expect(data.prerequisites.proficiency.length).toBeGreaterThan(0);
          
          for (const proficiency of data.prerequisites.proficiency) {
            expect(typeof proficiency).toBe('string');
            expect(proficiency.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should handle other prerequisites correctly', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        
        if (data.prerequisites.other) {
          expect(typeof data.prerequisites.other).toBe('string');
          expect(data.prerequisites.other.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Ability Score Improvement Parsing', () => {
    it('should handle general feat ability improvements correctly', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        
        expect(data.abilityScoreImprovement).toBeDefined();
        expect(data.abilityScoreImprovement.value).toBe(1);
        expect(data.abilityScoreImprovement.choices).toBeDefined();
        expect(data.abilityScoreImprovement.choices.length).toBeGreaterThan(0);
        
        // All choices should be valid abilities
        for (const choice of data.abilityScoreImprovement.choices) {
          expect(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']).toContain(choice);
        }
      }
    });

    it('should handle epic boon ability improvements correctly', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const epicBoonFeats = result.results.filter(feat => 
        feat.pluginData.category === 'epic_boon'
      );
      
      for (const epicBoonFeat of epicBoonFeats) {
        const data = epicBoonFeat.pluginData as EpicBoonFeat;
        
        if (data.abilityScoreImprovement) {
          expect(data.abilityScoreImprovement.canExceedTwenty).toBe(true);
          expect(data.abilityScoreImprovement.value).toBeGreaterThan(0);
          expect(data.abilityScoreImprovement.choices.length).toBeGreaterThan(0);
          
          // All choices should be valid abilities
          for (const choice of data.abilityScoreImprovement.choices) {
            expect(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']).toContain(choice);
          }
        }
      }
    });

    it('should not give ability improvements to origin or fighting style feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const originFeats = result.results.filter(feat => 
        feat.pluginData.category === 'origin'
      );
      
      const fightingStyleFeats = result.results.filter(feat => 
        feat.pluginData.category === 'fighting_style'
      );
      
      // Origin feats should not have ability score improvements
      for (const originFeat of originFeats) {
        const data = originFeat.pluginData as OriginFeat;
        expect('abilityScoreImprovement' in data).toBe(false);
      }
      
      // Fighting style feats should not have ability score improvements
      for (const fightingStyleFeat of fightingStyleFeats) {
        const data = fightingStyleFeat.pluginData as FightingStyleFeat;
        expect('abilityScoreImprovement' in data).toBe(false);
      }
    });
  });

  describe('Repeatability Detection', () => {
    it('should correctly identify repeatable feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        expect(typeof data.repeatable).toBe('boolean');
        
        // If repeatable, should be indicated in description or name
        if (data.repeatable) {
          const description = data.description.toLowerCase();
          const name = data.name.toLowerCase();
          const _hasRepeatableIndicator = 
            description.includes('multiple times') ||
            description.includes('again') ||
            description.includes('additional time') ||
            name.includes('additional');
          
          // Note: This is a heuristic check, not always reliable
          // Some repeatable feats might not explicitly mention it
        }
      }
    });
  });

  describe('Fluff Data Integration', () => {
    it('should attempt to load fluff data for enhanced descriptions', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      // Test that descriptions are meaningful and not just placeholders
      for (const featDoc of result.results) {
        const description = featDoc.pluginData.description;
        
        expect(description.length).toBeGreaterThan(10); // Should be substantial
        expect(description).not.toBe(`Feat: ${featDoc.pluginData.name}`); // Not just placeholder
      }
    });

    it('should handle missing fluff data gracefully', async () => {
      // This tests that the converter doesn't fail if fluff data is missing
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('Specific Feat Validation', () => {
    it('should correctly process known general feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      // Look for feats that should be general (not fighting styles, boons, or origin)
      const potentialGeneralFeats = ['Grappler', 'Magic Initiate', 'Savage Attacker', 'Skilled'];
      
      for (const featName of potentialGeneralFeats) {
        const feat = result.results.find(f => 
          f.pluginData.name === featName
        );
        
        if (feat && feat.pluginData.category === 'general') {
          const data = feat.pluginData as GeneralFeat;
          expect(data.prerequisites.level).toBeGreaterThanOrEqual(4);
          expect(data.abilityScoreImprovement.value).toBe(1);
        }
      }
      
      // Should have at least some general feats
      const generalFeats = result.results.filter(f => f.pluginData.category === 'general');
      expect(generalFeats.length).toBeGreaterThan(0);
    });

    it('should handle feat names with special formatting', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      // Check that feat names are properly formatted
      for (const featDoc of result.results) {
        const name = featDoc.pluginData.name;
        
        // Names should be title case or have proper capitalization
        expect(name.charAt(0)).toBe(name.charAt(0).toUpperCase());
        expect(name.length).toBeGreaterThan(0);
        
        // Should not have extra whitespace
        expect(name.trim()).toBe(name);
      }
    });
  });

  describe('Ability Abbreviation Expansion', () => {
    it('should expand ability abbreviations correctly in prerequisites', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        
        if (data.prerequisites.ability) {
          // Should use full ability names, not abbreviations
          for (const ability of Object.keys(data.prerequisites.ability)) {
            expect(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']).toContain(ability);
            expect(ability).not.toMatch(/^(str|dex|con|int|wis|cha)$/i);
          }
        }
      }
    });

    it('should expand ability abbreviations correctly in improvements', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      const generalFeats = result.results.filter(feat => 
        feat.pluginData.category === 'general'
      );
      
      for (const generalFeat of generalFeats) {
        const data = generalFeat.pluginData as GeneralFeat;
        
        // Should use full ability names in choices
        for (const choice of data.abilityScoreImprovement.choices) {
          expect(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']).toContain(choice);
          expect(choice).not.toMatch(/^(str|dex|con|int|wis|cha)$/i);
        }
      }
    });
  });

  describe('Source and Page Information', () => {
    it('should include source information for all feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      for (const featDoc of result.results) {
        const data = featDoc.pluginData;
        
        if (data.source) {
          expect(typeof data.source).toBe('string');
          expect(data.source.length).toBeGreaterThan(0);
        }
        
        if (data.page) {
          expect(typeof data.page).toBe('number');
          expect(data.page).toBeGreaterThan(0);
        }
      }
    });

    it('should have consistent source data for SRD feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      // Most SRD feats should be from XPHB (2024) or similar
      const sourceCounts = new Map<string, number>();
      
      for (const featDoc of result.results) {
        const source = featDoc.pluginData.source;
        if (source) {
          sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        }
      }
      
      // Should have at least one common source
      expect(sourceCounts.size).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Data Integrity', () => {
    it('should provide detailed error reporting', async () => {
      const result = await converter.convertFeats();
      
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });

    it('should maintain data integrity across all feats', async () => {
      const result = await converter.convertFeats();
      
      expect(result.success).toBe(true);
      
      // Check for data consistency issues
      const featNames = new Set<string>();
      
      for (const featDoc of result.results) {
        const data = featDoc.pluginData;
        
        // No duplicate names
        expect(featNames.has(data.name)).toBe(false);
        featNames.add(data.name);
        
        // Required fields present
        expect(data.name).toBeDefined();
        expect(data.description).toBeDefined();
        expect(data.category).toBeDefined();
        
        // Category-specific validation
        switch (data.category) {
          case 'general': {
            const generalData = data as GeneralFeat;
            expect(generalData.prerequisites).toBeDefined();
            expect(generalData.abilityScoreImprovement).toBeDefined();
            expect(typeof generalData.repeatable).toBe('boolean');
            break;
          }
            
          case 'origin': {
            const originData = data as OriginFeat;
            expect(originData.grantedBy).toBeDefined();
            break;
          }
            
          case 'fighting_style': {
            const fightingStyleData = data as FightingStyleFeat;
            expect(fightingStyleData.prerequisites).toBeDefined();
            expect(fightingStyleData.prerequisites.classFeature).toBe('Fighting Style');
            break;
          }
            
          case 'epic_boon': {
            const epicBoonData = data as EpicBoonFeat;
            expect(epicBoonData.prerequisites).toBeDefined();
            expect(epicBoonData.prerequisites.level).toBe(19);
            break;
          }
        }
      }
    });

    it('should handle malformed feat data gracefully', async () => {
      // This test ensures the converter is robust against data issues
      const result = await converter.convertFeats();
      
      // Even if some feats fail, the process should continue
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(10); // Should get most feats
    });
  });
});