/**
 * D&D 5e Action Economy Utilities Tests
 * 
 * Tests the action economy validation and consumption functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateActionEconomy,
  consumeAction,
  getAvailableActions,
  findPlayerCharacter,
  type DnDActionType
} from '../../src/utils/action-economy.mjs';

describe('D&D 5e Action Economy', () => {
  let mockCharacter: any;
  let mockGameState: any;

  beforeEach(() => {
    // Create a fresh character for each test
    mockCharacter = {
      id: 'char-1',
      name: 'Test Character',
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
  });

  describe('validateActionEconomy', () => {
    it('should allow action when no actions used', () => {
      const result = validateActionEconomy('action', mockCharacter, mockGameState as any, 'attack');
      
      expect(result.valid).toBe(true);
    });

    it('should block action when action already used', () => {
      mockCharacter.state.turnState.actionsUsed = ['previous-attack'];
      
      const result = validateActionEconomy('action', mockCharacter, mockGameState as any, 'attack');
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ACTION_ALREADY_USED');
      expect(result.error?.message).toContain('previous-attack');
    });

    it('should allow bonus action when not used', () => {
      const result = validateActionEconomy('bonus-action', mockCharacter, mockGameState as any, 'second-wind');
      
      expect(result.valid).toBe(true);
    });

    it('should block bonus action when already used', () => {
      mockCharacter.state.turnState.bonusActionUsed = true;
      
      const result = validateActionEconomy('bonus-action', mockCharacter, mockGameState as any, 'second-wind');
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('BONUS_ACTION_ALREADY_USED');
    });

    it('should allow reaction when not used', () => {
      const result = validateActionEconomy('reaction', mockCharacter, mockGameState as any, 'opportunity-attack');
      
      expect(result.valid).toBe(true);
    });

    it('should block reaction when already used', () => {
      mockCharacter.state.turnState.reactionUsed = true;
      
      const result = validateActionEconomy('reaction', mockCharacter, mockGameState as any, 'opportunity-attack');
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('REACTION_ALREADY_USED');
    });

    it('should always allow free actions', () => {
      // Set up character with everything used
      mockCharacter.state.turnState.actionsUsed = ['attack'];
      mockCharacter.state.turnState.bonusActionUsed = true;
      mockCharacter.state.turnState.reactionUsed = true;
      
      const result = validateActionEconomy('free', mockCharacter, mockGameState as any, 'speak');
      
      expect(result.valid).toBe(true);
    });

    it('should block actions when character has incapacitating condition', () => {
      mockCharacter.state.conditions = ['paralyzed'];
      
      const result = validateActionEconomy('action', mockCharacter, mockGameState as any, 'attack');
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ACTION_RESTRICTED_BY_CONDITION');
      expect(result.error?.message).toContain('paralyzed');
    });

    it('should block actions for stunned characters', () => {
      mockCharacter.state.conditions = ['stunned'];
      
      const result = validateActionEconomy('bonus-action', mockCharacter, mockGameState as any, 'heal');
      
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ACTION_RESTRICTED_BY_CONDITION');
      expect(result.error?.message).toContain('stunned');
    });

    it('should handle missing state gracefully', () => {
      delete mockCharacter.state.turnState;
      
      const result = validateActionEconomy('action', mockCharacter, mockGameState as any, 'attack');
      
      expect(result.valid).toBe(true);
    });
  });

  describe('consumeAction', () => {
    it('should consume main action', () => {
      consumeAction('action', mockCharacter, 'attack');
      
      expect(mockCharacter.state.turnState.actionsUsed).toContain('attack');
    });

    it('should consume bonus action', () => {
      consumeAction('bonus-action', mockCharacter, 'second-wind');
      
      expect(mockCharacter.state.turnState.bonusActionUsed).toBe(true);
    });

    it('should consume reaction', () => {
      consumeAction('reaction', mockCharacter, 'opportunity-attack');
      
      expect(mockCharacter.state.turnState.reactionUsed).toBe(true);
    });

    it('should handle multiple main actions', () => {
      consumeAction('action', mockCharacter, 'attack-1');
      consumeAction('action', mockCharacter, 'attack-2');
      
      expect(mockCharacter.state.turnState.actionsUsed).toEqual(['attack-1', 'attack-2']);
    });

    it('should not affect state for free actions', () => {
      const originalState = { ...mockCharacter.state.turnState };
      
      consumeAction('free', mockCharacter, 'speak');
      
      expect(mockCharacter.state.turnState).toEqual(originalState);
    });

    it('should initialize state if missing', () => {
      delete mockCharacter.state;
      
      consumeAction('action', mockCharacter, 'attack');
      
      expect(mockCharacter.state).toBeDefined();
      expect(mockCharacter.state.turnState).toBeDefined();
      expect(mockCharacter.state.turnState.actionsUsed).toContain('attack');
    });
  });

  describe('getAvailableActions', () => {
    it('should return all available actions for fresh character', () => {
      const available = getAvailableActions(mockCharacter);
      
      expect(available.canUseAction).toBe(true);
      expect(available.canUseBonusAction).toBe(true);
      expect(available.canUseReaction).toBe(true);
      expect(available.actionsUsed).toEqual([]);
    });

    it('should show action unavailable after use', () => {
      mockCharacter.state.turnState.actionsUsed = ['attack'];
      
      const available = getAvailableActions(mockCharacter);
      
      expect(available.canUseAction).toBe(false);
      expect(available.canUseBonusAction).toBe(true);
      expect(available.canUseReaction).toBe(true);
      expect(available.actionsUsed).toEqual(['attack']);
    });

    it('should show bonus action unavailable after use', () => {
      mockCharacter.state.turnState.bonusActionUsed = true;
      
      const available = getAvailableActions(mockCharacter);
      
      expect(available.canUseAction).toBe(true);
      expect(available.canUseBonusAction).toBe(false);
      expect(available.canUseReaction).toBe(true);
    });

    it('should show all actions unavailable when incapacitated', () => {
      mockCharacter.state.conditions = ['unconscious'];
      
      const available = getAvailableActions(mockCharacter);
      
      expect(available.canUseAction).toBe(false);
      expect(available.canUseBonusAction).toBe(false);
      expect(available.canUseReaction).toBe(false);
    });
  });

  describe('findPlayerCharacter', () => {
    it('should find character by player ID', () => {
      const found = findPlayerCharacter('player-1', mockGameState as any);
      
      expect(found).toBe(mockCharacter);
    });

    it('should return null for non-existent player', () => {
      const found = findPlayerCharacter('player-999', mockGameState as any);
      
      expect(found).toBe(null);
    });

    it('should handle missing documents', () => {
      const emptyGameState = { documents: {} };
      const found = findPlayerCharacter('player-1', emptyGameState as any);
      
      expect(found).toBe(null);
    });
  });
});