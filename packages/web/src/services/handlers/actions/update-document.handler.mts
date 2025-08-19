/**
 * Update Document Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes document updates using Immer for direct state mutations.
 */

import type { GameActionRequest, UpdateDocumentParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ValidationResult } from '../../action-handler.interface.mjs';
import { applyPatch } from 'fast-json-patch';

/**
 * Validate document update request
 */
function validateUpdateDocument(
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): ValidationResult {
  const params = request.parameters as UpdateDocumentParameters;

  console.log('[UpdateDocumentHandler] Validating document update:', {
    documentId: params.documentId,
    documentName: params.documentName,
    operationsCount: params.operations?.length || 0,
    requestId: request.id
  });

  // Validate parameters
  if (!params.documentId || !params.operations || params.operations.length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Missing document ID or operations'
      }
    };
  }

  // Check if document exists
  if (!gameState.documents[params.documentId]) {
    return {
      valid: false,
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found in game state'
      }
    };
  }

  // Validate that operations are well-formed
  try {
    // Test-apply the operations on a copy to validate them
    const testDocument = JSON.parse(JSON.stringify(gameState.documents[params.documentId]));
    applyPatch(testDocument, params.operations, true); // validate=true
  } catch (error) {
    return {
      valid: false,
      error: {
        code: 'INVALID_OPERATIONS',
        message: `Invalid JSON patch operations: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }

  return { valid: true };
}

/**
 * Execute document update using direct state mutation
 */
function executeUpdateDocument(
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals
): void {
  const params = request.parameters as UpdateDocumentParameters;

  console.log('[UpdateDocumentHandler] Executing document update:', {
    documentId: params.documentId,
    documentName: params.documentName,
    operationsCount: params.operations.length,
    requestId: request.id
  });

  // Apply each operation directly to the draft
  for (const operation of params.operations) {
    const pathParts = operation.path.split('/').filter(Boolean);
    
    if (pathParts.length === 0) {
      throw new Error('Invalid operation path');
    }

    // Navigate to the target object
    let target: any = draft.documents[params.documentId];
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!target[part]) {
        if (operation.op === 'add' || operation.op === 'replace') {
          target[part] = {};
        } else {
          throw new Error(`Path not found: ${operation.path}`);
        }
      }
      target = target[part];
    }

    const finalKey = pathParts[pathParts.length - 1];

    // Apply the operation
    switch (operation.op) {
      case 'add':
      case 'replace':
        target[finalKey] = operation.value;
        break;
      case 'remove':
        delete target[finalKey];
        break;
      case 'test':
        if (JSON.stringify(target[finalKey]) !== JSON.stringify(operation.value)) {
          throw new Error(`Test operation failed at ${operation.path}`);
        }
        break;
      default:
        throw new Error(`Unsupported operation: ${operation.op}`);
    }
  }

  console.log('[UpdateDocumentHandler] Document update executed successfully:', {
    documentId: params.documentId,
    operationsApplied: params.operations.length,
    requestId: request.id
  });
}

/**
 * Core update-document action handler
 */
export const updateDocumentActionHandler: ActionHandler = {
  priority: 0, // Core handler runs first
  validate: validateUpdateDocument,
  execute: executeUpdateDocument,
  approvalMessage: (request) => {
    const params = request.parameters as UpdateDocumentParameters;
    return `wants to update document "${params.documentName || params.documentId}" with ${params.operations?.length || 0} changes`;
  }
};