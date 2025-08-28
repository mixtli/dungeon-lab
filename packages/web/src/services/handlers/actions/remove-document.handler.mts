/**
 * Remove Document Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes document removal using Immer for direct state mutations.
 */

import type { GameActionRequest, RemoveDocumentParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';

/**
 * Validate document removal request
 */
const validateRemoveDocument: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  const params = request.parameters as RemoveDocumentParameters;

  console.log('[RemoveDocumentHandler] Validating document removal:', {
    documentId: params.documentId,
    documentName: params.documentName,
    requestId: request.id
  });

  // Validate required parameters
  if (!params.documentId) {
    return {
      valid: false,
      error: {
        code: 'MISSING_PARAMETERS',
        message: 'Missing required documentId parameter'
      }
    };
  }

  // Check if document exists in game state
  const document = gameState.documents[params.documentId];
  if (!document) {
    return {
      valid: false,
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found in current game session'
      }
    };
  }

  // Permission check - players can remove their own documents, GM can remove any
  const isOwner = document.ownerId === request.playerId;
  const isGM = request.playerId === gameState.campaign?.gameMasterId;

  if (!isOwner && !isGM) {
    return {
      valid: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'You can only remove your own documents'
      }
    };
  }

  return { valid: true };
}

/**
 * Execute document removal using direct state mutation
 */
const executeRemoveDocument: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: AsyncActionContext
): Promise<void> => {
  const params = request.parameters as RemoveDocumentParameters;

  console.log('[RemoveDocumentHandler] Executing document removal:', {
    documentId: params.documentId,
    documentName: params.documentName,
    requestId: request.id
  });

  // Direct mutation - remove document from the documents map
  delete draft.documents[params.documentId];

  console.log('[RemoveDocumentHandler] Document removal executed successfully:', {
    documentId: params.documentId,
    requestId: request.id
  });
}

/**
 * Core remove-document action handler
 */
export const removeDocumentActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 0, // Core handler runs first
  gmOnly: false, // Players can remove their own documents
  requiresManualApproval: true,
  validate: validateRemoveDocument,
  execute: executeRemoveDocument,
  approvalMessage: async (request) => {
    const params = request.parameters as RemoveDocumentParameters;
    return `wants to remove document "${params.documentName || params.documentId}" from the game session`;
  }
};