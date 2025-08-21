/**
 * Tests for D&D 5e Enhanced Weapon Handlers with Automation
 * 
 * Comprehensive test coverage for automatic attack resolution including:
 * - Automation mode detection and flag handling
 * - Hit/miss determination with various AC values
 * - Critical hit detection and dice doubling
 * - Damage roll request generation
 * - Automatic damage application integration
 * - Manual mode backward compatibility
 * - Error handling for missing game state/documents
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DndWeaponAttackHandler, DndWeaponDamageHandler } from '../../src/services/dnd-weapon-handlers.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { RollHandlerContext } from '@dungeon-lab/shared-ui/types/plugin.mjs';

describe('Enhanced D&D Weapon Handlers', () => {
  let attackHandler: DndWeaponAttackHandler;
  let damageHandler: DndWeaponDamageHandler;
  let mockContext: RollHandlerContext;
  let mockGameState: any;
  let mockWeapon: any;
  let mockCharacter: any;

  beforeEach(() => {
    attackHandler = new DndWeaponAttackHandler();
    damageHandler = new DndWeaponDamageHandler();

    // Create mock weapon
    mockWeapon = {
      id: 'sword-123',
      name: 'Longsword',
      documentType: 'item',
      pluginData: {
        damage: {
          dice: '1d8',
          type: 'slashing'
        },
        damageType: 'slashing',
        weaponType: 'melee',
        category: 'martial',
        properties: [],
        enhancement: 0
      }
    };

    // Create mock character
    mockCharacter = {
      id: 'char-123',
      name: 'Test Fighter',
      documentType: 'character',
      pluginData: {
        abilities: {
          strength: { value: 16 },
          dexterity: { value: 14 }
        },
        progression: {
          level: 5
        },
        proficiencies: {
          weapons: ['martial-weapons']
        }
      }
    };

    // Create mock target character
    const mockTarget = {
      id: 'target-123',
      name: 'Test Monster',
      documentType: 'character',
      pluginData: {
        armorClass: 15,
        hitPoints: {
          max: 30,
          current: 25
        }
      },
      state: {
        currentHitPoints: 25,
        conditions: []
      }
    };

    // Create mock game state
    mockGameState = {
      documents: {
        'target-123': mockTarget,
        'char-123': mockCharacter,
        'sword-123': mockWeapon
      },
      currentEncounter: {
        tokens: [
          {
            id: 'target-123',
            name: 'Test Monster Token',
            documentId: 'target-123',
            x: 0,
            y: 0
          }
        ]
      }
    };

    // Create mock context
    mockContext = {
      isGM: true,
      userId: 'gm-user',
      gameState: mockGameState,
      sendChatMessage: vi.fn(),
      requestAction: vi.fn().mockResolvedValue({ success: true }),
      requestRoll: vi.fn()
    };
  });

  describe('DndWeaponAttackHandler - Automation Mode', () => {
    it('should detect and process automation mode correctly', async () => {
      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '1d20+5',
        results: [{ sides: 20, results: [15] }],
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetTokenIds: ['target-123']
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, mockContext);

      // Should have called sendChatMessage with hit result
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('**→ HIT!**'),
        expect.any(Object)
      );

      // Should have requested damage roll
      expect(mockContext.requestRoll).toHaveBeenCalledWith(
        'player-1',
        expect.objectContaining({
          rollType: 'weapon-damage',
          diceExpression: '1d8',
          metadata: expect.objectContaining({
            weaponId: 'sword-123',
            characterId: 'char-123',
            autoMode: true,
            targetId: 'target-123',
            isCriticalHit: false
          })
        })
      );
    });

    it('should determine miss correctly against high AC', async () => {
      // Set target AC higher than attack total
      mockGameState.documents['target-123'].pluginData.armorClass = 25;

      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '1d20+5',
        results: [{ sides: 20, results: [10] }], // Total 15, AC 25 = miss
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetTokenIds: ['target-123']
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, mockContext);

      // Should have called sendChatMessage with miss result
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('**→ MISS**'),
        expect.any(Object)
      );

      // Should NOT have requested damage roll
      expect(mockContext.requestRoll).not.toHaveBeenCalled();
    });

    it('should handle critical hits correctly (always hit)', async () => {
      // Set target AC higher than attack total, but critical should still hit
      mockGameState.documents['target-123'].pluginData.armorClass = 25;

      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '1d20+5',
        results: [{ sides: 20, results: [20] }], // Natural 20 = critical hit
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetTokenIds: ['target-123']
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, mockContext);

      // Should have called sendChatMessage with hit result and critical indicator
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('🎯 **CRITICAL HIT!**'),
        expect.any(Object)
      );
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('**→ HIT!**'),
        expect.any(Object)
      );

      // Should have requested damage roll with critical flag
      expect(mockContext.requestRoll).toHaveBeenCalledWith(
        'player-1',
        expect.objectContaining({
          metadata: expect.objectContaining({
            weaponId: 'sword-123',
            characterId: 'char-123',
            isCriticalHit: true
          })
        })
      );
    });

    it('should fallback gracefully when target AC cannot be determined', async () => {
      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '1d20+5',
        results: [{ sides: 20, results: [15] }],
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetTokenIds: ['nonexistent-target']
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, mockContext);

      // Should have called sendChatMessage with error indicator
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('*(Could not determine target AC)*'),
        expect.any(Object)
      );

      // Should NOT have requested damage roll
      expect(mockContext.requestRoll).not.toHaveBeenCalled();
    });

    it('should maintain manual mode when autoMode is false', async () => {
      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '1d20+5',
        results: [{ sides: 20, results: [15] }],
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: false,
          targetTokenIds: ['target-123']
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, mockContext);

      // Should have called sendChatMessage without hit/miss indicators
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.not.stringContaining('**→'),
        expect.any(Object)
      );

      // Should NOT have requested damage roll
      expect(mockContext.requestRoll).not.toHaveBeenCalled();
    });
  });

  describe('DndWeaponDamageHandler - Automation Mode', () => {
    it('should apply damage automatically in auto mode', async () => {
      const mockResult: RollServerResult = {
        id: 'roll-456',
        userId: 'player-1',
        rollType: 'weapon-damage',
        pluginId: 'dnd-5e-2024',
        expression: '1d8+3',
        results: [{ sides: 8, results: [6] }],
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetId: 'target-123',
          isCriticalHit: false
        },
        recipients: 'public'
      };

      await damageHandler.handleRoll(mockResult, mockContext);

      // Should have called requestAction to apply damage
      expect(mockContext.requestAction).toHaveBeenCalledWith(
        'dnd5e-2024:apply-damage',
        expect.objectContaining({
          targetCharacterId: 'target-123',
          damage: expect.any(Number),
          damageType: 'slashing',
          source: 'Longsword attack'
        }),
        expect.objectContaining({
          description: expect.stringContaining('Apply')
        })
      );

      // Should have called sendChatMessage with application confirmation
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('**→ Applied to target!**'),
        expect.any(Object)
      );
    });

    it('should double dice for critical hits', async () => {
      const mockResult: RollServerResult = {
        id: 'roll-456',
        userId: 'player-1',
        rollType: 'weapon-damage',
        pluginId: 'dnd-5e-2024',
        expression: '1d8+3',
        results: [{ sides: 8, results: [6] }], // 6 dice + 3 modifier = 9, critical = 12 + 3 = 15
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetId: 'target-123',
          isCriticalHit: true
        },
        recipients: 'public'
      };

      await damageHandler.handleRoll(mockResult, mockContext);

      // Should have called requestAction with doubled dice damage
      expect(mockContext.requestAction).toHaveBeenCalledWith(
        'dnd5e-2024:apply-damage',
        expect.objectContaining({
          damage: 15 // (6 * 2) + 3 = 15
        }),
        expect.any(Object)
      );

      // Should have called sendChatMessage with critical indicator
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('⚡ *Critical damage*'),
        expect.any(Object)
      );
    });

    it('should handle damage application failure gracefully', async () => {
      // Mock requestAction to reject
      mockContext.requestAction = vi.fn().mockRejectedValue(new Error('Action failed'));

      const mockResult: RollServerResult = {
        id: 'roll-456',
        userId: 'player-1',
        rollType: 'weapon-damage',
        pluginId: 'dnd-5e-2024',
        expression: '1d8+3',
        results: [{ sides: 8, results: [6] }],
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetId: 'target-123',
          isCriticalHit: false
        },
        recipients: 'public'
      };

      await damageHandler.handleRoll(mockResult, mockContext);

      // Should have called sendChatMessage with failure indicator
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('*(Failed to apply damage)*'),
        expect.any(Object)
      );
    });

    it('should maintain manual mode when autoMode is false', async () => {
      const mockResult: RollServerResult = {
        id: 'roll-456',
        userId: 'player-1',
        rollType: 'weapon-damage',
        pluginId: 'dnd-5e-2024',
        expression: '1d8+3',
        results: [{ sides: 8, results: [6] }],
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: false,
          targetId: 'target-123',
          isCriticalHit: false
        },
        recipients: 'public'
      };

      await damageHandler.handleRoll(mockResult, mockContext);

      // Should NOT have called requestAction
      expect(mockContext.requestAction).not.toHaveBeenCalled();

      // Should have called sendChatMessage without application indicators
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.not.stringContaining('**→'),
        expect.any(Object)
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle non-GM clients correctly', async () => {
      const playerContext: RollHandlerContext = {
        ...mockContext,
        isGM: false
      };

      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '1d20+5',
        results: [{ sides: 20, results: [15] }],
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter'
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, playerContext);

      // Player clients should not process any automation logic
      expect(playerContext.sendChatMessage).not.toHaveBeenCalled();
      expect(playerContext.requestAction).not.toHaveBeenCalled();
    });

    it('should handle missing game state gracefully', async () => {
      const contextWithoutGameState: RollHandlerContext = {
        ...mockContext,
        gameState: undefined
      };

      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '1d20+5',
        results: [{ sides: 20, results: [15] }],
        arguments: { customModifier: 0 },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetTokenIds: ['target-123']
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, contextWithoutGameState);

      // Should not process attack without game state (can't lookup weapon/character)
      expect(contextWithoutGameState.sendChatMessage).not.toHaveBeenCalled();
      expect(contextWithoutGameState.requestRoll).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing weapon/character data', async () => {
      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '1d20+5',
        results: [{ sides: 20, results: [15] }],
        arguments: { customModifier: 0 },
        metadata: {
          // Missing weapon and character
          characterName: 'Test Fighter'
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, mockContext);

      // Should exit early without any processing
      expect(mockContext.sendChatMessage).not.toHaveBeenCalled();
    });

    it('should handle advantage/disadvantage dice correctly', async () => {
      const mockResult: RollServerResult = {
        id: 'roll-123',
        userId: 'player-1',
        rollType: 'weapon-attack',
        pluginId: 'dnd-5e-2024',
        expression: '2d20kh1+5',
        results: [{ sides: 20, results: [8, 17] }], // Advantage: take higher (17)
        arguments: { 
          customModifier: 0,
          pluginArgs: { advantageMode: 'advantage' }
        },
        metadata: {
          weaponId: 'sword-123',
          characterId: 'char-123',
          characterName: 'Test Fighter',
          autoMode: true,
          targetTokenIds: ['target-123']
        },
        recipients: 'public'
      };

      await attackHandler.handleRoll(mockResult, mockContext);

      // Should process with the higher roll (17 + modifiers)
      expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
        expect.stringContaining('**→ HIT!**'), // 17 + modifiers should hit AC 15
        expect.any(Object)
      );
    });
  });
});