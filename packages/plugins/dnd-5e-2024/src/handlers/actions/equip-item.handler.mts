/**
 * Equip Item Action Handler - D&D 5e Equipment Management
 * 
 * Handles equipping items to characters with D&D 5e rule validation.
 * Enforces armor conflicts, shield/two-handed weapon conflicts, and hand availability.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals, IItem, ICharacter } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { EquipItemParameters } from '../../shared/types/equipment-actions.mjs';
import type { DndCharacterDocument, DndItemDocument } from '../../types/dnd/character.mjs';

/**
 * Validate item equipping request with D&D 5e rules
 */
const validateEquipItem: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  const params = request.parameters as unknown as EquipItemParameters;

  console.log('[EquipItemHandler] Validating item equip:', {
    characterId: params.characterId,
    itemId: params.itemId,
    slot: params.slot,
    itemName: params.itemName,
    requestId: request.id
  });

  // Validate required parameters
  if (!params.characterId || !params.itemId || !params.slot) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Missing character ID, item ID, or equipment slot'
      }
    };
  }

  // Check if character exists
  const character = gameState.documents[params.characterId] as ICharacter | undefined;
  if (!character) {
    return {
      valid: false,
      error: {
        code: 'CHARACTER_NOT_FOUND',
        message: 'Character not found in game state'
      }
    };
  }

  // Verify character is a D&D character
  if (character.documentType !== 'character' || character.pluginId !== 'dnd-5e-2024') {
    return {
      valid: false,
      error: {
        code: 'INVALID_CHARACTER_TYPE',
        message: 'Character is not a D&D 5e 2024 character'
      }
    };
  }

  // Check if item exists
  const item = gameState.documents[params.itemId] as IItem | undefined;
  if (!item) {
    return {
      valid: false,
      error: {
        code: 'ITEM_NOT_FOUND',
        message: 'Item not found in game state'
      }
    };
  }

  // Verify item is actually an item document
  if (item.documentType !== 'item') {
    return {
      valid: false,
      error: {
        code: 'INVALID_DOCUMENT_TYPE',
        message: 'Document is not an item'
      }
    };
  }

  // Check if character owns this item
  if (item.carrierId !== params.characterId) {
    return {
      valid: false,
      error: {
        code: 'ITEM_NOT_OWNED',
        message: 'Character does not own this item'
      }
    };
  }

  // Get current equipment
  const dndCharacter = character as DndCharacterDocument;
  const currentEquipment = dndCharacter.pluginData?.equipment || {};

  // Check if item is already equipped in this slot
  if (currentEquipment[params.slot === 'main-hand' ? 'mainHand' : 
                     params.slot === 'off-hand' ? 'offHand' : 
                     params.slot === 'two-hand' ? 'twoHanded' : params.slot] === params.itemId) {
    return {
      valid: false,
      error: {
        code: 'ALREADY_EQUIPPED',
        message: 'Item is already equipped in this slot'
      }
    };
  }

  // Get item data for type checking
  const dndItem = item as DndItemDocument;
  const itemData = dndItem.pluginData;

  // Validate item type matches slot using pluginData.itemType
  if (params.slot === 'armor') {
    if (itemData.itemType !== 'armor') {
      return {
        valid: false,
        error: {
          code: 'INVALID_ITEM_TYPE',
          message: 'Only armor items can be equipped in armor slot'
        }
      };
    }
  } else if (params.slot === 'shield') {
    if (itemData.itemType !== 'shield') {
      return {
        valid: false,
        error: {
          code: 'INVALID_ITEM_TYPE', 
          message: 'Only shield items can be equipped in shield slot'
        }
      };
    }
  } else if (['main-hand', 'off-hand', 'two-hand'].includes(params.slot)) {
    if (itemData.itemType !== 'weapon') {
      return {
        valid: false,
        error: {
          code: 'INVALID_ITEM_TYPE',
          message: 'Only weapon items can be equipped in weapon slots'
        }
      };
    }

    // Validate two-handed weapons can only go in two-hand slot
    if (params.slot !== 'two-hand' && itemData.properties?.includes('two-handed')) {
      return {
        valid: false,
        error: {
          code: 'TWO_HANDED_WEAPON',
          message: 'Two-handed weapons must be equipped in the two-handed slot'
        }
      };
    }

    // Validate non-two-handed weapons cannot go in two-hand slot
    if (params.slot === 'two-hand' && !itemData.properties?.includes('two-handed')) {
      return {
        valid: false,
        error: {
          code: 'NOT_TWO_HANDED',
          message: 'Only two-handed weapons can be equipped in the two-handed slot'
        }
      };
    }
  }

  // D&D 5e Equipment Rules Validation
  
  // Rule: Two-handed weapon conflicts with shield
  if (params.slot === 'two-hand' && currentEquipment.shield) {
    return {
      valid: false,
      error: {
        code: 'SHIELD_CONFLICT',
        message: 'Cannot equip two-handed weapon while shield is equipped'
      }
    };
  }

  // Rule: Shield conflicts with two-handed weapon
  if (params.slot === 'shield' && currentEquipment.twoHanded) {
    return {
      valid: false,
      error: {
        code: 'TWO_HANDED_CONFLICT',
        message: 'Cannot equip shield while two-handed weapon is equipped'
      }
    };
  }

  return { valid: true };
};

/**
 * Execute item equipping with automatic conflict resolution
 */
const executeEquipItem: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: AsyncActionContext
): Promise<void> => {
  const params = request.parameters as unknown as EquipItemParameters;

  console.log('[EquipItemHandler] Executing item equip:', {
    characterId: params.characterId,
    itemId: params.itemId,
    slot: params.slot,
    itemName: params.itemName,
    requestId: request.id
  });

  // Get character from draft (validation ensures it exists)
  const character = draft.documents[params.characterId] as DndCharacterDocument;
  
  // Initialize equipment object if it doesn't exist
  if (!character.pluginData) {
    character.pluginData = {} as any;
  }
  if (!character.pluginData.equipment) {
    character.pluginData.equipment = {};
  }

  const equipment = character.pluginData.equipment;

  // Handle automatic conflict resolution
  if (params.slot === 'armor') {
    // Only one armor piece allowed - previous armor is automatically unequipped
    equipment.armor = params.itemId;
  } else if (params.slot === 'shield') {
    // Auto-unequip two-handed weapon if equipped (validation prevents this case)
    if (equipment.twoHanded) {
      equipment.twoHanded = null;
    }
    equipment.shield = params.itemId;
  } else if (params.slot === 'main-hand') {
    // Auto-unequip two-handed weapon if equipped
    if (equipment.twoHanded) {
      equipment.twoHanded = null;
    }
    equipment.mainHand = params.itemId;
  } else if (params.slot === 'off-hand') {
    // Auto-unequip two-handed weapon if equipped
    if (equipment.twoHanded) {
      equipment.twoHanded = null;
    }
    equipment.offHand = params.itemId;
  } else if (params.slot === 'two-hand') {
    // Auto-unequip shield and one-handed weapons
    equipment.shield = null;
    equipment.mainHand = null;
    equipment.offHand = null;
    equipment.twoHanded = params.itemId;
  }

  console.log('[EquipItemHandler] Item equipped successfully:', {
    characterId: params.characterId,
    itemId: params.itemId,
    slot: params.slot,
    newEquipment: equipment,
    requestId: request.id
  });
};

/**
 * D&D 5e equip-item action handler
 */
export const equipItemActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100, // Plugin-level priority
  requiresManualApproval: false, // Equipment changes are instant
  gmOnly: false, // Players can equip their own items
  validate: validateEquipItem,
  execute: executeEquipItem,
  approvalMessage: async (request) => {
    const params = request.parameters as unknown as EquipItemParameters;
    return `wants to equip "${params.itemName || 'an item'}" in ${params.slot} slot`;
  }
};