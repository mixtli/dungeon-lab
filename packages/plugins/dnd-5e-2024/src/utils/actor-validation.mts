/**
 * Actor Validation Utilities for D&D 5e Action Handlers
 * 
 * Common validation functions for D&D action handlers that require actor information.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals, BaseDocument, IToken } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Validates that actorId is provided and the actor exists in game state
 * Returns validation result or the actor document if valid
 */
export function validateActorExists(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult | { valid: true; actor: BaseDocument } {
  // Validate actorId is provided
  if (!request.actorId) {
    return {
      valid: false,
      error: { 
        code: 'ACTOR_ID_REQUIRED', 
        message: 'Actor ID is required for this action' 
      }
    };
  }

  // Get actor from game state
  const actor = gameState.documents[request.actorId];
  if (!actor) {
    return {
      valid: false,
      error: { 
        code: 'ACTOR_NOT_FOUND', 
        message: 'Actor not found' 
      }
    };
  }

  return { valid: true, actor };
}

/**
 * Gets and validates the actor during execution (with error throwing for safety)
 * Use this in execution handlers where validation should already have passed
 */
export function getValidatedActor(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  actionName: string = 'action'
): BaseDocument {
  // Validate actorId is provided (should already be validated, but safety check)
  if (!request.actorId) {
    throw new Error(`Actor ID is required for ${actionName}`);
  }

  // Get actor from draft state
  const actor = draft.documents[request.actorId];
  if (!actor) {
    throw new Error('Actor not found');
  }

  return actor;
}

/**
 * Validates actor token if provided, ensuring it matches the actor
 * Returns validation result or the token if valid (can be null if no token provided)
 */
export function validateActorToken(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult | { valid: true; token: IToken | null } {
  // Token is optional, so null is valid
  if (!request.actorTokenId) {
    return { valid: true, token: null };
  }

  // If token ID is provided, validate it exists
  const token = gameState.currentEncounter?.tokens?.[request.actorTokenId];
  if (!token) {
    return {
      valid: false,
      error: { 
        code: 'TOKEN_NOT_FOUND', 
        message: 'Actor token not found' 
      }
    };
  }

  // If actorId is provided, validate token matches the actor
  if (request.actorId && token.documentId !== request.actorId) {
    return {
      valid: false,
      error: { 
        code: 'TOKEN_MISMATCH', 
        message: 'Token does not represent the specified actor' 
      }
    };
  }

  return { valid: true, token };
}