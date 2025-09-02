/**
 * Unequip Item Action Handler - D&D 5e Equipment Management
 * 
 * Handles unequipping items from character equipment slots.
 * Simple removal with validation that item is actually equipped.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals, ICharacter } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { UnequipItemParameters } from '../../shared/types/equipment-actions.mjs';
import type { DndCharacterDocument } from '../../types/dnd/character.mjs';

/**
 * Validate item unequipping request
 */
const validateUnequipItem: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  const params = request.parameters as unknown as UnequipItemParameters;

  console.log('[UnequipItemHandler] Validating item unequip:', {
    characterId: params.characterId,
    slot: params.slot,
    itemName: params.itemName,
    requestId: request.id
  });

  // Validate required parameters
  if (!params.characterId || !params.slot) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Missing character ID or equipment slot'
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

  // Get current equipment
  const dndCharacter = character as DndCharacterDocument;
  const currentEquipment = dndCharacter.pluginData?.equipment || {};

  // Convert slot name to equipment property name
  const equipmentProp = params.slot === 'main-hand' ? 'mainHand' : 
                       params.slot === 'off-hand' ? 'offHand' : 
                       params.slot === 'two-hand' ? 'twoHanded' : params.slot;

  // Check if slot is currently equipped
  if (!currentEquipment[equipmentProp as keyof typeof currentEquipment]) {
    return {
      valid: false,
      error: {
        code: 'SLOT_EMPTY',
        message: `No item equipped in ${params.slot} slot`
      }
    };
  }

  return { valid: true };
};

/**
 * Execute item unequipping
 */
const executeUnequipItem: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: AsyncActionContext
): Promise<void> => {
  const params = request.parameters as unknown as UnequipItemParameters;

  console.log('[UnequipItemHandler] Executing item unequip:', {
    characterId: params.characterId,
    slot: params.slot,
    itemName: params.itemName,
    requestId: request.id
  });

  // Get character from draft (validation ensures it exists)
  const character = draft.documents[params.characterId] as DndCharacterDocument;
  
  // Initialize equipment object if it doesn't exist (shouldn't happen due to validation)
  if (!character.pluginData) {
    character.pluginData = {} as any;
  }
  if (!character.pluginData.equipment) {
    character.pluginData.equipment = {};
  }

  const equipment = character.pluginData.equipment;

  // Clear the equipment slot
  if (params.slot === 'armor') {
    equipment.armor = null;
  } else if (params.slot === 'shield') {
    equipment.shield = null;
  } else if (params.slot === 'main-hand') {
    equipment.mainHand = null;
  } else if (params.slot === 'off-hand') {
    equipment.offHand = null;
  } else if (params.slot === 'two-hand') {
    equipment.twoHanded = null;
  }

  console.log('[UnequipItemHandler] Item unequipped successfully:', {
    characterId: params.characterId,
    slot: params.slot,
    newEquipment: equipment,
    requestId: request.id
  });
};

/**
 * D&D 5e unequip-item action handler
 */
export const unequipItemActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100, // Plugin-level priority
  requiresManualApproval: false, // Equipment changes are instant
  gmOnly: false, // Players can unequip their own items
  validate: validateUnequipItem,
  execute: executeUnequipItem,
  approvalMessage: async (request) => {
    const params = request.parameters as unknown as UnequipItemParameters;
    return `wants to unequip item from ${params.slot} slot`;
  }
};