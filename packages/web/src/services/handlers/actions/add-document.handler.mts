/**
 * Add Document Action Handler
 * 
 * Pure business logic for document addition operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, AddDocumentParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';

/**
 * Execute document addition operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function addDocumentHandler(request: GameActionRequest): Promise<void> {
  const params = request.parameters as AddDocumentParameters;
  const gameStateStore = useGameStateStore();
  
  console.log('[AddDocumentHandler] Processing document addition:', {
    compendiumId: params.compendiumId,
    entryId: params.entryId,
    requestId: request.id
  });

  // Validate parameters
  if (!params.compendiumId || !params.entryId || !params.documentData) {
    throw new Error('Missing required parameters for document addition');
  }

  // Prepare state operations to add the document
  const operations = [
    {
      path: `documents.${params.documentData.id || 'new_document'}`,
      operation: 'set' as const,
      value: params.documentData
    }
  ];

  // Execute the game state update
  const updateResult = await gameStateStore.updateGameState(operations);
  
  if (!updateResult.success) {
    throw new Error(updateResult.error?.message || 'Failed to update game state');
  }

  console.log('[AddDocumentHandler] Document addition executed successfully:', {
    documentId: params.documentData.id,
    requestId: request.id
  });
}