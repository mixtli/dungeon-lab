/**
 * D&D 5e Ready Action Handler
 * 
 * Handles the "Ready" action in D&D 5e, which allows a character to prepare an action
 * with a specific trigger condition. The readied action is executed using the character's
 * reaction when the trigger occurs.
 */

import type { 
  GameActionRequest, 
  ServerGameStateWithVirtuals 
} from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction, 
  findPlayerCharacter, 
  findPlayerCharacterInDraft
} from '../../utils/action-economy.mjs';

/**
 * Interface for readied action data
 */
interface ReadiedAction {
  actionType: string; // e.g., 'attack', 'cast-spell', 'move'
  actionParameters?: Record<string, unknown>; // Parameters for the readied action
  trigger: string; // Trigger condition description
  readiedAt: number; // Timestamp when action was readied
  readiedBy: string; // Character ID who readied the action
}

/**
 * Validate D&D 5e Ready action
 */
export async function validateDnDReady(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> {
  console.log('[DnD5e ReadyHandler] Validating Ready action:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as {
    readiedActionType?: string; // Type of action being readied
    readiedActionParameters?: Record<string, unknown>; // Parameters for readied action
    trigger?: string; // Trigger condition
  };

  // Find the character for this player
  const character = findPlayerCharacter(request.playerId, gameState);
  
  if (!character) {
    return { 
      valid: false, 
      error: { code: 'NO_CHARACTER', message: 'Character not found for ready action' } 
    };
  }

  // Validate required parameters
  if (!params.readiedActionType) {
    return {
      valid: false,
      error: {
        code: 'MISSING_READIED_ACTION',
        message: 'Must specify what action to ready'
      }
    };
  }

  if (!params.trigger) {
    return {
      valid: false,
      error: {
        code: 'MISSING_TRIGGER',
        message: 'Must specify trigger condition for readied action'
      }
    };
  }

  console.log('[DnD5e ReadyHandler] Found character for ready action:', {
    characterName: character.name,
    characterId: character.id,
    readiedActionType: params.readiedActionType,
    trigger: params.trigger
  });

  // Check if character already has a readied action
  const turnState = character.state?.turnState;
  if (turnState?.readiedAction) {
    return {
      valid: false,
      error: {
        code: 'ACTION_ALREADY_READIED',
        message: `${character.name} already has a readied action`
      }
    };
  }

  // Validate that the readied action type is valid
  // In a full implementation, this would check against available action types
  const validReadiedActions = [
    'attack', 'cast-spell', 'dash', 'dodge', 'help', 'hide', 'search', 
    'use-object', 'disengage', 'move'
  ];
  
  if (!validReadiedActions.includes(params.readiedActionType)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_READIED_ACTION',
        message: `Cannot ready action type: ${params.readiedActionType}`
      }
    };
  }

  // Use action economy utility to validate the ready action
  return await validateActionEconomy('action', character, gameState, 'Ready');
}

/**
 * Execute D&D 5e Ready action - store readied action and trigger
 */
export function executeDnDReady(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e ReadyHandler] Executing Ready action:', {
    playerId: request.playerId,
    requestId: request.id
  });

  const params = request.parameters as {
    readiedActionType: string;
    readiedActionParameters?: Record<string, unknown>;
    trigger: string;
  };

  // Find the character in the draft state
  const character = findPlayerCharacterInDraft(request.playerId, draft);
  
  if (!character) {
    console.warn('[DnD5e ReadyHandler] Character not found during ready execution');
    return;
  }

  // Consume the action using the utility function
  consumeAction('action', character, 'Ready');

  // Initialize turn state if needed
  if (!character.state) character.state = {};
  if (!character.state.turnState) character.state.turnState = {};

  // Store the readied action
  const readiedAction: ReadiedAction = {
    actionType: params.readiedActionType,
    actionParameters: params.readiedActionParameters,
    trigger: params.trigger,
    readiedAt: Date.now(),
    readiedBy: character.id
  };

  character.state.turnState.readiedAction = readiedAction;

  console.log('[DnD5e ReadyHandler] Ready action executed successfully:', {
    characterName: character.name,
    characterId: character.id,
    readiedActionType: readiedAction.actionType,
    trigger: readiedAction.trigger,
    note: 'Readied action will consume reaction when triggered'
  });
}

/**
 * Utility function to get a character's readied action
 */
export function getReadiedAction(character: any): ReadiedAction | null {
  const turnState = character?.state?.turnState;
  return turnState?.readiedAction || null;
}

/**
 * Utility function to check if a character has a readied action
 */
export function hasReadiedAction(character: any): boolean {
  return getReadiedAction(character) !== null;
}

/**
 * Utility function to trigger a readied action
 * This would be called by the trigger system when conditions are met
 * Returns the action parameters that should be executed
 */
export function triggerReadiedAction(character: any): {
  actionType: string;
  actionParameters?: Record<string, unknown>;
} | null {
  const readiedAction = getReadiedAction(character);
  if (!readiedAction) {
    return null;
  }

  // Check if character can use their reaction
  const turnState = character?.state?.turnState;
  if (turnState?.reactionUsed) {
    console.warn('[DnD5e ReadyHandler] Cannot trigger readied action - reaction already used');
    return null;
  }

  // Consume the reaction
  if (turnState) {
    turnState.reactionUsed = true;
    // Clear the readied action
    delete turnState.readiedAction;
  }

  console.log('[DnD5e ReadyHandler] Triggered readied action:', {
    actionType: readiedAction.actionType,
    trigger: readiedAction.trigger
  });

  return {
    actionType: readiedAction.actionType,
    actionParameters: readiedAction.actionParameters
  };
}

/**
 * Utility function to cancel a readied action
 * This can be called voluntarily or when conditions change
 */
export function cancelReadiedAction(character: any): void {
  const turnState = character?.state?.turnState;
  if (turnState?.readiedAction) {
    delete turnState.readiedAction;
    console.log('[DnD5e ReadyHandler] Readied action cancelled');
  }
}

/**
 * D&D 5e Ready Action Handler
 * 
 * Priority 100 - standard action priority
 */
export const dndReadyHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 100,
  validate: validateDnDReady as (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => ActionValidationResult,
  execute: executeDnDReady,
  approvalMessage: (request) => {
    const params = request.parameters as { 
      readiedActionType?: string; 
      trigger?: string; 
    };
    const actionType = params.readiedActionType || 'an action';
    const trigger = params.trigger || 'a trigger condition';
    return `wants to Ready ${actionType} for when ${trigger}`;
  }
};