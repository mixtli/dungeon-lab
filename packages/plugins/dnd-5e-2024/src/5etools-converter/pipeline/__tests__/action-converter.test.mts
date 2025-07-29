/**
 * Tests for TypedActionConverter
 * 
 * These tests validate the conversion of 5etools action data to the DnD schema,
 * with particular focus on timing preservation, requirement accuracy, and removal of unreliable effects extraction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedActionConverter } from '../action-converter.mjs';
import type { DndActionData } from '../../../types/dnd/action.mjs';

describe('TypedActionConverter', () => {
  let converter: TypedActionConverter;

  beforeEach(() => {
    converter = new TypedActionConverter();
  });

  describe('Action Conversion', () => {
    it('should convert actions successfully', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should convert expected number of SRD actions', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      // Should have ~15 general actions in SRD
      expect(result.results.length).toBeGreaterThanOrEqual(10);
      expect(result.results.length).toBeLessThanOrEqual(20);
    });

    it('should have consistent document structure for all actions', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      for (const actionDoc of result.results) {
        expect(actionDoc.documentType).toBe('vtt-document');
        expect(actionDoc.pluginDocumentType).toBe('action');
        expect(actionDoc.pluginData).toBeDefined();
        
        // Validate against schema expectations
        const data = actionDoc.pluginData as DndActionData;
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        expect(data.name.length).toBeGreaterThan(0);
        expect(data.description).toBeDefined();
        expect(typeof data.description).toBe('string');
        expect(data.description.length).toBeGreaterThan(0);
        expect(data.actionType).toBeDefined();
        expect(['action', 'bonus_action', 'reaction', 'free', 'other']).toContain(data.actionType);
      }
    });
  });

  describe('Timing Data Preservation', () => {
    it('should preserve original time field from 5etools data', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // All actions should have time data preserved
      const actionsWithTime = result.results.filter(action => 
        action.pluginData.time && action.pluginData.time.length > 0
      );
      
      expect(actionsWithTime.length).toBe(result.results.length);
      
      // Check structure of time data
      for (const action of actionsWithTime) {
        for (const timeEntry of action.pluginData.time!) {
          if (typeof timeEntry === 'object') {
            expect(timeEntry).toHaveProperty('number');
            expect(timeEntry).toHaveProperty('unit');
            expect(typeof timeEntry.number).toBe('number');
            expect(['action', 'bonus', 'reaction', 'minute', 'hour', 'round']).toContain(timeEntry.unit);
          } else {
            // String entries like "Free" are also valid
            expect(typeof timeEntry).toBe('string');
          }
        }
      }
    });

    it('should correctly derive actionType from time data', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // Test specific known mappings
      for (const actionDoc of result.results) {
        const data = actionDoc.pluginData;
        
        if (data.time && data.time.length > 0) {
          const firstTime = data.time[0];
          
          if (typeof firstTime === 'object' && firstTime.unit === 'action') {
            expect(data.actionType).toBe('action');
          } else if (typeof firstTime === 'object' && firstTime.unit === 'bonus') {
            expect(data.actionType).toBe('bonus_action');
          } else if (typeof firstTime === 'object' && firstTime.unit === 'reaction') {
            expect(data.actionType).toBe('reaction');
          } else if (typeof firstTime === 'string' && firstTime.toLowerCase() === 'free') {
            expect(data.actionType).toBe('free');
          }
        }
      }
    });

    it('should extract reaction triggers when present', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // Find reaction actions
      const reactionActions = result.results.filter(action => 
        action.pluginData.actionType === 'reaction'
      );
      
      // Reaction actions should have time data with conditions
      for (const reactionAction of reactionActions) {
        expect(reactionAction.pluginData.time).toBeDefined();
        
        // Check if any time entry has a condition (trigger)
        const hasCondition = reactionAction.pluginData.time!.some(timeEntry => 
          typeof timeEntry === 'object' && timeEntry.condition
        );
        
        if (hasCondition) {
          expect(reactionAction.pluginData.trigger).toBeDefined();
          expect(typeof reactionAction.pluginData.trigger).toBe('string');
        }
      }
    });
  });

  describe('Requirements Extraction', () => {
    it('should not have false Ki requirements', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // No general actions should have Ki requirements
      const actionsWithKi = result.results.filter(action => 
        action.pluginData.requirements?.features?.includes('Ki')
      );
      
      expect(actionsWithKi.length).toBe(0);
    });

    it('should not have unreliable class feature requirements', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // General actions should not have class-specific feature requirements
      const actionsWithFeatures = result.results.filter(action => 
        action.pluginData.requirements?.features && 
        action.pluginData.requirements.features.length > 0
      );
      
      // Should be 0 or very few (only if manually curated)
      expect(actionsWithFeatures.length).toBeLessThanOrEqual(2);
      
      // If any exist, they should not include common false positives
      const problematicFeatures = ['Ki', 'Rage', 'Action Surge'];
      for (const action of actionsWithFeatures) {
        for (const feature of action.pluginData.requirements!.features!) {
          expect(problematicFeatures).not.toContain(feature);
        }
      }
    });

    it('should handle level requirements when present', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // Check that level requirements are valid numbers if present
      for (const actionDoc of result.results) {
        const level = actionDoc.pluginData.requirements?.level;
        if (level !== undefined) {
          expect(typeof level).toBe('number');
          expect(level).toBeGreaterThanOrEqual(1);
          expect(level).toBeLessThanOrEqual(20);
        }
      }
    });

    it('should handle equipment requirements when present', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // Check that equipment requirements are valid arrays if present
      for (const actionDoc of result.results) {
        const equipment = actionDoc.pluginData.requirements?.equipment;
        if (equipment !== undefined) {
          expect(Array.isArray(equipment)).toBe(true);
          expect(equipment.length).toBeGreaterThan(0);
          
          for (const item of equipment) {
            expect(typeof item).toBe('string');
            expect(item.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe('Effects Field Removed', () => {
    it('should not auto-generate effects', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // No actions should have auto-generated effects
      const actionsWithEffects = result.results.filter(action => 
        action.pluginData.effects !== undefined
      );
      
      expect(actionsWithEffects.length).toBe(0);
    });

    it('should leave effects undefined for manual curation', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // All actions should have effects as undefined
      for (const actionDoc of result.results) {
        expect(actionDoc.pluginData.effects).toBeUndefined();
      }
    });
  });

  describe('Usage Limitations', () => {
    it('should extract usage limitations when clearly specified', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // Check that usage limitations have valid structure if present
      for (const actionDoc of result.results) {
        const uses = actionDoc.pluginData.uses;
        if (uses !== undefined) {
          expect(typeof uses.value).toBe('number');
          expect(uses.value).toBeGreaterThan(0);
          expect(['turn', 'round', 'short rest', 'long rest', 'day']).toContain(uses.per);
        }
      }
    });
  });

  describe('Specific Action Validation', () => {
    it('should correctly process Attack action if present', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      const attackAction = result.results.find(action => 
        action.pluginData.name.toLowerCase() === 'attack'
      );
      
      if (attackAction) {
        expect(attackAction.pluginData.actionType).toBe('action');
        expect(attackAction.pluginData.description).toBeDefined();
        expect(attackAction.pluginData.description.length).toBeGreaterThan(10);
        expect(attackAction.pluginData.time).toBeDefined();
        // Should not have effects (removed for manual curation)
        expect(attackAction.pluginData.effects).toBeUndefined();
      }
    });

    it('should correctly process Hide action if present', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      const hideAction = result.results.find(action => 
        action.pluginData.name.toLowerCase() === 'hide'
      );
      
      if (hideAction) {
        expect(hideAction.pluginData.actionType).toBe('action');
        expect(hideAction.pluginData.description).toBeDefined();
        // Should not have attackRoll: true (this was a false positive)
        expect(hideAction.pluginData.effects).toBeUndefined();
        // Should not have Ki requirements (this was a false positive)
        const features = hideAction.pluginData.requirements?.features;
        if (features) {
          expect(features).not.toContain('Ki');
        }
      }
    });

    it('should handle free actions correctly', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      const freeActions = result.results.filter(action => 
        action.pluginData.actionType === 'free'
      );
      
      // Should have at least one free action (like "End Concentration")
      if (freeActions.length > 0) {
        for (const freeAction of freeActions) {
          expect(freeAction.pluginData.time).toBeDefined();
          // Time should include "Free" string or equivalent
          const hasFreeTiming = freeAction.pluginData.time!.some(timeEntry =>
            typeof timeEntry === 'string' && timeEntry.toLowerCase().includes('free')
          );
          expect(hasFreeTiming).toBe(true);
        }
      }
    });
  });

  describe('Error Handling and Data Integrity', () => {
    it('should provide detailed error reporting', async () => {
      const result = await converter.convertActions();
      
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);
      expect(result.stats.converted).toBeGreaterThan(0);
      expect(result.stats.errors).toBeGreaterThanOrEqual(0);
      
      // Stats should be consistent
      expect(result.stats.converted + result.stats.errors).toBe(result.stats.total);
    });

    it('should maintain data integrity across all actions', async () => {
      const result = await converter.convertActions();
      
      expect(result.success).toBe(true);
      
      // Check for data consistency issues
      const actionNames = new Set<string>();
      
      for (const actionDoc of result.results) {
        const data = actionDoc.pluginData;
        
        // No duplicate names
        expect(actionNames.has(data.name)).toBe(false);
        actionNames.add(data.name);
        
        // Required fields present
        expect(data.name).toBeDefined();
        expect(data.description).toBeDefined();
        expect(data.actionType).toBeDefined();
        
        // Optional fields have correct types when present
        if (data.trigger !== undefined) {
          expect(typeof data.trigger).toBe('string');
        }
        
        if (data.source !== undefined) {
          expect(typeof data.source).toBe('string');
        }
        
        if (data.page !== undefined) {
          expect(typeof data.page).toBe('number');
        }
      }
    });
  });
});