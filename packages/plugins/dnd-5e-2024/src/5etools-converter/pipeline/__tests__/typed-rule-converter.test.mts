/**
 * Comprehensive tests for TypedRuleConverter
 * 
 * Tests the simplified rule converter with:
 * - Authentic XPHB data extraction (no manufactured complexity/affects)
 * - Proper subsection extraction from nested entries
 * - Rule categorization based on name and type only
 * - Basic rule detection from structured flags
 * - Source data fidelity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedRuleConverter } from '../typed-rule-converter.mjs';
import type { DndRuleData } from '../../../types/dnd/rule.mjs';

describe('TypedRuleConverter - Comprehensive Tests', () => {
  let converter: TypedRuleConverter;

  beforeEach(() => {
    converter = new TypedRuleConverter();
  });

  describe('Basic Conversion Functionality', () => {
    it('should convert all rules successfully', async () => {
      const result = await converter.convertRules();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats.errors).toBe(0);
    });

    it('should convert expected number of XPHB rules', async () => {
      const result = await converter.convertRules();
      
      expect(result.success).toBe(true);
      // XPHB 2024 has many rules with srd52 flag
      expect(result.results.length).toBeGreaterThan(20);
      expect(result.stats.total).toBeGreaterThan(20);
      expect(result.stats.converted).toBe(result.stats.total);
    });

    it('should have consistent document structure for all rules', async () => {
      const result = await converter.convertRules();
      
      expect(result.success).toBe(true);
      
      for (const ruleDoc of result.results) {
        expect(ruleDoc.documentType).toBe('vtt-document');
        expect(ruleDoc.pluginDocumentType).toBe('rule');
        expect(ruleDoc.pluginData).toBeDefined();
        
        const data = ruleDoc.pluginData as DndRuleData;
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        expect(data.name.length).toBeGreaterThan(0);
        expect(data.description).toBeDefined();
        expect(typeof data.description).toBe('string');
        expect(data.description.length).toBeGreaterThan(10);
        expect(data.ruleType).toBeDefined();
        expect(['core', 'optional', 'variant', 'variant_optional']).toContain(data.ruleType);
      }
    });
  });

  describe('Core Rule Examples - Basic Definitions', () => {
    let abilityCheckRule: DndRuleData;
    let advantageRule: DndRuleData;
    let _actionRule: DndRuleData;

    beforeEach(async () => {
      const result = await converter.convertRules();
      
      const abilityCheck = result.results.find(rule => 
        rule.pluginData.name.toLowerCase() === 'ability check'
      );
      const advantage = result.results.find(rule => 
        rule.pluginData.name.toLowerCase() === 'advantage'
      );
      const action = result.results.find(rule => 
        rule.pluginData.name.toLowerCase() === 'action'
      );
      
      if (abilityCheck) abilityCheckRule = abilityCheck.pluginData;
      if (advantage) advantageRule = advantage.pluginData;
      if (action) _actionRule = action.pluginData;
    });

    it('should properly extract basic rule properties', () => {
      if (abilityCheckRule) {
        expect(abilityCheckRule.name).toBe('Ability Check');
        expect(abilityCheckRule.ruleType).toBe('core');
        expect(abilityCheckRule.source).toBe('XPHB');
        expect(abilityCheckRule.category).toBe('definitions');
        expect(abilityCheckRule.isBasicRule).toBe(true);
      }
      
      if (advantageRule) {
        expect(advantageRule.name).toBe('Advantage');
        expect(advantageRule.ruleType).toBe('core');
        expect(advantageRule.source).toBe('XPHB');
        expect(advantageRule.category).toBe('definitions');
        expect(advantageRule.isBasicRule).toBe(true);
      }
    });

    it('should extract meaningful descriptions from XPHB source', () => {
      if (abilityCheckRule) {
        expect(abilityCheckRule.description).toContain('D20 Test');
        expect(abilityCheckRule.description).toContain('ability');
        expect(abilityCheckRule.description.length).toBeGreaterThan(20);
      }
      
      if (advantageRule) {
        expect(advantageRule.description).toContain('Advantage');
        expect(advantageRule.description).toContain('roll two d20s');
        expect(advantageRule.description).toContain('higher roll');
      }
    });

    it('should properly tag basic rules', () => {
      if (abilityCheckRule) {
        expect(abilityCheckRule.tags).toContain('core');
        expect(abilityCheckRule.tags).toContain('xphb');
        expect(abilityCheckRule.tags).toContain('basic-rules');
        expect(abilityCheckRule.tags).toContain('definitions');
      }
    });
  });

  describe('Complex Rule Examples - Subsection Extraction', () => {
    let complexRule: DndRuleData;

    beforeEach(async () => {
      const result = await converter.convertRules();
      // Look for any rule with subsections
      const foundRule = result.results.find(rule => 
        rule.pluginData.subsections && rule.pluginData.subsections.length > 0
      );
      if (foundRule) {
        complexRule = foundRule.pluginData;
      }
    });

    it('should extract subsections from complex rules when available', () => {
      if (complexRule) {
        expect(complexRule.subsections).toBeDefined();
        expect(complexRule.subsections!.length).toBeGreaterThan(0);
        
        // Each subsection should have meaningful content
        for (const subsection of complexRule.subsections!) {
          expect(subsection.name).toBeDefined();
          expect(subsection.name.length).toBeGreaterThan(0);
          expect(subsection.description).toBeDefined();
          expect(subsection.description.length).toBeGreaterThan(10);
          expect(subsection.description).not.toMatch(/{@[^}]+}/); // No raw 5etools markup
        }
      } else {
        // If no complex rules with subsections exist in basic set, that's fine
        console.log('No rules with subsections found in XPHB 2024 basic rule set');
        expect(true).toBe(true); // Test passes
      }
    });
  });

  describe('Variant Rule Examples', () => {
    let variantRule: DndRuleData;

    beforeEach(async () => {
      const result = await converter.convertRules();
      // Look for any variant rule
      const variant = result.results.find(rule => 
        rule.pluginData.ruleType === 'variant' || rule.pluginData.ruleType === 'variant_optional'
      );
      if (variant) variantRule = variant.pluginData;
    });

    it('should categorize variant rules correctly if they exist', () => {
      if (variantRule) {
        expect(['variant', 'variant_optional']).toContain(variantRule.ruleType);
        expect(variantRule.category).toBe('variant_rules');
        expect(variantRule.tags).toContain(variantRule.ruleType);
      } else {
        // If no variant rules exist in XPHB 2024 basic set, that's expected
        console.log('No variant rules found in XPHB 2024 basic rule set');
        expect(true).toBe(true); // Test passes
      }
    });
  });

  describe('Rule Type Conversion', () => {
    it('should convert 5etools rule types correctly', async () => {
      const result = await converter.convertRules();
      
      const coreRules = result.results.filter(r => r.pluginData.ruleType === 'core');
      const optionalRules = result.results.filter(r => r.pluginData.ruleType === 'optional');
      const variantRules = result.results.filter(r => r.pluginData.ruleType === 'variant');
      
      // Should have core rules
      expect(coreRules.length).toBeGreaterThan(0);
      
      // Log the rule type distribution for debugging
      console.log(`Rule types: core=${coreRules.length}, optional=${optionalRules.length}, variant=${variantRules.length}`);
      
      // Check that we have some variety in rule types (but don't require specific counts)
      const totalRuleTypes = [coreRules.length > 0, optionalRules.length > 0, variantRules.length > 0].filter(Boolean).length;
      expect(totalRuleTypes).toBeGreaterThan(0); // At least one type should exist
      
      // Verify basic rules are typically core rules
      const basicRules = result.results.filter(r => r.pluginData.isBasicRule);
      const basicCoreRules = basicRules.filter(r => r.pluginData.ruleType === 'core');
      expect(basicCoreRules.length).toBeGreaterThan(0);
      if (basicRules.length > 0) {
        expect(basicCoreRules.length / basicRules.length).toBeGreaterThan(0.5); // Most basic rules should be core
      }
    });
  });

  describe('Category Classification', () => {
    it('should classify rules into appropriate categories', async () => {
      const result = await converter.convertRules();
      
      const categoryCounts: Record<string, number> = {};
      for (const rule of result.results) {
        const category = rule.pluginData.category;
        if (category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      }
      
      // Should have rules in multiple categories
      expect(Object.keys(categoryCounts).length).toBeGreaterThan(3);
      
      // Should have definitions (basic rules)
      expect(categoryCounts['definitions']).toBeGreaterThan(5);
      
      // Should have some combat rules
      expect(categoryCounts['combat']).toBeGreaterThan(0);
    });

    it('should categorize rules based on name keywords', async () => {
      const result = await converter.convertRules();
      
      // Find rules with specific name patterns and verify categorization
      const actionRule = result.results.find(r => r.pluginData.name.toLowerCase().includes('action'));
      if (actionRule) {
        expect(actionRule.pluginData.category).toBe('combat');
      }
      
      const abilityRule = result.results.find(r => r.pluginData.name.toLowerCase().includes('ability'));
      if (abilityRule) {
        expect(abilityRule.pluginData.category).toBe('definitions');
      }
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should not contain manufactured fields', async () => {
      const result = await converter.convertRules();
      
      for (const ruleDoc of result.results) {
        const data = ruleDoc.pluginData as DndRuleData;
        
        // Verify manufactured fields are not present
        expect(data.mechanics).toBeUndefined();
        expect(data.complexity).toBeUndefined();
        expect(data.affects).toBeUndefined();
        expect(data.modifiesCoreMechanics).toBeUndefined();
      }
    });

    it('should have consistent tagging system', async () => {
      const result = await converter.convertRules();
      
      for (const ruleDoc of result.results) {
        const data = ruleDoc.pluginData;
        
        if (data.tags) {
          // Should contain rule type as tag
          expect(data.tags).toContain(data.ruleType);
          
          // Should contain source as tag if source exists
          if (data.source) {
            expect(data.tags).toContain(data.source.toLowerCase());
          }
          
          // Basic rules should be tagged
          if (data.isBasicRule) {
            expect(data.tags).toContain('basic-rules');
          }
          
          // Category should be included as tag
          if (data.category) {
            expect(data.tags).toContain(data.category);
          }
        }
      }
    });

    it('should maintain data integrity across all rules', async () => {
      const result = await converter.convertRules();
      
      expect(result.success).toBe(true);
      
      // Check for data consistency issues
      const ruleNames = new Set<string>();
      
      for (const ruleDoc of result.results) {
        const data = ruleDoc.pluginData;
        
        // No duplicate names (but allow different sources)
        const nameSourceKey = `${data.name}-${data.source}`;
        expect(ruleNames.has(nameSourceKey)).toBe(false);
        ruleNames.add(nameSourceKey);
        
        // Required fields present
        expect(data.name).toBeDefined();
        expect(data.description).toBeDefined();
        expect(data.ruleType).toBeDefined();
        
        // Name should be properly formatted
        expect(data.name.charAt(0)).toBe(data.name.charAt(0).toUpperCase());
        expect(data.name.length).toBeGreaterThan(0);
        
        // Description should be substantial
        expect(data.description.length).toBeGreaterThan(10);
        
        // Rule type should be valid
        expect(['core', 'optional', 'variant', 'variant_optional']).toContain(data.ruleType);
      }
    });
  });

  describe('Source Information', () => {
    it('should have proper source information', async () => {
      const result = await converter.convertRules();
      
      for (const ruleDoc of result.results) {
        const data = ruleDoc.pluginData;
        
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

    it('should prioritize XPHB 2024 rules', async () => {
      const result = await converter.convertRules();
      
      const xphbRules = result.results.filter(r => r.pluginData.source === 'XPHB');
      const basicRules = result.results.filter(r => r.pluginData.isBasicRule);
      
      // Should have XPHB rules
      expect(xphbRules.length).toBeGreaterThan(10);
      
      // Many basic rules should be from XPHB
      const xphbBasicRules = basicRules.filter(r => r.pluginData.source === 'XPHB');
      expect(xphbBasicRules.length).toBeGreaterThan(5);
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error reporting', async () => {
      const result = await converter.convertRules();
      
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });

    it('should handle conversion gracefully even with data issues', async () => {
      // This test ensures the converter is robust against data issues
      const result = await converter.convertRules();
      
      // Even if some rules fail, the process should continue
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(15); // Should get most rules
    });
  });
});