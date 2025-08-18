/**
 * Start Encounter Action Handler
 * 
 * Pure business logic for starting encounter operations.
 * Approval flow is handled by GMActionHandlerService before this executes.
 */

import type { GameActionRequest, StartEncounterParameters } from '@dungeon-lab/shared/types/index.mjs';
import { useSocketStore } from '../../../stores/socket.store.mjs';
import type { ActionHandlerResult } from '../action-handler.types.mts';

/**
 * Execute start encounter operations
 * By the time this handler runs, approval has already been granted (if required)
 */
export async function startEncounterHandler(request: GameActionRequest): Promise<ActionHandlerResult> {
  const params = request.parameters as StartEncounterParameters;
  const socketStore = useSocketStore();
  
  console.log('[StartEncounterHandler] Processing encounter start:', {
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
          message: 'Missing encounter ID for encounter start'
        }
      };
    }

    // Start the encounter via socket event
    return new Promise<ActionHandlerResult>((resolve) => {
      socketStore.socket?.emit('encounter:start', params.encounterId, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          console.log('[StartEncounterHandler] Encounter started successfully:', {
            encounterId: params.encounterId,
            requestId: request.id
          });
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: {
              code: 'ENCOUNTER_START_FAILED',
              message: response.error || 'Failed to start encounter'
            }
          });
        }
      });
    });

  } catch (error) {
    console.error('[StartEncounterHandler] Error executing encounter start:', error);
    return {
      success: false,
      error: {
        code: 'ENCOUNTER_START_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start encounter'
      }
    };
  }
}