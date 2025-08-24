import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import type { GameActionRequest, ServerGameStateWithVirtuals, ICharacter, IActor } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared/interfaces/action-context.interface.mjs';
import type { PluginContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { DndSpellDocument } from '../../../src/types/dnd/spell.mjs';
import type { DndCharacterData } from '../../../src/types/dnd/character.mjs';
import { executeSpellCast } from '../../../src/handlers/actions/spell-casting.handler.mjs';

// Mock Vue's unref function
vi.mock('vue', () => ({
  unref: vi.fn((val) => val)
}));

// Mock spell lookup service
vi.mock('../../../src/services/spell-lookup.service.mjs', () => ({
  lookupSpell: vi.fn(),
  getCasterForToken: vi.fn(),
  getTargetForToken: vi.fn(),
  hasSpellSlotsAvailable: vi.fn(),
  consumeSpellSlot: vi.fn(),
  calculateSpellAttackBonus: vi.fn(),
  getSpellDamage: vi.fn()
}));

// Import mocked functions
import {
  lookupSpell,
  getCasterForToken,
  getTargetForToken,
  hasSpellSlotsAvailable,
  consumeSpellSlot,
  calculateSpellAttackBonus,
  getSpellDamage
} from '../../../src/services/spell-lookup.service.mjs';

// Mock Fire Bolt spell document
const mockFireBoltSpell: DndSpellDocument = {
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
    description: 'A ranged spell attack',
    level: 0, // Cantrip
    school: 'evocation',
    classAvailability: {
      wizard: { level: 0, source: 'class' }
    },
    castingTime: 'Action',
    range: '120 feet',
    components: {
      verbal: true,
      somatic: true,
      material: null
    },
    duration: 'Instantaneous',
    ritual: false,
    concentration: false,
    damage: {
      dice: '1d10',
      type: 'fire'
    },
    attackRoll: {
      type: 'ranged',
      description: 'Ranged spell attack'
    }
  }
};

// Mock wizard character
const mockWizardCharacter: ICharacter = {
  id: 'character-wizard-001',
  name: 'Test Wizard',
  documentType: 'character',
  createdBy: 'player-001',
  createdAt: new Date(),
  updatedAt: new Date(),
  pluginData: {
    name: 'Test Wizard',
    species: 'human-ref',
    background: 'sage-ref',
    classes: [{
      class: 'wizard-ref',
      level: 3,
      hitPointsRolled: [6, 4, 5]
    }],
    progression: {
      level: 3,
      experiencePoints: 900,
      proficiencyBonus: 2,
      classLevels: { wizard: 3 },
      hitDice: { wizard: { total: 3, used: 0 } }
    },
    attributes: {
      hitPoints: { current: 18, maximum: 18, temporary: 0 },
      armorClass: { value: 12, calculation: 'natural' },
      initiative: { bonus: 2, advantage: false },
      movement: { walk: 30 },
      deathSaves: { successes: 0, failures: 0 },
      exhaustion: 0,
      inspiration: false
    },
    abilities: {
      strength: { base: 10, racial: 0, enhancement: 0 },
      dexterity: { base: 14, racial: 0, enhancement: 0 },
      constitution: { base: 13, racial: 0, enhancement: 0 },
      intelligence: { base: 16, racial: 0, enhancement: 0 },
      wisdom: { base: 12, racial: 0, enhancement: 0 },
      charisma: { base: 8, racial: 0, enhancement: 0 }
    },
    skills: {},
    proficiencies: { armor: [], weapons: [], tools: [], languages: [], other: [] },
    spellcasting: {
      classes: {
        wizard: {
          ability: 'intelligence',
          spellcastingLevel: 3,
          spellSaveDC: 13,
          spellAttackBonus: 5,
          preparation: 'prepared'
        }
      },
      spellSlots: {
        '1': { total: 2, used: 0 },
        '2': { total: 1, used: 0 }
      },
      spells: [],
      cantrips: [
        { name: 'Fire Bolt', spell: 'spell-fire-bolt-001', class: 'wizard' }
      ]
    }
  } as DndCharacterData
};

// Mock goblin actor
const mockGoblinActor: IActor = {
  id: 'actor-goblin-001',
  name: 'Goblin',
  documentType: 'actor',
  createdBy: 'dm',
  createdAt: new Date(),
  updatedAt: new Date(),
  pluginData: {
    name: 'Goblin',
    size: 'small',
    type: 'humanoid',
    alignment: 'neutral evil',
    armorClass: { value: 15, source: 'Leather Armor' },
    hitPoints: { average: 7, formula: '2d6', current: 7 },
    speed: { walk: 30 },
    abilities: {
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8
    },
    proficiencyBonus: 2,
    actions: [],
    traits: [],
    legendaryActions: []
  }
};

// Mock game state
const mockGameState: ServerGameStateWithVirtuals = {
  documents: {
    'character-wizard-001': mockWizardCharacter,
    'actor-goblin-001': mockGoblinActor
  },
  currentEncounter: {
    id: 'encounter-001',
    name: 'Test Encounter',
    tokens: [
      {
        id: 'token-wizard-001',
        documentId: 'character-wizard-001',
        name: 'Test Wizard',
        bounds: {
          topLeft: { x: 0, y: 0 },
          bottomRight: { x: 0, y: 0 }
        },
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        layer: 'tokens'
      },
      {
        id: 'token-goblin-001',
        documentId: 'actor-goblin-001',
        name: 'Goblin',
        bounds: {
          topLeft: { x: 2, y: 2 },
          bottomRight: { x: 2, y: 2 }
        },
        position: { x: 2, y: 2 },
        size: { width: 1, height: 1 },
        layer: 'tokens'
      }
    ]
  }
} as ServerGameStateWithVirtuals;

// Mock plugin context
const mockPluginContext: PluginContext = {
  getDocument: vi.fn(),
  searchDocuments: vi.fn(),
  getCompendiumEntry: vi.fn(),
  searchCompendiumEntries: vi.fn(),
  store: {},
  gameState: undefined
};

// Mock async action context
const mockAsyncActionContext: AsyncActionContext = {
  gameState: mockGameState,
  pluginContext: mockPluginContext,
  sendRollRequest: vi.fn(),
  sendMultipleRollRequests: vi.fn(),
  sendChatMessage: vi.fn(),
  requestGMConfirmation: vi.fn(),
  cleanup: vi.fn()
};

// Mock spell casting request
const mockSpellCastRequest: GameActionRequest = {
  id: 'request-001',
  timestamp: Date.now(),
  sessionId: 'session-001',
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

describe('Unified Spell Casting Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock implementations
    (lookupSpell as MockedFunction<any>).mockResolvedValue(mockFireBoltSpell);
    (getCasterForToken as MockedFunction<any>).mockReturnValue(mockWizardCharacter);
    (getTargetForToken as MockedFunction<any>).mockReturnValue(mockGoblinActor);
    (hasSpellSlotsAvailable as MockedFunction<any>).mockReturnValue(true);
    (consumeSpellSlot as MockedFunction<any>).mockReturnValue(true);
    (calculateSpellAttackBonus as MockedFunction<any>).mockReturnValue(5);
    (getSpellDamage as MockedFunction<any>).mockReturnValue({ dice: '1d10', type: 'fire' });
    
    // Mock AsyncActionContext methods with default return values
    (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue([
      {
        id: 'roll-001',
        results: [{ results: [15] }], // Attack roll: 15 + 5 = 20 vs AC 15 (hit)
        metadata: { type: 'spell-attack' }
      }
    ]);
    
    (mockAsyncActionContext.sendRollRequest as MockedFunction<any>).mockResolvedValue({
      id: 'roll-002', 
      results: [{ results: [8] }], // Damage roll: 8 fire damage
      metadata: { type: 'spell-damage' }
    });
    
    (mockAsyncActionContext.sendChatMessage as MockedFunction<any>).mockResolvedValue(undefined);
  });

  describe('Parameter Validation and Setup', () => {
    it('should extract parameters correctly', async () => {
      const mockDraft = structuredClone(mockGameState);
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      expect(lookupSpell).toHaveBeenCalledWith('spell-fire-bolt-001', mockPluginContext);
      expect(getCasterForToken).toHaveBeenCalledWith('token-wizard-001', mockDraft);
      expect(getTargetForToken).toHaveBeenCalledWith('token-goblin-001', mockDraft);
    });

    it('should throw error for invalid parameters', async () => {
      const invalidRequest = {
        ...mockSpellCastRequest,
        parameters: {
          spellId: '',
          casterTokenId: 'token-wizard-001',
          targetTokenIds: ['token-goblin-001'],
          spellSlotLevel: 0
        }
      };

      await expect(executeSpellCast(invalidRequest, mockGameState, mockAsyncActionContext))
        .rejects.toThrow('Invalid spell casting parameters');
    });

    it('should throw error when spell not found', async () => {
      (lookupSpell as MockedFunction<any>).mockResolvedValue(null);

      await expect(executeSpellCast(mockSpellCastRequest, mockGameState, mockAsyncActionContext))
        .rejects.toThrow('Spell not found: spell-fire-bolt-001');
    });

    it('should throw error when caster not found', async () => {
      (getCasterForToken as MockedFunction<any>).mockReturnValue(null);

      await expect(executeSpellCast(mockSpellCastRequest, mockGameState, mockAsyncActionContext))
        .rejects.toThrow('Caster not found for token: token-wizard-001');
    });

    it('should throw error when no targets found', async () => {
      (getTargetForToken as MockedFunction<any>).mockReturnValue(null);

      await expect(executeSpellCast(mockSpellCastRequest, mockGameState, mockAsyncActionContext))
        .rejects.toThrow('No valid targets found');
    });
  });

  describe('Spell Slot Validation', () => {
    it('should validate spell slot availability', async () => {
      const mockDraft = structuredClone(mockGameState);
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      expect(hasSpellSlotsAvailable).toHaveBeenCalledWith(mockWizardCharacter, 0);
    });

    it('should throw error when no spell slots available', async () => {
      (hasSpellSlotsAvailable as MockedFunction<any>).mockReturnValue(false);

      await expect(executeSpellCast(mockSpellCastRequest, mockGameState, mockAsyncActionContext))
        .rejects.toThrow('No available level 0 spell slots');
    });

    it('should consume spell slot on successful cast', async () => {
      const mockDraft = structuredClone(mockGameState);
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      expect(consumeSpellSlot).toHaveBeenCalledWith(mockWizardCharacter, 0);
    });

    it('should throw error when spell slot consumption fails', async () => {
      (consumeSpellSlot as MockedFunction<any>).mockReturnValue(false);

      await expect(executeSpellCast(mockSpellCastRequest, mockGameState, mockAsyncActionContext))
        .rejects.toThrow('Failed to consume level 0 spell slot');
    });
  });

  describe('Phase 1: Spell Attack Logic', () => {
    it('should request attack rolls for spells with attackRoll property', async () => {
      const mockDraft = structuredClone(mockGameState);
      const mockAttackResults = [{
        rollId: 'roll-001',
        userId: 'player-001',
        results: [{ sides: 20, results: [15] }],
        arguments: {},
        recipients: 'public'
      }];
      
      (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue(mockAttackResults);
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenCalledWith([{
        playerId: 'player-001',
        rollType: 'spell-attack',
        rollData: {
          message: 'Fire Bolt attack vs Goblin',
          dice: [{ sides: 20, quantity: 1 }],
          metadata: {
            spellId: 'spell-fire-bolt-001',
            targetId: 'actor-goblin-001',
            attackBonus: 5,
            spellName: 'Fire Bolt'
          }
        }
      }]);
    });

    it('should calculate hit/miss correctly', async () => {
      const mockDraft = structuredClone(mockGameState);
      const mockAttackResults = [{
        rollId: 'roll-001',
        userId: 'player-001',
        results: [{ sides: 20, results: [15] }], // 15 + 5 = 20 vs AC 15 = HIT
        arguments: {},
        recipients: 'public'
      }];
      
      (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue(mockAttackResults);
      (mockAsyncActionContext.sendRollRequest as MockedFunction<any>).mockResolvedValue({
        rollId: 'damage-roll-001',
        userId: 'player-001',
        results: [{ sides: 10, results: [8] }],
        arguments: {},
        recipients: 'public'
      });
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      // Should proceed to damage phase since attack hit
      expect(mockAsyncActionContext.sendRollRequest).toHaveBeenCalledWith(
        'player-001',
        'spell-damage',
        expect.objectContaining({
          message: 'Fire Bolt fire damage'
        })
      );
    });

    it('should handle complete misses for attack-only spells', async () => {
      const mockDraft = structuredClone(mockGameState);
      const mockAttackResults = [{
        rollId: 'roll-001',
        userId: 'player-001',
        results: [{ sides: 20, results: [1] }], // 1 + 5 = 6 vs AC 15 = MISS
        arguments: {},
        recipients: 'public'
      }];
      
      // Create a spell without damage (attack-only spell)
      const attackOnlySpell = {
        ...mockFireBoltSpell,
        pluginData: {
          ...mockFireBoltSpell.pluginData,
          damage: undefined // Remove damage property to make it attack-only
        }
      };
      
      (lookupSpell as MockedFunction<any>).mockResolvedValue(attackOnlySpell);
      (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue(mockAttackResults);
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      // Should send miss message and not proceed to damage
      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith('Fire Bolt - All attacks missed!');
      expect(mockAsyncActionContext.sendRollRequest).not.toHaveBeenCalled();
    });
  });

  describe('Phase 3: Damage Application', () => {
    it('should request damage roll for spells with damage property', async () => {
      const mockDraft = structuredClone(mockGameState);
      const mockAttackResults = [{
        rollId: 'roll-001',
        userId: 'player-001',
        results: [{ sides: 20, results: [15] }],
        arguments: {},
        recipients: 'public'
      }];
      
      (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue(mockAttackResults);
      (mockAsyncActionContext.sendRollRequest as MockedFunction<any>).mockResolvedValue({
        rollId: 'damage-roll-001',
        userId: 'player-001',
        results: [{ sides: 10, results: [8] }],
        arguments: {},
        recipients: 'public'
      });
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      expect(mockAsyncActionContext.sendRollRequest).toHaveBeenCalledWith(
        'player-001',
        'spell-damage',
        {
          message: 'Fire Bolt fire damage',
          dice: [{ sides: 10, quantity: 1 }],
          metadata: {
            spellId: 'spell-fire-bolt-001',
            spellLevel: 0,
            damageType: 'fire',
            spellName: 'Fire Bolt'
          }
        }
      );
    });

    it('should apply damage to hit targets only', async () => {
      const mockDraft = structuredClone(mockGameState);
      const mockAttackResults = [{
        rollId: 'roll-001',
        userId: 'player-001',
        results: [{ sides: 20, results: [15] }], // HIT
        arguments: {},
        recipients: 'public'
      }];
      
      (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue(mockAttackResults);
      (mockAsyncActionContext.sendRollRequest as MockedFunction<any>).mockResolvedValue({
        rollId: 'damage-roll-001',
        userId: 'player-001',
        results: [{ sides: 10, results: [8] }],
        arguments: {},
        recipients: 'public'
      });
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      // Check that goblin's HP was reduced (damage is clamped to 0)
      const damagedGoblin = mockDraft.documents['actor-goblin-001'] as IActor;
      const actorData = damagedGoblin.pluginData as { hitPoints: { current: number; average: number } };
      expect(actorData.hitPoints.current).toBe(0); // 7 - 8 = -1, clamped to 0
    });

    it('should send damage summary message', async () => {
      const mockDraft = structuredClone(mockGameState);
      const mockAttackResults = [{
        rollId: 'roll-001',
        userId: 'player-001',
        results: [{ sides: 20, results: [15] }],
        arguments: {},
        recipients: 'public'
      }];
      
      (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue(mockAttackResults);
      (mockAsyncActionContext.sendRollRequest as MockedFunction<any>).mockResolvedValue({
        rollId: 'damage-roll-001',
        userId: 'player-001',
        results: [{ sides: 10, results: [8] }],
        arguments: {},
        recipients: 'public'
      });
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith(
        'Fire Bolt deals 8 fire damage to Goblin'
      );
      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith(
        'Fire Bolt cast successfully!'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully and send error message', async () => {
      const mockDraft = structuredClone(mockGameState);
      (lookupSpell as MockedFunction<any>).mockRejectedValue(new Error('Network error'));
      
      await expect(executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext))
        .rejects.toThrow('Network error');
      
      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith(
        'Spell casting failed: Network error'
      );
    });

    it('should handle missing damage info gracefully', async () => {
      const mockDraft = structuredClone(mockGameState);
      const mockAttackResults = [{
        rollId: 'roll-001',
        userId: 'player-001',
        results: [{ sides: 20, results: [15] }],
        arguments: {},
        recipients: 'public'
      }];
      
      (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue(mockAttackResults);
      (getSpellDamage as MockedFunction<any>).mockReturnValue(null);
      
      await executeSpellCast(mockSpellCastRequest, mockDraft, mockAsyncActionContext);
      
      // Should complete successfully even without damage data
      expect(mockAsyncActionContext.sendChatMessage).toHaveBeenCalledWith('Fire Bolt cast successfully!');
    });
  });

  describe('Multi-Target Support', () => {
    it('should handle multiple targets correctly', async () => {
      const multiTargetRequest = {
        ...mockSpellCastRequest,
        parameters: {
          ...mockSpellCastRequest.parameters,
          targetTokenIds: ['token-goblin-001', 'token-goblin-001'] // Two targets for test
        }
      };
      
      const mockDraft = structuredClone(mockGameState);
      const mockAttackResults = [
        {
          rollId: 'roll-001',
          userId: 'player-001',
          results: [{ sides: 20, results: [15] }], // HIT
          arguments: {},
          recipients: 'public'
        },
        {
          rollId: 'roll-002',
          userId: 'player-001',
          results: [{ sides: 20, results: [5] }], // MISS
          arguments: {},
          recipients: 'public'
        }
      ];
      
      (mockAsyncActionContext.sendMultipleRollRequests as MockedFunction<any>).mockResolvedValue(mockAttackResults);
      (mockAsyncActionContext.sendRollRequest as MockedFunction<any>).mockResolvedValue({
        rollId: 'damage-roll-001',
        userId: 'player-001',
        results: [{ sides: 10, results: [8] }],
        arguments: {},
        recipients: 'public'
      });
      
      await executeSpellCast(multiTargetRequest, mockDraft, mockAsyncActionContext);
      
      // Should request attacks for both targets
      expect(mockAsyncActionContext.sendMultipleRollRequests).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            rollType: 'spell-attack',
            rollData: expect.objectContaining({
              message: 'Fire Bolt attack vs Goblin'
            })
          })
        ])
      );
    });
  });
});