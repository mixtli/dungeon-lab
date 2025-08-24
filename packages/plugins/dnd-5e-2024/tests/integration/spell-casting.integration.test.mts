/**
 * Spell Casting Integration Tests
 * 
 * Tests the integration between the spell casting handler and its dependencies:
 * - Integration with spell lookup service
 * - Integration with AsyncActionContext 
 * - Integration with plugin registration
 * - Error handling across component boundaries
 * 
 * Note: This focuses on integration boundaries rather than full end-to-end testing.
 * Comprehensive spell logic is covered by unit tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared/interfaces/action-context.interface.mjs';
import type { PluginContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { executeSpellCast } from '../../src/handlers/actions/spell-casting.handler.mjs';
import { DnD5e2024Plugin } from '../../src/index.mjs';

// Mock Vue's unref function
vi.mock('vue', () => ({
  unref: vi.fn((val) => val)
}));

// Mock plugin context with getDocument for spell lookup
const mockPluginContext: PluginContext = {
  compendiumService: {
    findEntry: vi.fn(),
    queryEntries: vi.fn()
  },
  registerRollHandler: vi.fn(),
  registerActionHandler: vi.fn(),
  registerTokenAction: vi.fn(),
  requestAction: vi.fn(),
  getDocument: vi.fn() // Primary method for document lookup in integration tests
};

// Integration test game state with full character and spell data
const createIntegrationGameState = (): ServerGameStateWithVirtuals => ({
  documents: {
    'character-wizard-001': {
      id: 'character-wizard-001',
      name: 'Integration Test Wizard',
      documentType: 'character',
      pluginDocumentType: 'character',
      pluginId: 'dnd-5e-2024',
      createdBy: 'player-001',
      createdAt: new Date(),
      updatedAt: new Date(),
      pluginData: {
        level: 5,
        class: { name: 'Wizard', levels: [{ class: 'Wizard', level: 5 }] },
        species: { name: 'Human' },
        background: { name: 'Sage' },
        abilities: {
          strength: 10, dexterity: 14, constitution: 13,
          intelligence: 16, wisdom: 12, charisma: 8
        },
        attributes: {
          hitPoints: { current: 32, maximum: 32 },
          armorClass: { value: 12, source: 'Mage Armor' },
          proficiencyBonus: 3,
          speed: { walk: 30 }
        },
        spellcasting: {
          ability: 'intelligence',
          classes: {
            wizard: {
              spellAttackBonus: 6, // +3 prof + +3 int
              spellSaveDC: 14 // 8 + 3 prof + 3 int
            }
          },
          // Top-level spell slots for integration compatibility
          spellSlots: {
            '0': { total: 99, used: 0 }, // Cantrips unlimited
            '1': { total: 4, used: 0 },
            '2': { total: 3, used: 0 },
            '3': { total: 2, used: 0 }
          }
        },
        spells: {
          known: ['spell-fire-bolt-001', 'spell-magic-missile-001'],
          prepared: ['spell-fire-bolt-001', 'spell-magic-missile-001']
        }
      },
      state: {
        spellSlotsUsed: {},
        turnState: {
          actionsUsed: [],
          movementUsed: 0,
          bonusActionUsed: false,
          reactionUsed: false
        },
        conditions: [],
        temporaryHitPoints: 0
      }
    },
    'actor-goblin-001': {
      id: 'actor-goblin-001',
      name: 'Integration Goblin',
      documentType: 'actor',
      pluginDocumentType: 'actor',
      pluginId: 'dnd-5e-2024',
      createdBy: 'gm',
      createdAt: new Date(),
      updatedAt: new Date(),
      pluginData: {
        name: 'Goblin',
        size: 'small',
        type: 'humanoid',
        armorClass: { value: 15, source: 'Leather Armor' },
        hitPoints: { average: 7, current: 7 },
        abilities: {
          strength: 8, dexterity: 14, constitution: 10,
          intelligence: 10, wisdom: 8, charisma: 8
        }
      },
      state: {}
    },
    'actor-orc-001': {
      id: 'actor-orc-001',
      name: 'Integration Orc',
      documentType: 'actor',
      pluginDocumentType: 'actor',
      pluginId: 'dnd-5e-2024',
      createdBy: 'gm',
      createdAt: new Date(),
      updatedAt: new Date(),
      pluginData: {
        name: 'Orc',
        size: 'medium',
        type: 'humanoid',
        armorClass: { value: 13, source: 'Hide Armor' },
        hitPoints: { average: 15, current: 15 },
        abilities: {
          strength: 16, dexterity: 12, constitution: 16,
          intelligence: 7, wisdom: 11, charisma: 10
        }
      },
      state: {}
    }
  },
  currentEncounter: {
    id: 'encounter-integration-001',
    name: 'Integration Test Encounter',
    tokens: [
      {
        id: 'token-wizard-001',
        documentId: 'character-wizard-001',
        name: 'Integration Test Wizard',
        bounds: { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } },
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        layer: 'tokens'
      },
      {
        id: 'token-goblin-001',
        documentId: 'actor-goblin-001',
        name: 'Integration Goblin',
        bounds: { topLeft: { x: 2, y: 2 }, bottomRight: { x: 2, y: 2 } },
        position: { x: 2, y: 2 },
        size: { width: 1, height: 1 },
        layer: 'tokens'
      },
      {
        id: 'token-orc-001',
        documentId: 'actor-orc-001',
        name: 'Integration Orc',
        bounds: { topLeft: { x: 4, y: 4 }, bottomRight: { x: 4, y: 4 } },
        position: { x: 4, y: 4 },
        size: { width: 1, height: 1 },
        layer: 'tokens'
      }
    ]
  }
});

// Real Fire Bolt spell data for integration testing
const fireBoltSpell = {
  id: 'spell-fire-bolt-001',
  name: 'Fire Bolt',
  documentType: 'vtt-document',
  pluginDocumentType: 'spell',
  pluginId: 'dnd-5e-2024',
  createdBy: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
  pluginData: {
    name: 'Fire Bolt',
    description: 'You hurl a mote of fire at a creature or object within range.',
    level: 0, // Cantrip
    school: 'evocation',
    castingTime: 'action',
    range: '120 feet',
    components: ['V', 'S'],
    duration: 'instantaneous',
    attackRoll: true, // Ranged spell attack
    damage: {
      dice: '1d10',
      type: 'fire',
      scalingDice: '1d10' // +1d10 per spell level above cantrip
    },
    ritualSpell: false,
    concentration: false
  }
};

describe('Spell Casting Integration Tests', () => {
  let gameState: ServerGameStateWithVirtuals;
  let mockAsyncActionContext: AsyncActionContext;
  let rollRequestId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    gameState = createIntegrationGameState();
    rollRequestId = 1;

    // Mock getDocument to return Fire Bolt spell by default
    (mockPluginContext.getDocument as any).mockResolvedValue(fireBoltSpell);

    // Create realistic async action context
    mockAsyncActionContext = {
      gameState,
      pluginContext: mockPluginContext,
      sendRollRequest: vi.fn().mockImplementation(async (playerId, rollType, rollData) => {
        const rollId = `integration-roll-${rollRequestId++}`;
        
        // Simulate realistic roll results based on roll type
        if (rollType === 'spell-attack') {
          return {
            id: rollId,
            results: [{ results: [12] }], // 12 + 6 = 18 attack roll (likely hit)
            metadata: { type: 'spell-attack', ...rollData.metadata }
          };
        } else if (rollType === 'spell-damage') {
          return {
            id: rollId,
            results: [{ results: [6] }], // 6 fire damage
            metadata: { type: 'spell-damage', ...rollData.metadata }
          };
        }
        
        return { id: rollId, results: [], metadata: {} };
      }),
      
      sendMultipleRollRequests: vi.fn().mockImplementation(async (rollRequests) => {
        // Return one attack roll result per request
        return rollRequests.map((_, index) => ({
          id: `integration-roll-${rollRequestId++}`,
          results: [{ results: [index === 0 ? 18 : 5] }], // First attack hits (18+6=24 vs AC 15), second misses (5+6=11 vs AC 13)
          metadata: { type: 'spell-attack' }
        }));
      }),
      
      sendChatMessage: vi.fn().mockResolvedValue(undefined),
      requestGMConfirmation: vi.fn().mockResolvedValue(true),
      cleanup: vi.fn()
    };
  });

  describe('Single Target Fire Bolt Integration', () => {
    it('should execute complete Fire Bolt workflow with real data', async () => {
      const spellCastRequest: GameActionRequest = {
        id: 'integration-request-001',
        timestamp: Date.now(),
        sessionId: 'integration-session',
        playerId: 'player-001',
        action: 'dnd5e-2024:cast-spell',
        parameters: {
          spellId: 'spell-fire-bolt-001',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001'],
          spellSlotLevel: 0, // Cantrip
          castingTime: 'action'
        }
      };

      // Execute spell casting with real integration
      await executeSpellCast(spellCastRequest, gameState, mockAsyncActionContext);

      // Verify spell lookup was called correctly via getDocument
      expect(mockPluginContext.getDocument).toHaveBeenCalledWith('spell-fire-bolt-001');

      // Verify attack roll was requested
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenCalledWith([
        expect.objectContaining({
          rollType: 'spell-attack',
          rollData: expect.objectContaining({
            message: 'Fire Bolt attack vs Integration Goblin',
            metadata: expect.objectContaining({
              spellId: 'spell-fire-bolt-001',
              attackBonus: 6, // From spell lookup service calculation
              spellName: 'Fire Bolt'
            })
          })
        })
      ]);

      // Verify damage roll was requested
      expect(mockAsyncActionContext.sendRollRequest).toHaveBeenCalledWith(
        'player-001',
        'spell-damage',
        expect.objectContaining({
          message: 'Fire Bolt fire damage',
          metadata: expect.objectContaining({
            spellId: 'spell-fire-bolt-001',
            spellLevel: 0,
            damageType: 'fire'
          })
        })
      );

      // Verify target took damage
      const damagedGoblin = gameState.documents['actor-goblin-001'];
      const goblinHp = (damagedGoblin.pluginData as any).hitPoints;
      expect(goblinHp.current).toBe(1); // 7 - 6 = 1 HP remaining

      // Verify spell slot was not consumed (cantrip) - cantrips return early from consumeSpellSlot
      const wizard = gameState.documents['character-wizard-001'];
      const characterData = wizard.pluginData as any;
      const spellSlots = characterData.spellcasting?.spellSlots;
      expect(spellSlots?.['0']?.used || 0).toBe(0); // Cantrips don't consume slots

      // Note: Action economy tracking is handled by the legacy cast-spell handler,
      // not the unified handler. This integration test focuses on the unified handler only.

      // Verify chat messages were sent
      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith(
        'Fire Bolt deals 6 fire damage to Integration Goblin'
      );
      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith(
        'Fire Bolt cast successfully!'
      );
    });
  });

  describe('Multi-Target Spell Integration', () => {
    it('should handle multiple targets with mixed hit/miss results', async () => {
      const multiTargetRequest: GameActionRequest = {
        id: 'integration-request-002',
        timestamp: Date.now(),
        sessionId: 'integration-session',
        playerId: 'player-001',
        action: 'dnd5e-2024:cast-spell',
        parameters: {
          spellId: 'spell-fire-bolt-001',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001', 'token-orc-001'],
          spellSlotLevel: 0,
          castingTime: 'action'
        }
      };

      await executeSpellCast(multiTargetRequest, gameState, mockAsyncActionContext);

      // Verify multiple attack rolls were requested
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            rollType: 'spell-attack',
            rollData: expect.objectContaining({
              message: 'Fire Bolt attack vs Integration Goblin'
            })
          }),
          expect.objectContaining({
            rollType: 'spell-attack',
            rollData: expect.objectContaining({
              message: 'Fire Bolt attack vs Integration Orc'
            })
          })
        ])
      );

      // Verify only the hit target took damage
      const goblin = gameState.documents['actor-goblin-001'];
      const orc = gameState.documents['actor-orc-001'];
      
      // Based on mock: first roll (18) hits goblin AC 15, second roll (8) misses orc AC 13
      expect((goblin.pluginData as any).hitPoints.current).toBe(1); // 7 - 6 = 1
      expect((orc.pluginData as any).hitPoints.current).toBe(15); // No damage from miss

      // Verify appropriate chat message for mixed results
      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith(
        'Fire Bolt deals 6 fire damage to Integration Goblin'
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle spell lookup failures gracefully', async () => {
      const invalidSpellRequest: GameActionRequest = {
        id: 'integration-request-003',
        timestamp: Date.now(),
        sessionId: 'integration-session',
        playerId: 'player-001',
        action: 'dnd5e-2024:cast-spell',
        parameters: {
          spellId: 'spell-nonexistent-001',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001'],
          spellSlotLevel: 0,
          castingTime: 'action'
        }
      };

      // Mock getDocument to return null (not found)
      (mockPluginContext.getDocument as any).mockResolvedValue(null);

      // Should throw error and send error message
      await expect(
        executeSpellCast(invalidSpellRequest, gameState, mockAsyncActionContext)
      ).rejects.toThrow('Spell not found: spell-nonexistent-001');

      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith(
        'Spell casting failed: Spell not found: spell-nonexistent-001'
      );

      // Verify no state changes occurred
      const originalGoblin = createIntegrationGameState().documents['actor-goblin-001'];
      expect((gameState.documents['actor-goblin-001'].pluginData as any).hitPoints.current)
        .toBe((originalGoblin.pluginData as any).hitPoints.current);
    });

    it('should handle roll request failures and rollback', async () => {
      const spellCastRequest: GameActionRequest = {
        id: 'integration-request-004',
        timestamp: Date.now(),
        sessionId: 'integration-session',
        playerId: 'player-001',
        action: 'dnd5e-2024:cast-spell',
        parameters: {
          spellId: 'spell-fire-bolt-001',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001'],
          spellSlotLevel: 0,
          castingTime: 'action'
        }
      };

      // Mock roll request to fail
      mockAsyncActionContext.sendMultipleRollRequests.mockRejectedValue(
        new Error('Network error during roll request')
      );

      // Should propagate error and send error message
      await expect(
        executeSpellCast(spellCastRequest, gameState, mockAsyncActionContext)
      ).rejects.toThrow('Network error during roll request');

      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith(
        'Spell casting failed: Network error during roll request'
      );
    });
  });

  describe('State Management Integration', () => {
    it('should properly track spell slot consumption for leveled spells', async () => {
      // Test with Magic Missile (1st level spell)
      const magicMissileSpell = {
        ...fireBoltSpell,
        id: 'spell-magic-missile-001',
        pluginData: {
          ...fireBoltSpell.pluginData,
          name: 'Magic Missile',
          level: 1,
          damage: {
            dice: '3d4+3', // 3 missiles, 1d4+1 each
            type: 'force'
          },
          attackRoll: false // Automatic hit
        }
      };

      // Mock getDocument to return Magic Missile spell
      (mockPluginContext.getDocument as any).mockResolvedValue(magicMissileSpell);

      const leveledSpellRequest: GameActionRequest = {
        id: 'integration-request-005',
        timestamp: Date.now(),
        sessionId: 'integration-session',
        playerId: 'player-001',
        action: 'dnd5e-2024:cast-spell',
        parameters: {
          spellId: 'spell-magic-missile-001',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001'],
          spellSlotLevel: 1,
          castingTime: 'action'
        }
      };

      await executeSpellCast(leveledSpellRequest, gameState, mockAsyncActionContext);

      // Verify spell slot was consumed using the new service structure
      const wizard = gameState.documents['character-wizard-001'];
      const characterData = wizard.pluginData as any;
      const spellSlots = characterData.spellcasting?.spellSlots;
      expect(spellSlots?.['1']?.used).toBe(1); // One 1st level slot used

      // Note: Action economy tracking is handled by the legacy cast-spell handler,
      // not the unified handler tested here.
    });
  });

  describe('Plugin Integration', () => {
    it('should work with D&D 5e 2024 plugin instance', async () => {
      // Create real plugin instance for integration test
      const plugin = new DnD5e2024Plugin();
      
      // Mock manifest data
      (plugin as any).manifest = {
        id: 'dnd-5e-2024',
        version: '2.0.0',
        name: 'D&D 5e 2024'
      };

      await plugin.onLoad(mockPluginContext);

      // Verify plugin loaded successfully and registered handlers
      expect(mockPluginContext.registerActionHandler).toHaveBeenCalledWith(
        'dnd5e-2024:cast-spell',
        expect.objectContaining({
          execute: expect.any(Function),
          validate: expect.any(Function)
        })
      );

      // Verify plugin has spell casting capabilities
      expect(plugin).toBeInstanceOf(DnD5e2024Plugin);
    });
  });

  // =============================================
  // PHASE 3.1: SAVING THROW INTEGRATION TESTS  
  // =============================================

  describe('Phase 3.1: Saving Throw Spell Integration', () => {
    it('should handle Sacred Flame (save-only spell) end-to-end', async () => {
      const mockSacredFlameSpell: DndSpellDocument = {
        id: 'spell-sacred-flame-001',
        pluginId: 'dnd-5e-2024', 
        pluginDocumentType: 'spell',
        name: 'Sacred Flame',
        pluginData: {
          name: 'Sacred Flame',
          level: 0,
          school: 'evocation',
          savingThrow: { ability: 'dexterity', effectOnSave: 'none' },
          damage: { dice: '1d8', type: 'radiant' }
        }
      };

      // Mock getDocument to return Sacred Flame
      mockPluginContext.getDocument.mockResolvedValue(mockSacredFlameSpell);

      const gameState = createIntegrationGameState();
      
      const saveResult = [
        {
          rollId: 'save-001',
          userId: 'player-001', 
          results: [{ sides: 20, results: [8] }], // 8 + 2 = 10 vs DC 15 (FAIL)
          arguments: {},
          recipients: 'public'
        }
      ];

      const damageResult = {
        rollId: 'damage-001',
        userId: 'player-001',
        results: [{ sides: 8, results: [5] }], // 5 radiant damage
        arguments: {},
        recipients: 'public' 
      };

      mockAsyncActionContext.sendMultipleRollRequests.mockResolvedValue(saveResult);
      mockAsyncActionContext.sendRollRequest.mockResolvedValue(damageResult);

      const sacredFlameRequest: GameActionRequest = {
        id: 'integration-sacred-flame',
        timestamp: Date.now(),
        sessionId: 'integration-session',
        playerId: 'player-001',
        action: 'dnd5e-2024:cast-spell',
        parameters: {
          spellId: 'spell-sacred-flame-001',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001'],
          spellSlotLevel: 0
        }
      };

      await executeSpellCast(sacredFlameRequest, gameState, mockAsyncActionContext);

      // Verify saving throw was requested
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            rollType: 'saving-throw',
            rollData: expect.objectContaining({
              message: expect.stringContaining('dexterity save vs Sacred Flame')
            })
          })
        ])
      );

      // Verify damage was applied (failed save)
      expect((gameState.documents['actor-goblin-001'].pluginData as any).hitPoints.current).toBe(2); // 7 - 5 = 2
    });

    it('should handle Fireball (save for half damage) end-to-end', async () => {
      const mockFireballSpell: DndSpellDocument = {
        id: 'spell-fireball-001',
        pluginId: 'dnd-5e-2024',
        pluginDocumentType: 'spell', 
        name: 'Fireball',
        pluginData: {
          name: 'Fireball',
          level: 3,
          school: 'evocation',
          savingThrow: { ability: 'dexterity', effectOnSave: 'half' },
          damage: { dice: '8d6', type: 'fire' }
        }
      };

      mockPluginContext.getDocument.mockResolvedValue(mockFireballSpell);

      const gameState = createIntegrationGameState();

      // Mock successful save
      const saveResult = [
        {
          rollId: 'save-001', 
          userId: 'player-001',
          results: [{ sides: 20, results: [18] }], // 18 + 2 = 20 vs DC 15 (SUCCESS)
          arguments: {},
          recipients: 'public'
        }
      ];

      const damageResult = {
        rollId: 'damage-001',
        userId: 'player-001',
        results: [{ sides: 6, results: [4, 3, 6, 2, 5, 1, 4, 3] }], // 28 total damage
        arguments: {},
        recipients: 'public'
      };

      mockAsyncActionContext.sendMultipleRollRequests.mockResolvedValue(saveResult);
      mockAsyncActionContext.sendRollRequest.mockResolvedValue(damageResult);

      const fireballRequest: GameActionRequest = {
        id: 'integration-fireball',
        timestamp: Date.now(),
        sessionId: 'integration-session', 
        playerId: 'player-001',
        action: 'dnd5e-2024:cast-spell',
        parameters: {
          spellId: 'spell-fireball-001',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001'],
          spellSlotLevel: 3
        }
      };

      await executeSpellCast(fireballRequest, gameState, mockAsyncActionContext);

      // Verify saving throw was requested
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            rollType: 'saving-throw',
            rollData: expect.objectContaining({
              message: expect.stringContaining('dexterity save vs Fireball')
            })
          })
        ])
      );

      // Verify half damage was applied (successful save): 28/2 = 14, so 7-14 = -7, clamped to 0
      expect((gameState.documents['actor-goblin-001'].pluginData as any).hitPoints.current).toBe(0);
    });

    it('should handle Ice Knife (attack + save) combined mechanics end-to-end', async () => {
      const mockIceKnifeSpell: DndSpellDocument = {
        id: 'spell-ice-knife-001',
        pluginId: 'dnd-5e-2024',
        pluginDocumentType: 'spell',
        name: 'Ice Knife', 
        pluginData: {
          name: 'Ice Knife',
          level: 1,
          school: 'conjuration',
          attackRoll: { type: 'ranged', ability: 'spell' },
          savingThrow: { ability: 'dexterity', effectOnSave: 'half' },
          damage: { dice: '1d10', type: 'piercing' }
        }
      };

      mockPluginContext.getDocument.mockResolvedValue(mockIceKnifeSpell);

      const gameState = createIntegrationGameState();

      // Mock attack hit
      const attackResult = [
        {
          rollId: 'attack-001',
          userId: 'player-001',
          results: [{ sides: 20, results: [15] }], // 15 + 5 = 20 vs AC 15 (HIT)
          arguments: {},
          recipients: 'public'
        }
      ];

      // Mock save failure  
      const saveResult = [
        {
          rollId: 'save-001',
          userId: 'player-001',
          results: [{ sides: 20, results: [8] }], // 8 + 2 = 10 vs DC 15 (FAIL)
          arguments: {},
          recipients: 'public'
        }
      ];

      const damageResult = {
        rollId: 'damage-001',
        userId: 'player-001', 
        results: [{ sides: 10, results: [7] }], // 7 piercing damage
        arguments: {},
        recipients: 'public'
      };

      mockAsyncActionContext.sendMultipleRollRequests
        .mockResolvedValueOnce(attackResult)
        .mockResolvedValueOnce(saveResult);
      mockAsyncActionContext.sendRollRequest.mockResolvedValue(damageResult);

      const iceKnifeRequest: GameActionRequest = {
        id: 'integration-ice-knife',
        timestamp: Date.now(),
        sessionId: 'integration-session',
        playerId: 'player-001', 
        action: 'dnd5e-2024:cast-spell',
        parameters: {
          spellId: 'spell-ice-knife-001',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001'],
          spellSlotLevel: 1
        }
      };

      await executeSpellCast(iceKnifeRequest, gameState, mockAsyncActionContext);

      // Verify both attack and save rolls were requested
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenCalledTimes(2);
      
      // Verify spell attack roll
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenNthCalledWith(1,
        expect.arrayContaining([
          expect.objectContaining({
            rollType: 'spell-attack'
          })
        ])
      );
      
      // Verify saving throw roll
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenNthCalledWith(2,
        expect.arrayContaining([
          expect.objectContaining({ 
            rollType: 'saving-throw'
          })
        ])
      );

      // Verify full damage applied (attack hit + save failed)
      expect((gameState.documents['actor-goblin-001'].pluginData as any).hitPoints.current).toBe(0); // 7 - 7 = 0
    });
  });
});