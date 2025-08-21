/**
 * Tests for D&D 5e Apply Damage Action Handler
 * 
 * Comprehensive test coverage for damage application logic including:
 * - Basic damage validation and application
 * - Resistance, immunity, and vulnerability calculations  
 * - Death save triggers and condition management
 * - Edge cases and error conditions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateDamageApplication, executeDamageApplication } from '../../../src/handlers/actions/apply-damage.handler.mjs';
import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';

describe('Apply Damage Action Handler', () => {
  let mockGameState: ServerGameStateWithVirtuals;
  let mockCharacter: any;
  let mockRequest: GameActionRequest;

  beforeEach(() => {
    // Create a basic character for testing
    mockCharacter = {
      _id: 'char-123',
      name: 'Test Character',
      documentType: 'character',
      createdBy: 'player-1',
      pluginData: {
        hitPoints: {
          max: 50,
          current: 30
        },
        resistances: ['fire'],
        immunities: ['necrotic'],
        vulnerabilities: ['cold']
      },
      state: {
        currentHitPoints: 30,
        conditions: []
      }
    };

    mockGameState = {
      documents: {
        'char-123': mockCharacter
      }
    } as ServerGameStateWithVirtuals;

    mockRequest = {
      playerId: 'player-1',
      actionType: 'dnd5e-2024:apply-damage',
      parameters: {
        targetCharacterId: 'char-123',
        damage: 10,
        damageType: 'slashing'
      }
    };
  });

  describe('validateDamageApplication', () => {
    it('should validate valid damage application', () => {
      const result = validateDamageApplication(mockRequest, mockGameState);
      
      expect(result.valid).toBe(true);
    });

    it('should reject missing target character ID', () => {
      mockRequest.parameters.targetCharacterId = undefined;
      
      const result = validateDamageApplication(mockRequest, mockGameState);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_PARAMETERS');
      expect(result.error?.message).toContain('Missing target character ID');
    });

    it('should reject missing damage amount', () => {
      mockRequest.parameters.damage = undefined;
      
      const result = validateDamageApplication(mockRequest, mockGameState);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_PARAMETERS');
      expect(result.error?.message).toContain('damage amount');
    });

    it('should reject negative damage', () => {
      mockRequest.parameters.damage = -5;
      
      const result = validateDamageApplication(mockRequest, mockGameState);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_DAMAGE');
      expect(result.error?.message).toContain('cannot be negative');
    });

    it('should reject nonexistent character', () => {
      mockRequest.parameters.targetCharacterId = 'nonexistent';
      
      const result = validateDamageApplication(mockRequest, mockGameState);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_NOT_FOUND');
    });

    it('should reject character without hit points data', () => {
      delete mockCharacter.pluginData.hitPoints;
      delete mockCharacter.state.currentHitPoints;
      
      const result = validateDamageApplication(mockRequest, mockGameState);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_HIT_POINTS');
    });

    it('should reject already dead character', () => {
      mockCharacter.state.currentHitPoints = -50; // negative max HP
      
      const result = validateDamageApplication(mockRequest, mockGameState);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ALREADY_DEAD');
    });
  });

  describe('executeDamageApplication - Basic Damage', () => {
    it('should apply basic damage correctly', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 15;
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(15); // 30 - 15 = 15
    });

    it('should not reduce HP below negative max HP', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 100; // Way more than current + max
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(-50); // Capped at -maxHP
    });

    it('should default to bludgeoning damage type', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      delete mockRequest.parameters.damageType;
      mockRequest.parameters.damage = 10;
      
      // This should work without errors
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(20);
    });
  });

  describe('executeDamageApplication - Resistances and Immunities', () => {
    it('should apply fire resistance (half damage)', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 20;
      mockRequest.parameters.damageType = 'fire';
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(20); // 30 - 10 (half of 20) = 20
    });

    it('should apply necrotic immunity (no damage)', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 25;
      mockRequest.parameters.damageType = 'necrotic';
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(30); // No damage taken
    });

    it('should apply cold vulnerability (double damage)', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 10;
      mockRequest.parameters.damageType = 'cold';
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(10); // 30 - 20 (double 10) = 10
    });

    it('should ignore resistances when ignoreResistances is true', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 20;
      mockRequest.parameters.damageType = 'fire';
      mockRequest.parameters.ignoreResistances = true;
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(10); // Full 20 damage applied
    });

    it('should handle resistance and vulnerability canceling out', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      
      // Add both resistance and vulnerability to acid
      draft.documents['char-123'].pluginData.resistances.push('acid');
      draft.documents['char-123'].pluginData.vulnerabilities.push('acid');
      
      mockRequest.parameters.damage = 16;
      mockRequest.parameters.damageType = 'acid';
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(14); // Normal damage: 30 - 16 = 14
    });
  });

  describe('executeDamageApplication - Unconscious and Death States', () => {
    it('should make character unconscious when dropping to 0 HP', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 30; // Exactly current HP
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(0);
      expect(updatedCharacter.state.conditions).toContain('unconscious');
    });

    it('should make character dying when dropping below 0 HP', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 35; // 5 damage below 0
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(-5);
      expect(updatedCharacter.state.conditions).toContain('unconscious');
      expect(updatedCharacter.state.conditions).toContain('dying');
      expect(updatedCharacter.state.deathSaves).toEqual({ successes: 0, failures: 0 });
    });

    it('should cause instant death with massive damage', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      
      // Set character to 0 HP first
      draft.documents['char-123'].state.currentHitPoints = 0;
      draft.documents['char-123'].state.conditions = ['unconscious', 'dying'];
      
      // Deal damage >= max HP (50)
      mockRequest.parameters.damage = 50;
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.conditions).toContain('dead');
      expect(updatedCharacter.state.conditions).not.toContain('unconscious');
      expect(updatedCharacter.state.conditions).not.toContain('dying');
    });

    it('should not duplicate unconscious condition', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      
      // Character already unconscious
      draft.documents['char-123'].state.conditions = ['unconscious'];
      
      mockRequest.parameters.damage = 35; // Drop below 0
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      const unconsciousCount = updatedCharacter.state.conditions.filter((c: string) => c === 'unconscious').length;
      expect(unconsciousCount).toBe(1);
    });
  });

  describe('executeDamageApplication - State Initialization', () => {
    it('should initialize state objects if missing', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      
      // Remove state completely
      delete draft.documents['char-123'].state;
      
      mockRequest.parameters.damage = 10;
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state).toBeDefined();
      expect(updatedCharacter.state.currentHitPoints).toBe(20); // 30 - 10 = 20
    });

    it('should initialize conditions array if missing', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      
      delete draft.documents['char-123'].state.conditions;
      mockRequest.parameters.damage = 35; // Drop below 0
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.conditions).toEqual(['unconscious', 'dying']);
    });
  });

  describe('executeDamageApplication - Edge Cases', () => {
    it('should handle character not found gracefully', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.targetCharacterId = 'nonexistent';
      
      // Should not throw
      expect(() => {
        executeDamageApplication(mockRequest, draft);
      }).not.toThrow();
    });

    it('should handle missing parameters gracefully', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = undefined;
      
      // Should not throw
      expect(() => {
        executeDamageApplication(mockRequest, draft);
      }).not.toThrow();
    });

    it('should handle zero damage', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      mockRequest.parameters.damage = 0;
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(30); // No change
    });
  });

  describe('executeDamageApplication - HP from pluginData fallback', () => {
    it('should use pluginData.hitPoints.current if state.currentHitPoints is missing', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      
      delete draft.documents['char-123'].state.currentHitPoints;
      draft.documents['char-123'].pluginData.hitPoints.current = 25;
      
      mockRequest.parameters.damage = 10;
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(15); // 25 - 10 = 15
    });

    it('should default to 0 HP if both sources missing', () => {
      const draft = JSON.parse(JSON.stringify(mockGameState));
      
      delete draft.documents['char-123'].state.currentHitPoints;
      delete draft.documents['char-123'].pluginData.hitPoints.current;
      
      mockRequest.parameters.damage = 10;
      
      executeDamageApplication(mockRequest, draft);
      
      const updatedCharacter = draft.documents['char-123'];
      expect(updatedCharacter.state.currentHitPoints).toBe(-10); // 0 - 10 = -10
    });
  });
});