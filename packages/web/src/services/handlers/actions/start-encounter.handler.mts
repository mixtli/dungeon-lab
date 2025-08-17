/**
 * Start Encounter Action Handler
 * 
 * Pure business logic for starting encounter operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, StartEncounterParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useSocketStore } from '../../../stores/socket.store.mjs';

/**
 * Execute start encounter operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function startEncounterHandler(request: GameActionRequest): Promise<void> {
  const params = request.parameters as StartEncounterParameters;
  const socketStore = useSocketStore();
  
  console.log('[StartEncounterHandler] Processing encounter start:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  // Validate parameters
  if (!params.encounterId) {
    throw new Error('Missing encounter ID for encounter start');
  }

  // Start the encounter via socket event
  return new Promise<void>((resolve, reject) => {
    socketStore.socket?.emit('encounter:start', params.encounterId, (response: { success: boolean; error?: string }) => {
      if (response.success) {
        console.log('[StartEncounterHandler] Encounter started successfully:', {
          encounterId: params.encounterId,
          requestId: request.id
        });
        resolve();
      } else {
        reject(new Error(response.error || 'Failed to start encounter'));
      }
    });
  });
}