/**
 * Stop Encounter Action Handler
 * 
 * Pure business logic for stopping encounter operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, StopEncounterParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useSocketStore } from '../../../stores/socket.store.mjs';

/**
 * Execute stop encounter operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function stopEncounterHandler(request: GameActionRequest): Promise<void> {
  const params = request.parameters as StopEncounterParameters;
  const socketStore = useSocketStore();
  
  console.log('[StopEncounterHandler] Processing encounter stop:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  // Validate parameters
  if (!params.encounterId) {
    throw new Error('Missing encounter ID for encounter stop');
  }

  // Stop the encounter via socket event
  return new Promise<void>((resolve, reject) => {
    socketStore.socket?.emit('encounter:stop', params.encounterId, (response: { success: boolean; error?: string }) => {
      if (response.success) {
        console.log('[StopEncounterHandler] Encounter stopped successfully:', {
          encounterId: params.encounterId,
          requestId: request.id
        });
        resolve();
      } else {
        reject(new Error(response.error || 'Failed to stop encounter'));
      }
    });
  });
}