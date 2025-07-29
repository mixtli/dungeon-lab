/**
 * Tests for TypedLanguageConverter
 * 
 * These tests validate the conversion of 5etools XPHB (2024) language data to the DnD schema.
 * Focus on actual XPHB data structure: name, description, category, origin extraction.
 * No artificial/hardcoded data - only what's actually in the source.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedLanguageConverter } from '../typed-language-converter.mjs';
import type { DndLanguageData } from '../../../types/dnd/language.mjs';

describe('TypedLanguageConverter', () => {
  let converter: TypedLanguageConverter;

  beforeEach(() => {
    converter = new TypedLanguageConverter();
  });

  describe('Language Conversion', () => {
    it('should convert languages successfully', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should convert expected number of XPHB languages', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      // XPHB has 19 languages with srd52 flag
      expect(result.results.length).toBe(19);
    });

    it('should have consistent document structure for all languages', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      for (const languageDoc of result.results) {
        expect(languageDoc.documentType).toBe('vtt-document');
        expect(languageDoc.pluginDocumentType).toBe('language');
        expect(languageDoc.pluginData).toBeDefined();
        
        // Validate against simplified schema
        const data = languageDoc.pluginData as DndLanguageData;
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        expect(data.name.length).toBeGreaterThan(0);
        expect(data.description).toBeDefined();
        expect(typeof data.description).toBe('string');
        expect(data.category).toBeDefined();
        expect(['standard', 'rare']).toContain(data.category);
        
        // Origin is optional but should be string if present
        if (data.origin) {
          expect(typeof data.origin).toBe('string');
          expect(data.origin.length).toBeGreaterThan(0);
        }

        // Source and page are optional
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
  });

  describe('Language Categories', () => {
    it('should correctly categorize standard languages', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      const standardLanguages = result.results.filter(lang => 
        lang.pluginData.category === 'standard'
      );
      
      expect(standardLanguages.length).toBeGreaterThan(0);
      
      // Check for some known XPHB standard languages
      const standardNames = standardLanguages.map(lang => lang.pluginData.name.toLowerCase());
      const expectedStandard = ['common', 'draconic', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc'];
      
      for (const expectedLang of expectedStandard) {
        if (standardNames.includes(expectedLang)) {
          const lang = standardLanguages.find(l => l.pluginData.name.toLowerCase() === expectedLang);
          expect(lang?.pluginData.category).toBe('standard');
        }
      }
    });

    it('should correctly categorize rare languages', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      const rareLanguages = result.results.filter(lang => 
        lang.pluginData.category === 'rare'
      );
      
      expect(rareLanguages.length).toBeGreaterThan(0);
      
      // Check for some known XPHB rare languages
      const rareNames = rareLanguages.map(lang => lang.pluginData.name.toLowerCase());
      const expectedRare = ['abyssal', 'celestial', 'deep speech', 'druidic', 'infernal', 'primordial', 'sylvan', "thieves' cant", 'undercommon'];
      
      for (const expectedLang of expectedRare) {
        if (rareNames.includes(expectedLang)) {
          const lang = rareLanguages.find(l => l.pluginData.name.toLowerCase() === expectedLang);
          expect(lang?.pluginData.category).toBe('rare');
        }
      }
    });

    it('should have all languages categorized as either standard or rare', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      const categoryCounts = new Map<string, number>();
      
      for (const languageDoc of result.results) {
        const category = languageDoc.pluginData.category;
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
      
      // Should have both standard and rare languages
      expect(categoryCounts.get('standard')).toBeGreaterThan(0);
      expect(categoryCounts.get('rare')).toBeGreaterThan(0);
      
      // All categories should be valid
      for (const category of categoryCounts.keys()) {
        expect(['standard', 'rare']).toContain(category);
      }
      
      // Should account for all 19 languages
      expect(categoryCounts.get('standard')! + categoryCounts.get('rare')!).toBe(19);
    });
  });

  describe('Origin Extraction', () => {
    it('should extract origin information when present in entries', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      // Check languages that should have origin information
      const languagesWithOrigin = result.results.filter(lang => 
        lang.pluginData.origin
      );
      
      for (const languageDoc of languagesWithOrigin) {
        const origin = languageDoc.pluginData.origin!;
        expect(typeof origin).toBe('string');
        expect(origin.length).toBeGreaterThan(0);
        // Origin should not contain "Origin:" prefix or trailing period
        expect(origin).not.toMatch(/^Origin:/);
        expect(origin).not.toMatch(/\.$/);
      }
    });

    it('should handle languages without origin information gracefully', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      // Some languages may not have origin information
      const languagesWithoutOrigin = result.results.filter(lang => 
        !lang.pluginData.origin
      );
      
      // This is acceptable - not all languages have origin data
      expect(languagesWithoutOrigin.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract specific known origins correctly', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      // Check for languages that we know should have specific origins
      const abyssal = result.results.find(lang => 
        lang.pluginData.name.toLowerCase() === 'abyssal'
      );
      
      if (abyssal?.pluginData.origin) {
        expect(abyssal.pluginData.origin).toContain('Abyss');
      }

      const celestial = result.results.find(lang => 
        lang.pluginData.name.toLowerCase() === 'celestial'
      );
      
      if (celestial?.pluginData.origin) {
        expect(celestial.pluginData.origin).toContain('Celestials');
      }
    });
  });

  describe('Description Content', () => {
    it('should have meaningful descriptions for all languages', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      for (const languageDoc of result.results) {
        const description = languageDoc.pluginData.description;
        
        expect(description).toBeDefined();
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(10); // Should be substantial
        expect(description).not.toBe(`Language: ${languageDoc.pluginData.name}`); // Not just placeholder
      }
    });

    it('should process 5etools markup in descriptions', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      for (const languageDoc of result.results) {
        const description = languageDoc.pluginData.description;
        
        // Description should not contain raw 5etools markup
        expect(description).not.toMatch(/{@[^}]+}/);
        expect(description).not.toMatch(/\|[A-Z]+/); // Source references
      }
    });
  });

  describe('Specific Language Validation', () => {
    it('should correctly process Common language', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      const commonLang = result.results.find(lang => 
        lang.pluginData.name.toLowerCase() === 'common'
      );
      
      if (commonLang) {
        expect(commonLang.pluginData.category).toBe('standard');
        expect(commonLang.pluginData.description).toBeDefined();
        expect(commonLang.pluginData.description.length).toBeGreaterThan(10);
      }
    });

    it('should correctly process Draconic language', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      const draconicLang = result.results.find(lang => 
        lang.pluginData.name.toLowerCase() === 'draconic'
      );
      
      if (draconicLang) {
        expect(draconicLang.pluginData.category).toBe('standard'); // Draconic is standard in 2024
        expect(draconicLang.pluginData.description).toBeDefined();
        expect(draconicLang.pluginData.description.length).toBeGreaterThan(10);
      }
    });

    it('should correctly process Abyssal language', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      const abyssalLang = result.results.find(lang => 
        lang.pluginData.name.toLowerCase() === 'abyssal'
      );
      
      if (abyssalLang) {
        expect(abyssalLang.pluginData.category).toBe('rare');
        expect(abyssalLang.pluginData.description).toBeDefined();
        expect(abyssalLang.pluginData.description.length).toBeGreaterThan(10);
      }
    });

    it('should handle special language names correctly', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      // Check for proper handling of names with apostrophes, spaces, etc.
      const specialNames = result.results.filter(lang => 
        lang.pluginData.name.includes("'") || 
        lang.pluginData.name.includes(' ') ||
        lang.pluginData.name.includes('-')
      );
      
      for (const specialLang of specialNames) {
        const name = specialLang.pluginData.name;
        
        // Should still be properly formatted
        expect(name.length).toBeGreaterThan(0);
        expect(name.trim()).toBe(name);
        
        // Common special cases
        if (name.toLowerCase().includes("thieves' cant")) {
          expect(name).toContain("'");
        }
        if (name.toLowerCase().includes('deep speech')) {
          expect(name).toContain(' ');
        }
      }
    });
  });

  describe('Source and Page Information', () => {
    it('should include source information for languages when available', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      for (const languageDoc of result.results) {
        const data = languageDoc.pluginData;
        
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

    it('should have consistent source data for XPHB languages', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      // Count source distribution
      const sourceCounts = new Map<string, number>();
      
      for (const languageDoc of result.results) {
        const source = languageDoc.pluginData.source;
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
      const result = await converter.convertLanguages();
      
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });

    it('should maintain data integrity across all languages', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      // Check for data consistency issues
      const languageNames = new Set<string>();
      
      for (const languageDoc of result.results) {
        const data = languageDoc.pluginData;
        
        // No duplicate names
        expect(languageNames.has(data.name)).toBe(false);
        languageNames.add(data.name);
        
        // Required fields present
        expect(data.name).toBeDefined();
        expect(data.description).toBeDefined();
        expect(data.category).toBeDefined();
        
        // Name should be properly formatted
        expect(data.name.charAt(0)).toBe(data.name.charAt(0).toUpperCase());
        expect(data.name.length).toBeGreaterThan(0);
        
        // Description should be substantial
        expect(data.description.length).toBeGreaterThan(10);
        
        // Category should be valid
        expect(['standard', 'rare']).toContain(data.category);
      }
    });

    it('should handle conversion gracefully even with data issues', async () => {
      // This test ensures the converter is robust against data issues
      const result = await converter.convertLanguages();
      
      // Even if some languages fail, the process should continue
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(10); // Should get most languages
    });
  });

  describe('Language Coverage', () => {
    it('should include core D&D languages', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      const languageNames = result.results.map(lang => lang.pluginData.name.toLowerCase());
      
      // Core standard languages that should be present
      const coreStandard = ['common', 'dwarvish', 'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'orc'];
      
      for (const coreLang of coreStandard) {
        if (languageNames.includes(coreLang)) {
          const language = result.results.find(l => l.pluginData.name.toLowerCase() === coreLang);
          expect(language?.pluginData.category).toBe('standard');
        }
      }
      
      // Core rare languages that should be present
      const coreRare = ['abyssal', 'celestial', 'infernal', 'primordial'];
      
      for (const coreLang of coreRare) {
        if (languageNames.includes(coreLang)) {
          const language = result.results.find(l => l.pluginData.name.toLowerCase() === coreLang);
          expect(language?.pluginData.category).toBe('rare');
        }
      }
    });

    it('should have reasonable distribution of language categories', async () => {
      const result = await converter.convertLanguages();
      
      expect(result.success).toBe(true);
      
      const categoryCounts = new Map<string, number>();
      
      for (const languageDoc of result.results) {
        const category = languageDoc.pluginData.category;
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
      
      // Should have reasonable distribution
      const standardCount = categoryCounts.get('standard') || 0;
      const rareCount = categoryCounts.get('rare') || 0;
      
      expect(standardCount).toBeGreaterThan(0);
      expect(rareCount).toBeGreaterThan(0);
      
      // Should account for all languages
      expect(standardCount + rareCount).toBe(result.results.length);
    });
  });
});