/**
 * Add Document Action Handler
 * 
 * Pure business logic for document addition operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, AddDocumentParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import type { ActionHandlerResult } from '../action-handler.types.mts';

/**
 * Execute document addition operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function addDocumentHandler(request: GameActionRequest): Promise<ActionHandlerResult> {
  const params = request.parameters as AddDocumentParameters;
  const gameStateStore = useGameStateStore();
  
  console.log('[AddDocumentHandler] Processing document addition:', {
    compendiumId: params.compendiumId,
    entryId: params.entryId,
    requestId: request.id
  });

  try {
    // Validate parameters
    if (!params.compendiumId || !params.entryId || !params.documentData) {
      return {
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Missing required parameters for document addition'
        }
      };
    }

    // Prepare state operations to add the document
    const operations = [
      {
        op: 'add' as const,
        path: `/documents/${params.documentData.id || 'new_document'}`,
        value: params.documentData
      }
    ];

    console.log('[AddDocumentHandler] Document addition validation successful, returning operations:', {
      documentId: params.documentData.id,
      requestId: request.id,
      operationsCount: operations.length
    });

    return { 
      success: true,
      stateOperations: operations
    };

  } catch (error) {
    console.error('[AddDocumentHandler] Error executing document addition:', error);
    return {
      success: false,
      error: {
        code: 'DOCUMENT_ADDITION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to add document'
      }
    };
  }
}