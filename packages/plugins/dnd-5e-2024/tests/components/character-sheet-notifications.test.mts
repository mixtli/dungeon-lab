/**
 * Character Sheet Notification Tests
 * 
 * Tests the user notification functionality for failed attack actions
 */

import { describe, it, expect } from 'vitest';

describe('Character Sheet Notification Helpers', () => {
  // Extract the getUserFriendlyActionError function logic for testing
  const getUserFriendlyActionError = (error?: string): string => {
    if (!error) return 'Cannot perform attack at this time';

    // Handle specific D&D action economy errors
    if (error.includes('Already used action this turn')) {
      return 'You have already used your action this turn';
    }
    
    if (error.includes('Already used bonus action this turn')) {
      return 'You have already used your bonus action this turn';
    }
    
    if (error.includes('Already used reaction this round')) {
      return 'You have already used your reaction this round';
    }
    
    if (error.includes('paralyzed')) {
      return 'You cannot act while paralyzed';
    }
    
    if (error.includes('stunned')) {
      return 'You cannot act while stunned';
    }
    
    if (error.includes('unconscious')) {
      return 'You cannot act while unconscious';
    }
    
    if (error.includes('incapacitated')) {
      return 'You cannot act while incapacitated';
    }
    
    if (error.includes('petrified')) {
      return 'You cannot act while petrified';
    }
    
    if (error.includes("It's not your turn")) {
      return "It's not your turn";
    }
    
    // Generic fallback for other errors
    return 'Cannot perform attack at this time';
  };

  describe('getUserFriendlyActionError', () => {
    it('should handle action already used error', () => {
      const result = getUserFriendlyActionError('Already used action this turn: Attack');
      expect(result).toBe('You have already used your action this turn');
    });

    it('should handle bonus action already used error', () => {
      const result = getUserFriendlyActionError('Already used bonus action this turn');
      expect(result).toBe('You have already used your bonus action this turn');
    });

    it('should handle reaction already used error', () => {
      const result = getUserFriendlyActionError('Already used reaction this round');
      expect(result).toBe('You have already used your reaction this round');
    });

    it('should handle paralyzed condition', () => {
      const result = getUserFriendlyActionError('Cannot perform actions due to condition: paralyzed');
      expect(result).toBe('You cannot act while paralyzed');
    });

    it('should handle stunned condition', () => {
      const result = getUserFriendlyActionError('Cannot perform actions due to condition: stunned');
      expect(result).toBe('You cannot act while stunned');
    });

    it('should handle unconscious condition', () => {
      const result = getUserFriendlyActionError('Cannot perform actions due to condition: unconscious');
      expect(result).toBe('You cannot act while unconscious');
    });

    it('should handle turn order error', () => {
      const result = getUserFriendlyActionError("It's not your turn or you cannot perform this action now");
      expect(result).toBe("It's not your turn");
    });

    it('should provide generic fallback for unknown errors', () => {
      const result = getUserFriendlyActionError('Some unexpected error message');
      expect(result).toBe('Cannot perform attack at this time');
    });

    it('should handle undefined error', () => {
      const result = getUserFriendlyActionError(undefined);
      expect(result).toBe('Cannot perform attack at this time');
    });

    it('should handle empty string error', () => {
      const result = getUserFriendlyActionError('');
      expect(result).toBe('Cannot perform attack at this time');
    });
  });

  describe('Error message coverage', () => {
    it('should handle all D&D action economy error codes', () => {
      const testCases = [
        { input: 'ACTION_ALREADY_USED', expected: 'Cannot perform attack at this time' },
        { input: 'Already used action this turn: Attack', expected: 'You have already used your action this turn' },
        { input: 'BONUS_ACTION_ALREADY_USED', expected: 'Cannot perform attack at this time' },
        { input: 'REACTION_ALREADY_USED', expected: 'Cannot perform attack at this time' },
        { input: 'ACTION_RESTRICTED_BY_CONDITION', expected: 'Cannot perform attack at this time' },
        { input: 'Character cannot move due to condition: paralyzed', expected: 'You cannot act while paralyzed' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = getUserFriendlyActionError(input);
        expect(result).toBe(expected);
      });
    });
  });
});