/**
 * D&D 5e Attack Action Handler Tests
 * 
 * Tests the attack action handler integration with action economy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateDnDAttack, executeDnDAttack } from '../../../src/handlers/actions/attack.handler.mjs';

describe('D&D 5e Attack Action Handler', () => {
  let mockCharacter: any;
  let mockGameState: any;
  let mockRequest: any;

  beforeEach(() => {
    mockCharacter = {
      id: 'char-1',
      name: 'Test Fighter',
      documentType: 'character',
      createdBy: 'player-1',
      state: {
        turnState: {
          movementUsed: 0,
          actionsUsed: [],
          bonusActionUsed: false,
          reactionUsed: false
        },
        conditions: []
      }
    };

    mockGameState = {
      documents: {
        'char-1': mockCharacter
      }
    };

    mockRequest = {
      id: 'req-1',
      playerId: 'player-1',
      sessionId: 'session-1',
      timestamp: Date.now(),
      action: 'attack',
      parameters: {
        weaponId: 'longsword-1',
        weaponName: 'Longsword'
      }
    };
  });

  describe('validateDnDAttack', () => {
    it('should allow attack when character has available action', () => {
      const result = validateDnDAttack(mockRequest as any, mockGameState as any);
      
      expect(result.valid).toBe(true);
    });

    it('should block attack when character has no actions left', () => {
      mockCharacter.state.turnState.actionsUsed = ['previous-attack'];
      
      const result = validateDnDAttack(mockRequest as any, mockGameState as any);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ACTION_ALREADY_USED');
    });

    it('should block attack when character is paralyzed', () => {
      mockCharacter.state.conditions = ['paralyzed'];
      
      const result = validateDnDAttack(mockRequest as any, mockGameState as any);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ACTION_RESTRICTED_BY_CONDITION');
    });

    it('should return error when character not found', () => {
      mockRequest.playerId = 'non-existent-player';
      
      const result = validateDnDAttack(mockRequest as any, mockGameState as any);
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('NO_CHARACTER');
    });

    it('should handle character with missing state', () => {
      delete mockCharacter.state.turnState;
      
      const result = validateDnDAttack(mockRequest as any, mockGameState as any);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('executeDnDAttack', () => {
    it('should consume attack action', () => {
      executeDnDAttack(mockRequest as any, mockGameState as any);
      
      expect(mockCharacter.state.turnState.actionsUsed).toContain('Attack');
    });

    it('should handle character not found gracefully', () => {
      mockRequest.playerId = 'non-existent-player';
      
      // Should not throw
      expect(() => {
        executeDnDAttack(mockRequest as any, mockGameState as any);
      }).not.toThrow();
    });

    it('should initialize state if missing', () => {
      delete mockCharacter.state;
      
      executeDnDAttack(mockRequest as any, mockGameState as any);
      
      expect(mockCharacter.state).toBeDefined();
      expect(mockCharacter.state.turnState).toBeDefined();
      expect(mockCharacter.state.turnState.actionsUsed).toContain('Attack');
    });

    it('should preserve other state when consuming action', () => {
      mockCharacter.state.turnState.bonusActionUsed = true;
      mockCharacter.state.turnState.reactionUsed = true;
      mockCharacter.state.turnState.movementUsed = 15;
      
      executeDnDAttack(mockRequest as any, mockGameState as any);
      
      expect(mockCharacter.state.turnState.bonusActionUsed).toBe(true);
      expect(mockCharacter.state.turnState.reactionUsed).toBe(true);
      expect(mockCharacter.state.turnState.movementUsed).toBe(15);
      expect(mockCharacter.state.turnState.actionsUsed).toContain('Attack');
    });
  });

  describe('Integration scenarios', () => {
    it('should follow complete attack flow: validate → consume', () => {
      // First, validate the attack
      const validationResult = validateDnDAttack(mockRequest as any, mockGameState as any);
      expect(validationResult.valid).toBe(true);
      
      // Then execute it (consume the action)
      executeDnDAttack(mockRequest as any, mockGameState as any);
      
      // Verify action was consumed
      expect(mockCharacter.state.turnState.actionsUsed).toContain('Attack');
      
      // Now a second attack should be blocked
      const secondValidation = validateDnDAttack(mockRequest as any, mockGameState as any);
      expect(secondValidation.valid).toBe(false);
      expect(secondValidation.error?.code).toBe('ACTION_ALREADY_USED');
    });

    it('should allow attack after turn state reset', () => {
      // Use up the action
      executeDnDAttack(mockRequest as any, mockGameState as any);
      expect(mockCharacter.state.turnState.actionsUsed).toContain('Attack');
      
      // Simulate turn advancement reset (what would happen automatically)
      mockCharacter.state.turnState = {
        movementUsed: 0,
        actionsUsed: [],
        bonusActionUsed: false,
        reactionUsed: false
      };
      
      // Should now allow attack again
      const result = validateDnDAttack(mockRequest as any, mockGameState as any);
      expect(result.valid).toBe(true);
    });
  });
});