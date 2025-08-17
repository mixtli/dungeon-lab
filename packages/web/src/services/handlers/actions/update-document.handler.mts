/**
 * Update Document Action Handler
 * 
 * Pure business logic for document update operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, UpdateDocumentParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import type { ActionHandlerResult } from '../action-handler.types.mts';

/**
 * Execute document update operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function updateDocumentHandler(request: GameActionRequest): Promise<ActionHandlerResult> {
  const params = request.parameters as UpdateDocumentParameters;
  const gameStateStore = useGameStateStore();
  
  console.log('[UpdateDocumentHandler] Executing document update operations:', {
    documentId: params.documentId,
    documentName: params.documentName,
    operationsCount: params.operations?.length || 0,
    requestId: request.id
  });

  try {
    // Validate parameters
    if (!params.documentId || !params.operations || params.operations.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing document ID or operations'
        }
      };
    }

    // Execute the state operations
    const updateResult = await gameStateStore.updateGameState(params.operations);
    
    if (!updateResult.success) {
      return {
        success: false,
        error: {
          code: 'STATE_UPDATE_FAILED',
          message: updateResult.error || 'Failed to update game state'
        }
      };
    }

    console.log('[UpdateDocumentHandler] Document update executed successfully:', { 
      requestId: request.id,
      documentId: params.documentId 
    });

    return { success: true };
    
  } catch (error) {
    console.error('[UpdateDocumentHandler] Error executing document update:', error);
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}