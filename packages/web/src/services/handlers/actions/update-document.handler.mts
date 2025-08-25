/**
 * Update Document Action Handler - New Multi-Handler Architecture
 * 
 * Validates and executes document updates using Immer for direct state mutations.
 */

import type { GameActionRequest, UpdateDocumentParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';

/**
 * Validate document update request
 */
const validateUpdateDocument: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
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

  // Basic validation passed - execution logic will handle path validation

  return { valid: true };
}

/**
 * Execute document update using direct state mutation
 */
const executeUpdateDocument: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: AsyncActionContext
): Promise<void> => {
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

    // Skip the /documents/{documentId} prefix since we're already targeting the document
    let adjustedPathParts = pathParts;
    if (pathParts[0] === 'documents' && pathParts[1] === params.documentId) {
      adjustedPathParts = pathParts.slice(2); // Remove /documents/{documentId} prefix
    }

    if (adjustedPathParts.length === 0) {
      throw new Error('Invalid operation path after adjustment');
    }

    // Navigate to the target object within the document
    let target: Record<string, unknown> = draft.documents[params.documentId];
    for (let i = 0; i < adjustedPathParts.length - 1; i++) {
      const part = adjustedPathParts[i];
      if (!target[part]) {
        if (operation.op === 'add' || operation.op === 'replace') {
          target[part] = {};
        } else {
          throw new Error(`Path not found: ${operation.path}`);
        }
      }
      target = target[part] as Record<string, unknown>;
    }

    const finalKey = adjustedPathParts[adjustedPathParts.length - 1];

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
export const updateDocumentActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 0, // Core handler runs first
  requiresManualApproval: true, // Document updates require GM approval
  validate: validateUpdateDocument,
  execute: executeUpdateDocument,
  approvalMessage: async (request) => {
    const params = request.parameters as UpdateDocumentParameters;
    return `wants to modify ${params.documentName ? `character "${params.documentName}"` : `document "${params.documentId}"`}`;
  }
};