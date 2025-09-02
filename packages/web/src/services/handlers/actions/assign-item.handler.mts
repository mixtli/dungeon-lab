/**
 * Assign Item Action Handler - Item Ownership Management
 * 
 * Handles assigning items to characters by updating the carrierId field.
 * This action requires GM approval as it affects resource distribution.
 */

import type { GameActionRequest, AssignItemParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals, IItem } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';

/**
 * Validate item assignment request
 */
const validateAssignItem: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  const params = request.parameters as AssignItemParameters;

  console.log('[AssignItemHandler] Validating item assignment:', {
    itemId: params.itemId,
    itemName: params.itemName,
    targetCharacterId: params.targetCharacterId,
    targetCharacterName: params.targetCharacterName,
    requestId: request.id
  });

  // Validate required parameters
  if (!params.itemId || !params.targetCharacterId) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Missing item ID or target character ID'
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

  // Check if target character exists
  const targetCharacter = gameState.documents[params.targetCharacterId];
  if (!targetCharacter) {
    return {
      valid: false,
      error: {
        code: 'CHARACTER_NOT_FOUND',
        message: 'Target character not found in game state'
      }
    };
  }

  // Verify target is a character document
  if (targetCharacter.documentType !== 'character') {
    return {
      valid: false,
      error: {
        code: 'INVALID_TARGET_TYPE',
        message: 'Target document is not a character'
      }
    };
  }

  // Check if item is already assigned to this character
  if (item.carrierId === params.targetCharacterId) {
    return {
      valid: false,
      error: {
        code: 'ALREADY_ASSIGNED',
        message: 'Item is already carried by this character'
      }
    };
  }

  return { valid: true };
}

/**
 * Execute item assignment using direct state mutation
 */
const executeAssignItem: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: AsyncActionContext
): Promise<void> => {
  const params = request.parameters as AssignItemParameters;

  console.log('[AssignItemHandler] Executing item assignment:', {
    itemId: params.itemId,
    itemName: params.itemName,
    targetCharacterId: params.targetCharacterId,
    targetCharacterName: params.targetCharacterName,
    requestId: request.id
  });

  // Get the item from the draft
  // Validation ensures item exists
  const item = draft.documents[params.itemId] as IItem;

  // Update the carrierId field
  item.carrierId = params.targetCharacterId;

  console.log('[AssignItemHandler] Item assignment executed successfully:', {
    itemId: params.itemId,
    itemName: item.name,
    newCarrierId: params.targetCharacterId,
    previousCarrierId: item.carrierId,
    requestId: request.id
  });
}

/**
 * Core assign-item action handler
 */
export const assignItemActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 0, // Core handler runs first
  requiresManualApproval: true, // GM approval required for item distribution
  gmOnly: false, // Players can request item assignments
  validate: validateAssignItem,
  execute: executeAssignItem,
  approvalMessage: async (request) => {
    const params = request.parameters as AssignItemParameters;
    return `wants to give "${params.itemName || 'an item'}" to ${params.targetCharacterName || 'a character'}`;
  }
};