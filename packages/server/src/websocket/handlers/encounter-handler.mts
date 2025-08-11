import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { logger } from '../../utils/logger.mjs';
import { EncounterService } from '../../features/encounters/services/encounters.service.mjs';
import { GameStateService } from '../../features/campaigns/services/game-state.service.mjs';
import { GameStateSyncService } from '../../features/campaigns/services/game-state-sync.service.mjs';
import { CampaignModel } from '../../features/campaigns/models/campaign.model.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  EncounterStart,
  EncounterStop
} from '@dungeon-lab/shared/types/socket/index.mjs';
import { 
  encounterStartCallbackSchema,
  encounterStopCallbackSchema
} from '@dungeon-lab/shared/schemas/socket/encounters.mjs';
import { z } from 'zod';

/**
 * Socket handler for encounter lifecycle management (start/stop)
 * Handles encounter:start and encounter:stop events with GM authority validation
 */
function encounterHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const userId = socket.userId;
  const isAdmin = socket.isAdmin || false;
  const encounterService = new EncounterService();
  const gameStateService = new GameStateService();

  // Helper function to check if user is GM of the campaign
  const isUserCampaignGameMaster = async (campaignId: string): Promise<boolean> => {
    try {
      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) return false;
      return isAdmin || campaign.gameMasterId === userId;
    } catch (error) {
      logger.error('Error checking campaign GM status:', error);
      return false;
    }
  };

  /**
   * Handle encounter:start event
   * 1. Validate GM owns campaign containing the encounter
   * 2. Update encounter status to 'in_progress' in database
   * 3. Return complete encounter data in callback
   */
  socket.on('encounter:start', async (data: EncounterStart, callback?: (response: z.infer<typeof encounterStartCallbackSchema>) => void) => {
    try {
      logger.info(`Encounter start requested by user ${userId} for encounter ${data.encounterId}`);

      // Get the encounter to validate it exists and check campaign ownership
      const encounter = await encounterService.getEncounter(data.encounterId, userId, isAdmin);
      
      if (!encounter) {
        const error = 'Encounter not found';
        logger.warn(`Encounter start failed - encounter not found: ${data.encounterId}`);
        callback?.({ success: false, error });
        return;
      }

      // Check if user is GM of the campaign
      const isGM = await isUserCampaignGameMaster(encounter.campaignId.toString());
      if (!isGM) {
        const error = 'Only the Game Master can start encounters';
        logger.warn(`Encounter start denied - user ${userId} is not GM of campaign ${encounter.campaignId}`);
        callback?.({ success: false, error });
        return;
      }

      // Check if encounter is already in progress
      if (encounter.status === 'in_progress') {
        const error = 'Encounter is already in progress';
        logger.warn(`Encounter start failed - already in progress: ${data.encounterId}`);
        callback?.({ success: false, error });
        return;
      }

      // Update encounter status to in_progress in database
      const updatedEncounter = await encounterService.updateEncounterStatus(
        data.encounterId,
        'in_progress',
        userId,
        isAdmin
      );

      logger.info(`Encounter ${data.encounterId} status updated to in_progress`);

      // Return the complete encounter data for loading into game state
      callback?.({ 
        success: true, 
        data: updatedEncounter 
      });

    } catch (error) {
      logger.error('Error handling encounter:start:', error);
      const errorResponse = error instanceof Error ? error.message : 'Failed to start encounter';
      callback?.({ success: false, error: errorResponse });
    }
  });

  /**
   * Handle encounter:stop event
   * 1. Get currentEncounter data from game state
   * 2. Sync encounter data back to MongoDB (overwrite)
   * 3. Update encounter status to 'stopped' in database
   * 4. Return success callback
   */
  socket.on('encounter:stop', async (data: EncounterStop, callback?: (response: z.infer<typeof encounterStopCallbackSchema>) => void) => {
    try {
      logger.info(`Encounter stop requested by user ${userId} for encounter ${data.encounterId}`);

      // Get the encounter to validate it exists and check campaign ownership
      const encounter = await encounterService.getEncounter(data.encounterId, userId, isAdmin);
      
      if (!encounter) {
        const error = 'Encounter not found';
        logger.warn(`Encounter stop failed - encounter not found: ${data.encounterId}`);
        callback?.({ success: false, error });
        return;
      }

      // Check if user is GM of the campaign
      const isGM = await isUserCampaignGameMaster(encounter.campaignId.toString());
      if (!isGM) {
        const error = 'Only the Game Master can stop encounters';
        logger.warn(`Encounter stop denied - user ${userId} is not GM of campaign ${encounter.campaignId}`);
        callback?.({ success: false, error });
        return;
      }

      // Check if encounter is actually in progress
      if (encounter.status !== 'in_progress') {
        const error = 'Encounter is not currently in progress';
        logger.warn(`Encounter stop failed - not in progress: ${data.encounterId}`);
        callback?.({ success: false, error });
        return;
      }

      // Get current game state to sync encounter data back to database
      if (socket.gameSessionId) {
        try {
          const gameStateResult = await gameStateService.getGameState(encounter.campaignId.toString());
          
          if (gameStateResult?.gameState?.currentEncounter?.id === data.encounterId) {
            // Sync the currentEncounter data from game state back to MongoDB
            const syncService = new GameStateSyncService();
            const syncResult = await syncService.syncSingleEncounter(
              gameStateResult.gameState.currentEncounter,
              encounter.campaignId.toString(),
              {} // default options
            );

            if (syncResult.success && syncResult.updated) {
              logger.info(`Synced encounter data to MongoDB for encounter ${data.encounterId}`);
            } else if (syncResult.success) {
              logger.info(`No encounter sync needed for encounter ${data.encounterId}`);
            } else {
              logger.warn(`Failed to sync encounter data for encounter ${data.encounterId}: ${syncResult.error}`);
            }
          }
        } catch (error) {
          logger.warn('Could not retrieve game state for encounter sync:', error);
          // Continue with stop operation even if sync fails
        }
      }

      // Update encounter status to stopped in database
      await encounterService.updateEncounterStatus(
        data.encounterId,
        'stopped',
        userId,
        isAdmin
      );

      logger.info(`Encounter ${data.encounterId} status updated to stopped`);

      // Return success
      callback?.({ success: true, data: {} });

    } catch (error) {
      logger.error('Error handling encounter:stop:', error);
      const errorResponse = error instanceof Error ? error.message : 'Failed to stop encounter';
      callback?.({ success: false, error: errorResponse });
    }
  });
}

// Register the socket handler
socketHandlerRegistry.register(encounterHandler);

export default encounterHandler;