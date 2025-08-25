/**
 * D&D 5e Action Economy Utilities
 * 
 * Provides shared logic for validating and consuming actions according to D&D 5e rules.
 * Works with the draft state mutation pattern used by action handlers.
 */

import type { 
  ServerGameStateWithVirtuals 
} from '@dungeon-lab/shared/types/index.mjs';
import type { ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { ConditionInstance } from '../types/dnd/condition.mjs';
import { getPluginContext } from '@dungeon-lab/shared-ui/utils/plugin-context.mjs';
import type { DndConditionDocument } from '../types/dnd/condition.mjs';

/**
 * D&D 5e action types for action economy tracking
 */
export type DnDActionType = 'action' | 'bonus-action' | 'reaction' | 'free';

/**
 * Structure of D&D 5e turn state
 */
interface DnDTurnState {
  movementUsed?: number;
  actionsUsed?: string[];
  bonusActionUsed?: boolean;
  reactionUsed?: boolean;
}

/**
 * Validate if a character can perform a specific action type
 * 
 * @param actionType - Type of action being performed
 * @param character - Character document attempting the action  
 * @param gameState - Current game state for additional context
 * @param actionName - Specific action name for tracking (e.g., 'attack', 'dash')
 * @returns Validation result with error details if invalid
 */
export async function validateActionEconomy(
  actionType: DnDActionType,
  character: any,
  gameState: ServerGameStateWithVirtuals,
  actionName: string = 'unknown'
): Promise<ActionValidationResult> {
  console.log('[DnD5e ActionEconomy] Validating action economy:', {
    characterName: character?.name,
    actionType,
    actionName
  });

  if (!character) {
    return { 
      valid: false, 
      error: { code: 'NO_CHARACTER', message: 'Character not found for action' } 
    };
  }

  // Check turn-based rules first - is it this character's turn?
  const turnManager = gameState.turnManager;
  if (turnManager) {
    const currentParticipant = turnManager.participants[turnManager.currentTurn];
    console.log('[DnD5e ActionEconomy] Turn validation:', {
      currentTurn: turnManager.currentTurn,
      currentParticipant: currentParticipant?.name,
      currentParticipantActorId: currentParticipant?.id,
      characterId: character.id
    });
    
    if (!currentParticipant) {
      return { 
        valid: false, 
        error: { 
          code: 'NO_CURRENT_TURN', 
          message: "No active turn in progress" 
        } 
      };
    }
    
    // Check if this character is the one whose turn it is
    const isCharactersTurn = currentParticipant.actorId === character.id;
    
    console.log('[DnD5e ActionEconomy] Character turn check:', {
      characterName: character.name,
      characterId: character.id,
      currentParticipantActorId: currentParticipant.actorId,
      isCharactersTurn
    });
    
    if (!isCharactersTurn) {
      return { 
        valid: false, 
        error: { 
          code: 'NOT_YOUR_TURN', 
          message: "It's not your turn" 
        } 
      };
    }
  }

  // Get current turn state, with defaults if not present
  const turnState = character.state?.turnState as DnDTurnState || {};
  const actionsUsed = turnState.actionsUsed || [];
  const bonusActionUsed = turnState.bonusActionUsed || false;
  const reactionUsed = turnState.reactionUsed || false;

  console.log('[DnD5e ActionEconomy] Current action state:', {
    actionsUsed,
    bonusActionUsed,
    reactionUsed
  });

  // Check action economy based on action type
  switch (actionType) {
    case 'action':
      // In D&D 5e, you get one main action per turn
      if (actionsUsed.length > 0) {
        return {
          valid: false,
          error: {
            code: 'ACTION_ALREADY_USED',
            message: `Already used action this turn: ${actionsUsed.join(', ')}`
          }
        };
      }
      break;

    case 'bonus-action':
      if (bonusActionUsed) {
        return {
          valid: false,
          error: {
            code: 'BONUS_ACTION_ALREADY_USED',
            message: 'Already used bonus action this turn'
          }
        };
      }
      break;

    case 'reaction':
      if (reactionUsed) {
        return {
          valid: false,
          error: {
            code: 'REACTION_ALREADY_USED',
            message: 'Already used reaction this round'
          }
        };
      }
      break;

    case 'free':
      // Free actions have no economy restrictions
      break;

    default:
      return {
        valid: false,
        error: {
          code: 'UNKNOWN_ACTION_TYPE',
          message: `Unknown action type: ${actionType}`
        }
      };
  }

  // Check for conditions that prevent actions (document-based)
  const conditions = (character.state?.conditions as ConditionInstance[]) || [];
  const actionBlockingConditionSlugs = ['paralyzed', 'petrified', 'stunned', 'unconscious', 'incapacitated'];
  const pluginContext = getPluginContext();
  if (!pluginContext) {
    return { valid: false, error: { code: 'NO_CONTEXT', message: 'Plugin context not available' } };
  }
  
  // Check each condition instance for action-blocking effects
  for (const conditionInstance of conditions) {
    try {
      const conditionDoc = await pluginContext.getDocument(conditionInstance.conditionId) as DndConditionDocument;
      if (conditionDoc && actionBlockingConditionSlugs.includes(conditionDoc.slug)) {
        return {
          valid: false,
          error: {
            code: 'ACTION_RESTRICTED_BY_CONDITION',
            message: `Cannot perform actions due to condition: ${conditionDoc.name}`
          }
        };
      }
    } catch (error) {
      console.warn('[DnD5e ActionEconomy] Failed to fetch condition document:', conditionInstance.conditionId, error);
      continue;
    }
  }

  console.log('[DnD5e ActionEconomy] Action economy validation passed');
  return { valid: true };
}

/**
 * Consume an action by updating the character's turn state
 * This function directly mutates the draft state (Immer pattern)
 * 
 * @param actionType - Type of action being consumed
 * @param character - Character document in draft state
 * @param actionName - Specific action name for tracking
 */
export function consumeAction(
  actionType: DnDActionType,
  character: any,
  actionName: string = 'unknown'
): void {
  console.log('[DnD5e ActionEconomy] Consuming action:', {
    characterName: character?.name,
    actionType,
    actionName
  });

  // Initialize state if needed - Immer will track these mutations
  if (!character.state) character.state = {};
  if (!character.state.turnState) character.state.turnState = {};

  const turnState = character.state.turnState as DnDTurnState;

  // Consume action based on type
  switch (actionType) {
    case 'action':
      if (!turnState.actionsUsed) turnState.actionsUsed = [];
      turnState.actionsUsed.push(actionName);
      break;

    case 'bonus-action':
      turnState.bonusActionUsed = true;
      break;

    case 'reaction':
      turnState.reactionUsed = true;
      break;

    case 'free':
      // Free actions don't consume economy
      break;
  }

  console.log('[DnD5e ActionEconomy] Action consumed successfully:', {
    characterName: character.name,
    actionType,
    actionName,
    newState: {
      actionsUsed: turnState.actionsUsed,
      bonusActionUsed: turnState.bonusActionUsed,
      reactionUsed: turnState.reactionUsed
    }
  });
}

/**
 * Get available actions for a character
 * 
 * @param character - Character document to check
 * @returns Object describing available action economy
 */
export async function getAvailableActions(character: any): Promise<{
  canUseAction: boolean;
  canUseBonusAction: boolean;
  canUseReaction: boolean;
  actionsUsed: string[];
}> {
  const turnState = character?.state?.turnState as DnDTurnState || {};
  const actionsUsed = turnState.actionsUsed || [];
  const bonusActionUsed = turnState.bonusActionUsed || false;
  const reactionUsed = turnState.reactionUsed || false;

  // Check for action-blocking conditions (document-based)
  const conditions = (character?.state?.conditions as ConditionInstance[]) || [];
  const actionBlockingConditionSlugs = ['paralyzed', 'petrified', 'stunned', 'unconscious', 'incapacitated'];
  const pluginContext = getPluginContext();
  
  let hasActionBlockingCondition = false;
  if (pluginContext) {
    for (const conditionInstance of conditions) {
      try {
        const conditionDoc = await pluginContext.getDocument(conditionInstance.conditionId) as DndConditionDocument;
        if (conditionDoc && actionBlockingConditionSlugs.includes(conditionDoc.slug)) {
          hasActionBlockingCondition = true;
          break;
        }
      } catch (error) {
        console.warn('[DnD5e ActionEconomy] Failed to fetch condition document:', conditionInstance.conditionId, error);
        continue;
      }
    }
  }

  return {
    canUseAction: !hasActionBlockingCondition && actionsUsed.length === 0,
    canUseBonusAction: !hasActionBlockingCondition && !bonusActionUsed,
    canUseReaction: !hasActionBlockingCondition && !reactionUsed,
    actionsUsed
  };
}

