/**
 * Add Document Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes document addition using Immer for direct state mutations.
 */

import type { GameActionRequest, AddDocumentParameters, BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ValidationResult } from '../../action-handler.interface.mjs';

/**
 * Validate document addition request
 */
async function validateAddDocument(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ValidationResult> {
  const params = request.parameters as AddDocumentParameters;

  console.log('[AddDocumentHandler] Validating document addition:', {
    compendiumId: params.compendiumId,
    entryId: params.entryId,
    requestId: request.id
  });

  // Validate required parameters
  if (!params.compendiumId || !params.entryId || !params.documentData) {
    return {
      valid: false,
      error: {
        code: 'MISSING_PARAMETERS',
        message: 'Missing required parameters for document addition'
      }
    };
  }

  // Validate document data has required fields
  if (!params.documentData.id || typeof params.documentData.id !== 'string') {
    return {
      valid: false,
      error: {
        code: 'INVALID_DOCUMENT_DATA',
        message: 'Document data must include a valid id field'
      }
    };
  }

  // Check if document already exists
  if (gameState.documents[params.documentData.id]) {
    return {
      valid: false,
      error: {
        code: 'DOCUMENT_EXISTS',
        message: 'Document with this ID already exists'
      }
    };
  }

  return { valid: true };
}

/**
 * Execute document addition using direct state mutation
 */
async function executeAddDocument(
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals
): Promise<void> {
  const params = request.parameters as AddDocumentParameters;

  console.log('[AddDocumentHandler] Executing document addition:', {
    documentId: params.documentData.id,
    documentType: params.documentData.documentType,
    requestId: request.id
  });

  // Direct mutation - add document to the documents map
  const documentId = params.documentData.id;
  if (typeof documentId === 'string') {
    draft.documents[documentId] = params.documentData as BaseDocument;
  }

  console.log('[AddDocumentHandler] Document addition executed successfully:', {
    documentId: params.documentData.id,
    requestId: request.id
  });
}

/**
 * Core add-document action handler
 */
export const addDocumentActionHandler: ActionHandler = {
  priority: 0, // Core handler runs first
  validate: validateAddDocument,
  execute: executeAddDocument,
  approvalMessage: async (request) => {
    const params = request.parameters as AddDocumentParameters;
    return `wants to add document "${params.documentData.name || params.documentData.id}" to the game`;
  }
};