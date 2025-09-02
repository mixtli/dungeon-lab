/**
 * D&D 5e Ready Action Handler
 * 
 * Handles the "Ready" action in D&D 5e, which allows a character to prepare an action
 * with a specific trigger condition. The readied action is executed using the character's
 * reaction when the trigger occurs.
 */

import type { 
  GameActionRequest, 
  ServerGameStateWithVirtuals,
  ICharacter,
  IActor
} from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction
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
const validateDnDReady: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e ReadyHandler] Validating Ready action:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as {
    readiedActionType?: string; // Type of action being readied
    readiedActionParameters?: Record<string, unknown>; // Parameters for readied action
    trigger?: string; // Trigger condition
  };

  // Get actor from required actorId (must be available for ready actions)
  if (!request.actorId) {
    return {
      valid: false,
      error: { code: 'MISSING_ACTOR_ID', message: 'Actor ID is required for ready actions' }
    };
  }
  const actor = gameState.documents[request.actorId];
  if (!actor) {
    return {
      valid: false,
      error: { code: 'ACTOR_NOT_FOUND', message: 'Actor not found' }
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

  console.log('[DnD5e ReadyHandler] Found actor for ready action:', {
    actorName: actor.name,
    actorId: actor.id,
    readiedActionType: params.readiedActionType,
    trigger: params.trigger
  });

  // Check if actor already has a readied action
  const turnState = actor.state?.turnState;
  if (turnState?.readiedAction) {
    return {
      valid: false,
      error: {
        code: 'ACTION_ALREADY_READIED',
        message: `${actor.name} already has a readied action`
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

  // Add type guard to ensure actor can perform actions
  if (actor.documentType !== 'character' && actor.documentType !== 'actor') {
    return {
      valid: false,
      error: { code: 'INVALID_ACTOR_TYPE', message: `Document ${request.actorId} cannot perform actions (type: ${actor.documentType})` }
    };
  }

  // Cast to proper type after validation
  const actionActor = actor as ICharacter | IActor;

  // Use action economy utility to validate the ready action
  return await validateActionEconomy('action', actionActor, gameState, 'Ready');
}

/**
 * Execute D&D 5e Ready action - store readied action and trigger
 */
const executeDnDReady: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e ReadyHandler] Executing Ready action:', {
    playerId: request.playerId,
    requestId: request.id
  });

  const params = request.parameters as {
    readiedActionType: string;
    readiedActionParameters?: Record<string, unknown>;
    trigger: string;
  };

  // Get actor from required actorId (always available)
  if (!request.actorId) {
    throw new Error('Actor ID is required for ready actions');
  }
  const actor = draft.documents[request.actorId];
  if (!actor) {
    throw new Error('Actor not found');
  }

  // Add type guard to ensure actor can perform actions
  if (actor.documentType !== 'character' && actor.documentType !== 'actor') {
    throw new Error(`Document ${request.actorId} cannot perform actions (type: ${actor.documentType})`);
  }

  // Cast to proper type after validation
  const actionActor = actor as ICharacter | IActor;

  // Consume the action using the utility function
  consumeAction('action', actionActor, 'Ready');

  // Initialize turn state if needed
  if (!actor.state) actor.state = {};
  if (!actor.state.turnState) actor.state.turnState = {};

  // Store the readied action
  const readiedAction: ReadiedAction = {
    actionType: params.readiedActionType,
    actionParameters: params.readiedActionParameters,
    trigger: params.trigger,
    readiedAt: Date.now(),
    readiedBy: actor.id
  };

  actor.state.turnState.readiedAction = readiedAction;

  console.log('[DnD5e ReadyHandler] Ready action executed successfully:', {
    actorName: actor.name,
    actorId: actor.id,
    readiedActionType: readiedAction.actionType,
    trigger: readiedAction.trigger,
    note: 'Readied action will consume reaction when triggered'
  });
}

/**
 * Utility function to get a character's readied action
 */
export function getReadiedAction(character: ICharacter | IActor): ReadiedAction | null {
  const turnState = character?.state?.turnState;
  return turnState?.readiedAction || null;
}

/**
 * Utility function to check if a character has a readied action
 */
export function hasReadiedAction(character: ICharacter | IActor): boolean {
  return getReadiedAction(character) !== null;
}

/**
 * Utility function to trigger a readied action
 * This would be called by the trigger system when conditions are met
 * Returns the action parameters that should be executed
 */
export function triggerReadiedAction(character: ICharacter | IActor): {
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
export function cancelReadiedAction(character: ICharacter | IActor): void {
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
  validate: validateDnDReady,
  execute: executeDnDReady,
  approvalMessage: async (request) => {
    const params = request.parameters as { 
      readiedActionType?: string; 
      trigger?: string; 
    };
    const actionType = params.readiedActionType || 'an action';
    const trigger = params.trigger || 'a trigger condition';
    return `wants to Ready ${actionType} for when ${trigger}`;
  }
};

// Export individual functions for compatibility
export { validateDnDReady, executeDnDReady };