/**
 * Stop Encounter Action Handler
 * 
 * Pure business logic for stopping encounter operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, StopEncounterParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useSocketStore } from '../../../stores/socket.store.mjs';
import type { ActionHandlerResult } from '../action-handler.types.mts';

/**
 * Execute stop encounter operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function stopEncounterHandler(request: GameActionRequest): Promise<ActionHandlerResult> {
  const params = request.parameters as StopEncounterParameters;
  const socketStore = useSocketStore();
  
  console.log('[StopEncounterHandler] Processing encounter stop:', {
    encounterId: params.encounterId,
    requestId: request.id
  });

  try {
    // Validate parameters
    if (!params.encounterId) {
      return {
        success: false,
        error: {
          code: 'MISSING_ENCOUNTER_ID',
          message: 'Missing encounter ID for encounter stop'
        }
      };
    }

    // Stop the encounter via socket event
    return new Promise<ActionHandlerResult>((resolve) => {
      socketStore.socket?.emit('encounter:stop', params.encounterId, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          console.log('[StopEncounterHandler] Encounter stopped successfully:', {
            encounterId: params.encounterId,
            requestId: request.id
          });
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: {
              code: 'ENCOUNTER_STOP_FAILED',
              message: response.error || 'Failed to stop encounter'
            }
          });
        }
      });
    });

  } catch (error) {
    console.error('[StopEncounterHandler] Error executing encounter stop:', error);
    return {
      success: false,
      error: {
        code: 'ENCOUNTER_STOP_ERROR',
        message: error instanceof Error ? error.message : 'Failed to stop encounter'
      }
    };
  }
}