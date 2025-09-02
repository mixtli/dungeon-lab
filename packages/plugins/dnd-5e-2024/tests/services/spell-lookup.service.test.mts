import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import type { PluginContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { ICharacter, IActor, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { DndSpellDocument } from '../../src/types/dnd/spell.mjs';
import type { DndCharacterData } from '../../src/types/dnd/character.mjs';
import type { MonsterSpellcasting } from '../../src/types/dnd/common.mjs';
import {
  lookupSpell,
  isCantrip,
  requiresConcentration,
  canCastAsRitual,
  requiresAttackRoll,
  requiresSavingThrow,
  getSpellDamage,
  getSpellSavingThrow,
  getCasterForToken,
  getTargetForToken,
  getSpellcastingAbility,
  calculateSpellAttackBonus,
  calculateSpellSaveDC,
  hasSpellSlotsAvailable,
  consumeSpellSlot
} from '../../src/services/spell-lookup.service.mjs';

// Mock Vue's unref function
vi.mock('vue', () => ({
  unref: vi.fn((val) => val)
}));

// Mock spell document for testing
const mockSpellDocument: DndSpellDocument = {
  id: 'spell-fireball-001',
  name: 'Fireball',
  documentType: 'vtt-document',
  pluginDocumentType: 'spell',
  pluginId: 'dnd-5e-2024',
  createdBy: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
  pluginData: {
    name: 'Fireball',
    description: 'A ball of fire',
    level: 3,
    school: 'evocation',
    classAvailability: {
      sorcerer: { level: 3, source: 'class' },
      wizard: { level: 3, source: 'class' }
    },
    castingTime: 'Action',
    range: '150 feet',
    components: {
      verbal: true,
      somatic: true,
      material: { required: true, description: 'a tiny ball of bat guano and sulfur' }
    },
    duration: 'Instantaneous',
    ritual: false,
    concentration: false,
    damage: {
      dice: '8d6',
      type: 'fire'
    },
    savingThrow: {
      ability: 'dexterity',
      effectOnSave: 'half',
      description: 'Each creature must make a Dexterity saving throw'
    },
    areaOfEffect: {
      type: 'sphere',
      size: 20,
      description: '20-foot-radius sphere'
    }
  }
};

// Mock cantrip document
const mockCantripDocument: DndSpellDocument = {
  ...mockSpellDocument,
  id: 'spell-eldritch-blast-001',
  name: 'Eldritch Blast',
  pluginData: {
    ...mockSpellDocument.pluginData,
    name: 'Eldritch Blast',
    level: 0, // Cantrip
    school: 'evocation',
    damage: {
      dice: '1d10',
      type: 'force'
    },
    attackRoll: {
      type: 'ranged',
      description: 'Ranged spell attack'
    },
    savingThrow: undefined
  }
};

// Mock character with spellcasting
const mockCharacterCaster: ICharacter = {
  id: 'character-wizard-001',
  name: 'Test Wizard',
  documentType: 'character',
  createdBy: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  pluginData: {
    name: 'Test Wizard',
    species: 'human-ref',
    background: 'sage-ref',
    classes: [{
      class: 'wizard-ref',
      level: 5,
      hitPointsRolled: [6, 4, 5, 3, 4]
    }],
    progression: {
      level: 5,
      experiencePoints: 6500,
      proficiencyBonus: 3,
      classLevels: { wizard: 5 },
      hitDice: { wizard: { total: 5, used: 0 } }
    },
    attributes: {
      hitPoints: { current: 28, maximum: 28, temporary: 0 },
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
          spellcastingLevel: 5,
          spellSaveDC: 14, // 8 + 3 (prof) + 3 (Int mod)
          spellAttackBonus: 6, // 3 (prof) + 3 (Int mod)
          preparation: 'prepared'
        }
      },
      spellSlots: {
        '1': { total: 4, used: 1 },
        '2': { total: 3, used: 0 },
        '3': { total: 2, used: 0 }
      },
      spells: [
        { name: 'Fireball', spell: 'spell-fireball-001', level: 3, class: 'wizard', prepared: true, alwaysPrepared: false }
      ],
      cantrips: [
        { name: 'Eldritch Blast', spell: 'spell-eldritch-blast-001', class: 'wizard' }
      ]
    }
  } as DndCharacterData
};

// Mock actor with spellcasting
const mockActorCaster: IActor = {
  id: 'actor-archmage-001',
  name: 'Archmage',
  documentType: 'actor',
  createdBy: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  pluginData: {
    name: 'Archmage',
    size: 'medium',
    type: 'humanoid',
    alignment: 'any',
    armorClass: { value: 17, source: 'Natural Armor' },
    hitPoints: { average: 165, formula: '18d8 + 72' },
    speed: { walk: 30 },
    abilities: {
      strength: 10,
      dexterity: 16,
      constitution: 18,
      intelligence: 20,
      wisdom: 15,
      charisma: 16
    },
    proficiencyBonus: 6,
    spellcasting: {
      ability: 'intelligence',
      spellSaveDC: 19, // 8 + 6 (prof) + 5 (Int mod)
      spellAttackBonus: 11, // 6 (prof) + 5 (Int mod)
      spells: {
        atWill: [
          { spell: 'spell-eldritch-blast-001', name: 'Eldritch Blast' }
        ],
        daily: [
          { spell: 'spell-fireball-001', name: 'Fireball', uses: 3, level: 3 }
        ]
      }
    } as MonsterSpellcasting,
    actions: [],
    traits: [],
    legendaryActions: []
  }
};

// Mock game state
const mockGameState: ServerGameStateWithVirtuals = {
  documents: {
    'character-wizard-001': mockCharacterCaster,
    'actor-archmage-001': mockActorCaster
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
        id: 'token-archmage-001',
        documentId: 'actor-archmage-001',
        name: 'Archmage',
        bounds: {
          topLeft: { x: 1, y: 1 },
          bottomRight: { x: 1, y: 1 }
        },
        position: { x: 1, y: 1 },
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

describe('Spell Lookup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('lookupSpell', () => {
    it('should return spell document when found', async () => {
      (mockPluginContext.getDocument as MockedFunction<any>).mockResolvedValue(mockSpellDocument);

      const result = await lookupSpell('spell-fireball-001', mockPluginContext);

      expect(result).toEqual(mockSpellDocument);
      expect(mockPluginContext.getDocument).toHaveBeenCalledWith('spell-fireball-001');
    });

    it('should return null when spell not found', async () => {
      (mockPluginContext.getDocument as MockedFunction<any>).mockResolvedValue(null);

      const result = await lookupSpell('invalid-spell-id', mockPluginContext);

      expect(result).toBeNull();
    });

    it('should return null when document is not a spell', async () => {
      const nonSpellDoc = { ...mockSpellDocument, pluginDocumentType: 'character' };
      (mockPluginContext.getDocument as MockedFunction<any>).mockResolvedValue(nonSpellDoc);

      const result = await lookupSpell('not-a-spell-id', mockPluginContext);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (mockPluginContext.getDocument as MockedFunction<any>).mockRejectedValue(new Error('Network error'));

      const result = await lookupSpell('spell-fireball-001', mockPluginContext);

      expect(result).toBeNull();
    });
  });

  describe('spell property helpers', () => {
    it('should correctly identify cantrips', () => {
      expect(isCantrip(mockCantripDocument)).toBe(true);
      expect(isCantrip(mockSpellDocument)).toBe(false);
      expect(isCantrip(mockCantripDocument.pluginData)).toBe(true);
    });

    it('should correctly identify concentration spells', () => {
      const concentrationSpell = { 
        ...mockSpellDocument, 
        pluginData: { ...mockSpellDocument.pluginData, concentration: true } 
      };
      
      expect(requiresConcentration(concentrationSpell)).toBe(true);
      expect(requiresConcentration(mockSpellDocument)).toBe(false);
    });

    it('should correctly identify ritual spells', () => {
      const ritualSpell = { 
        ...mockSpellDocument, 
        pluginData: { ...mockSpellDocument.pluginData, ritual: true } 
      };
      
      expect(canCastAsRitual(ritualSpell)).toBe(true);
      expect(canCastAsRitual(mockSpellDocument)).toBe(false);
    });

    it('should correctly identify attack roll spells', () => {
      expect(requiresAttackRoll(mockCantripDocument)).toBe(true);
      expect(requiresAttackRoll(mockSpellDocument)).toBe(false);
    });

    it('should correctly identify saving throw spells', () => {
      expect(requiresSavingThrow(mockSpellDocument)).toBe(true);
      expect(requiresSavingThrow(mockCantripDocument)).toBe(false);
    });

    it('should return spell damage information', () => {
      const damage = getSpellDamage(mockSpellDocument);
      expect(damage).toEqual({
        dice: '8d6',
        type: 'fire'
      });

      const noDamage = getSpellDamage({
        ...mockSpellDocument,
        pluginData: { ...mockSpellDocument.pluginData, damage: undefined }
      });
      expect(noDamage).toBeNull();
    });

    it('should return spell saving throw information', () => {
      const savingThrow = getSpellSavingThrow(mockSpellDocument);
      expect(savingThrow).toEqual({
        ability: 'dexterity',
        effectOnSave: 'half'
      });

      const noSave = getSpellSavingThrow(mockCantripDocument);
      expect(noSave).toBeNull();
    });
  });

  describe('getCasterForToken', () => {
    it('should return character caster for valid token', () => {
      const caster = getCasterForToken('token-wizard-001', mockGameState);
      expect(caster).toEqual(mockCharacterCaster);
    });

    it('should return actor caster for valid token', () => {
      const caster = getCasterForToken('token-archmage-001', mockGameState);
      expect(caster).toEqual(mockActorCaster);
    });

    it('should return null for invalid token', () => {
      const caster = getCasterForToken('invalid-token', mockGameState);
      expect(caster).toBeNull();
    });

    it('should return null for token with no document', () => {
      const gameStateWithBrokenToken = {
        ...mockGameState,
        currentEncounter: {
          ...mockGameState.currentEncounter!,
          tokens: [
            {
              ...mockGameState.currentEncounter!.tokens![0],
              documentId: undefined as any
            }
          ]
        }
      };

      const caster = getCasterForToken('token-wizard-001', gameStateWithBrokenToken);
      expect(caster).toBeNull();
    });

    it('should return null for non-spellcaster document types', () => {
      const gameStateWithNonCaster = {
        ...mockGameState,
        documents: {
          ...mockGameState.documents,
          'item-sword-001': {
            id: 'item-sword-001',
            documentType: 'item'
          } as any
        },
        currentEncounter: {
          ...mockGameState.currentEncounter!,
          tokens: [
            {
              ...mockGameState.currentEncounter!.tokens![0],
              documentId: 'item-sword-001'
            }
          ]
        }
      };

      const caster = getCasterForToken('token-wizard-001', gameStateWithNonCaster);
      expect(caster).toBeNull();
    });
  });

  describe('getTargetForToken', () => {
    it('should return character target for valid token', () => {
      const target = getTargetForToken('token-wizard-001', mockGameState);
      expect(target).toEqual(mockCharacterCaster);
    });

    it('should return actor target for valid token', () => {
      const target = getTargetForToken('token-archmage-001', mockGameState);
      expect(target).toEqual(mockActorCaster);
    });

    it('should return null for invalid token', () => {
      const target = getTargetForToken('invalid-token', mockGameState);
      expect(target).toBeNull();
    });
  });

  describe('getSpellcastingAbility', () => {
    it('should return correct ability for character', () => {
      const ability = getSpellcastingAbility(mockCharacterCaster);
      expect(ability).toBe('intelligence');
    });

    it('should return correct ability for specific class', () => {
      const ability = getSpellcastingAbility(mockCharacterCaster, 'wizard');
      expect(ability).toBe('intelligence');
    });

    it('should return correct ability for actor', () => {
      const ability = getSpellcastingAbility(mockActorCaster);
      expect(ability).toBe('intelligence');
    });

    it('should return null for non-spellcaster', () => {
      const nonCaster = { 
        ...mockCharacterCaster, 
        pluginData: { ...mockCharacterCaster.pluginData, spellcasting: undefined } 
      };
      const ability = getSpellcastingAbility(nonCaster);
      expect(ability).toBeNull();
    });
  });

  describe('calculateSpellAttackBonus', () => {
    it('should return correct attack bonus for character', () => {
      const bonus = calculateSpellAttackBonus(mockCharacterCaster);
      expect(bonus).toBe(6);
    });

    it('should return correct attack bonus for actor', () => {
      const bonus = calculateSpellAttackBonus(mockActorCaster);
      expect(bonus).toBe(11);
    });

    it('should return 0 for non-spellcaster', () => {
      const nonCaster = { 
        ...mockCharacterCaster, 
        pluginData: { ...mockCharacterCaster.pluginData, spellcasting: undefined } 
      };
      const bonus = calculateSpellAttackBonus(nonCaster);
      expect(bonus).toBe(0);
    });
  });

  describe('calculateSpellSaveDC', () => {
    it('should return correct save DC for character', () => {
      const dc = calculateSpellSaveDC(mockCharacterCaster);
      expect(dc).toBe(14);
    });

    it('should return correct save DC for actor', () => {
      const dc = calculateSpellSaveDC(mockActorCaster);
      expect(dc).toBe(19);
    });

    it('should return default DC for non-spellcaster', () => {
      const nonCaster = { 
        ...mockCharacterCaster, 
        pluginData: { ...mockCharacterCaster.pluginData, spellcasting: undefined } 
      };
      const dc = calculateSpellSaveDC(nonCaster);
      expect(dc).toBe(8);
    });
  });

  describe('hasSpellSlotsAvailable', () => {
    it('should return true for cantrips', () => {
      const hasSlots = hasSpellSlotsAvailable(mockCharacterCaster, 0);
      expect(hasSlots).toBe(true);
    });

    it('should return true when character has available slots', () => {
      const hasSlots = hasSpellSlotsAvailable(mockCharacterCaster, 2);
      expect(hasSlots).toBe(true);
    });

    it('should return false when character has no available slots', () => {
      // Level 1 slots: total: 4, used: 1 → available = 3
      // Level 4 slots don't exist in mock data
      const hasSlots = hasSpellSlotsAvailable(mockCharacterCaster, 4);
      expect(hasSlots).toBe(false);
    });

    it('should return true for actors (simplified)', () => {
      const hasSlots = hasSpellSlotsAvailable(mockActorCaster, 3);
      expect(hasSlots).toBe(true);
    });

    it('should return false for non-spellcaster', () => {
      const nonCaster = { 
        ...mockCharacterCaster, 
        pluginData: { ...mockCharacterCaster.pluginData, spellcasting: undefined } 
      };
      const hasSlots = hasSpellSlotsAvailable(nonCaster, 1);
      expect(hasSlots).toBe(false);
    });
  });

  describe('consumeSpellSlot', () => {
    it('should return true for cantrips without consuming slots', () => {
      const caster = { ...mockCharacterCaster };
      const consumed = consumeSpellSlot(caster, 0);
      expect(consumed).toBe(true);
    });

    it('should consume spell slot when available', () => {
      // Create a mutable copy for this test
      const caster = structuredClone(mockCharacterCaster);
      const originalUsed = caster.pluginData.spellcasting!.spellSlots['2'].used;
      
      const consumed = consumeSpellSlot(caster, 2);
      
      expect(consumed).toBe(true);
      expect(caster.pluginData.spellcasting!.spellSlots['2'].used).toBe(originalUsed + 1);
    });

    it('should return false when no slots available', () => {
      const casterWithNoSlots = structuredClone(mockCharacterCaster);
      casterWithNoSlots.pluginData.spellcasting!.spellSlots['1'].used = 4; // Use all slots
      
      const consumed = consumeSpellSlot(casterWithNoSlots, 1);
      expect(consumed).toBe(false);
    });

    it('should return true for actors (simplified)', () => {
      const consumed = consumeSpellSlot(mockActorCaster, 3);
      expect(consumed).toBe(true);
    });

    it('should return false for non-spellcaster', () => {
      const nonCaster = { 
        ...mockCharacterCaster, 
        pluginData: { ...mockCharacterCaster.pluginData, spellcasting: undefined } 
      };
      const consumed = consumeSpellSlot(nonCaster, 1);
      expect(consumed).toBe(false);
    });
  });
});