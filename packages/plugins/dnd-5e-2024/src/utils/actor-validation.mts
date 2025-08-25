/**
 * Actor Validation Utilities for D&D 5e Action Handlers
 * 
 * Common validation functions for D&D action handlers that require actor information.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals, BaseDocument, IToken } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Validates that actorId is provided and the actor exists in game state
 * Returns simple boolean result
 */
export function hasValidActor(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): boolean {
  return !!request.actorId && !!gameState.documents[request.actorId];
}

/**
 * Gets actor document from game state
 * Returns the actor if found, null otherwise
 */
export function getActor(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): BaseDocument | null {
  return request.actorId ? gameState.documents[request.actorId] || null : null;
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
 * Returns simple boolean result
 */
export function hasValidActorToken(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): boolean {
  // Token is optional, so null is valid
  if (!request.actorTokenId) {
    return true;
  }

  // If token ID is provided, validate it exists
  const token = gameState.currentEncounter?.tokens?.[request.actorTokenId];
  if (!token) {
    return false;
  }

  // If actorId is provided, validate token matches the actor
  if (request.actorId && token.documentId !== request.actorId) {
    return false;
  }

  return true;
}

/**
 * Gets actor token from game state if provided
 * Returns the token if found, null if no token ID provided or not found
 */
export function getActorToken(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): IToken | null {
  if (!request.actorTokenId) {
    return null;
  }

  return gameState.currentEncounter?.tokens?.[request.actorTokenId] || null;
}