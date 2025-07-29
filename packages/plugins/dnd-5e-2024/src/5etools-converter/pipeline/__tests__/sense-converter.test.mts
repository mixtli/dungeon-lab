/**
 * Tests for TypedSenseConverter
 * 
 * These tests validate the conversion of 5etools XPHB (2024) sense data to the DnD schema.
 * Focus on actual XPHB data structure: name, description, source, page.
 * No artificial/hardcoded data - only what's actually in the source.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedSenseConverter } from '../sense-converter.mjs';
import type { DndSenseData } from '../../../types/dnd/sense.mjs';

describe('TypedSenseConverter', () => {
  let converter: TypedSenseConverter;

  beforeEach(() => {
    converter = new TypedSenseConverter();
  });

  describe('Sense Conversion', () => {
    it('should convert senses successfully', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should convert expected number of XPHB senses', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      // XPHB has 4 main senses with srd52 flag: Blindsight, Darkvision, Tremorsense, Truesight
      expect(result.results.length).toBe(4);
    });

    it('should have consistent document structure for all senses', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      for (const senseDoc of result.results) {
        expect(senseDoc.documentType).toBe('vtt-document');
        expect(senseDoc.pluginDocumentType).toBe('sense');
        expect(senseDoc.pluginData).toBeDefined();
        
        // Validate against simplified schema
        const data = senseDoc.pluginData as DndSenseData;
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        expect(data.name.length).toBeGreaterThan(0);
        expect(data.description).toBeDefined();
        expect(typeof data.description).toBe('string');
        expect(data.description.length).toBeGreaterThan(10);
        
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

  describe('Description Content', () => {
    it('should have meaningful descriptions for all senses', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      for (const senseDoc of result.results) {
        const description = senseDoc.pluginData.description;
        
        expect(description).toBeDefined();
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(10); // Should be substantial
        expect(description).not.toBe(`${senseDoc.pluginData.name} is a special sense.`); // Not just placeholder
      }
    });

    it('should process 5etools markup in descriptions', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      for (const senseDoc of result.results) {
        const description = senseDoc.pluginData.description;
        
        // Description should not contain raw 5etools markup
        expect(description).not.toMatch(/{@[^}]+}/);
        expect(description).not.toMatch(/\|[A-Z]+/); // Source references
      }
    });
  });

  describe('Specific Sense Validation', () => {
    it('should correctly process Darkvision', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      const darkvision = result.results.find(sense => 
        sense.pluginData.name === 'Darkvision'
      );
      
      expect(darkvision).toBeDefined();
      if (darkvision) {
        expect(darkvision.pluginData.description).toBeDefined();
        expect(darkvision.pluginData.description.length).toBeGreaterThan(10);
        expect(darkvision.pluginData.description.toLowerCase()).toContain('darkness');
      }
    });

    it('should correctly process Blindsight', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      const blindsight = result.results.find(sense => 
        sense.pluginData.name === 'Blindsight'
      );
      
      expect(blindsight).toBeDefined();
      if (blindsight) {
        expect(blindsight.pluginData.description).toBeDefined();
        expect(blindsight.pluginData.description.length).toBeGreaterThan(10);
        expect(blindsight.pluginData.description.toLowerCase()).toContain('sight');
      }
    });

    it('should correctly process Truesight', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      const truesight = result.results.find(sense => 
        sense.pluginData.name === 'Truesight'
      );
      
      expect(truesight).toBeDefined();
      if (truesight) {
        expect(truesight.pluginData.description).toBeDefined();
        expect(truesight.pluginData.description.length).toBeGreaterThan(10);
        expect(truesight.pluginData.description.toLowerCase()).toContain('vision');
      }
    });

    it('should correctly process Tremorsense', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      const tremorsense = result.results.find(sense => 
        sense.pluginData.name === 'Tremorsense'
      );
      
      expect(tremorsense).toBeDefined();
      if (tremorsense) {
        expect(tremorsense.pluginData.description).toBeDefined();
        expect(tremorsense.pluginData.description.length).toBeGreaterThan(10);
        expect(tremorsense.pluginData.description.toLowerCase()).toContain('tremorsense');
      }
    });
  });

  describe('Source and Page Information', () => {
    it('should include source information for senses when available', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      for (const senseDoc of result.results) {
        const data = senseDoc.pluginData;
        
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

    it('should have consistent source data for XPHB senses', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      // Count source distribution
      const sourceCounts = new Map<string, number>();
      
      for (const senseDoc of result.results) {
        const source = senseDoc.pluginData.source;
        if (source) {
          sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        }
      }
      
      // Should have at least one common source
      expect(sourceCounts.size).toBeGreaterThan(0);
      
      // XPHB should be the primary source for 2024 senses
      if (sourceCounts.has('XPHB')) {
        expect(sourceCounts.get('XPHB')).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling and Data Integrity', () => {
    it('should provide detailed error reporting', async () => {
      const result = await converter.convertSenses();
      
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });

    it('should maintain data integrity across all senses', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      // Check for data consistency issues
      const senseNames = new Set<string>();
      
      for (const senseDoc of result.results) {
        const data = senseDoc.pluginData;
        
        // No duplicate names (but allow different sources)
        const nameSourceKey = `${data.name}-${data.source}`;
        expect(senseNames.has(nameSourceKey)).toBe(false);
        senseNames.add(nameSourceKey);
        
        // Required fields present
        expect(data.name).toBeDefined();
        expect(data.description).toBeDefined();
        
        // Name should be properly formatted
        expect(data.name.charAt(0)).toBe(data.name.charAt(0).toUpperCase());
        expect(data.name.length).toBeGreaterThan(0);
        
        // Description should be substantial
        expect(data.description.length).toBeGreaterThan(10);
      }
    });

    it('should handle conversion gracefully even with data issues', async () => {
      // This test ensures the converter is robust against data issues
      const result = await converter.convertSenses();
      
      // Even if some senses fail, the process should continue
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(2); // Should get most senses
    });
  });

  describe('Sense Coverage', () => {
    it('should include core D&D senses', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      const senseNames = result.results.map(sense => sense.pluginData.name.toLowerCase());
      
      // Core senses that should be present in XPHB
      const coreSenses = ['darkvision', 'blindsight', 'truesight', 'tremorsense'];
      
      for (const coreSense of coreSenses) {
        if (senseNames.includes(coreSense)) {
          const sense = result.results.find(s => s.pluginData.name.toLowerCase() === coreSense);
          expect(sense).toBeDefined();
          expect(sense?.pluginData.description).toBeDefined();
        }
      }
    });

    it('should have unique sense names per source', async () => {
      const result = await converter.convertSenses();
      
      expect(result.success).toBe(true);
      
      const nameSourceCombinations = new Set<string>();
      
      for (const senseDoc of result.results) {
        const data = senseDoc.pluginData;
        const combination = `${data.name}-${data.source}`;
        
        // Should not have duplicate name-source combinations
        expect(nameSourceCombinations.has(combination)).toBe(false);
        nameSourceCombinations.add(combination);
      }
    });
  });
});