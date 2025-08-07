import '../../types/socket-io.d.ts';
import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { ActorService } from '../../features/actors/services/actor.service.mjs';
import { DocumentService } from '../../features/documents/services/document.service.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { CampaignModel } from '../../features/campaigns/models/campaign.model.mjs';
import type { ClientToServerEvents, ServerToClientEvents } from '@dungeon-lab/shared/types/socket/index.mjs';
import type { IActor, ICharacter } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Socket handler for actor operations
 * @param socket The client socket connection
 */
function actorHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const actorService = new ActorService();

  console.log('[Actor Handler] Registering actor socket handlers for socket:', socket.id);

  // Get list of actors filtered by game system and including campaign actors
  socket.on('actor:list', async (filters, callback) => {
    try {
      console.log('[Actor Handler] actor:list request from user:', socket.userId, 'filters:', filters);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      const pluginId = filters?.pluginId;
      if (!pluginId) {
        callback({ success: false, error: 'Plugin ID is required' });
        return;
      }

      // Get user's own actors for this plugin
      const userActors = await actorService.searchActors({ 
        createdBy: socket.userId,
        pluginId: pluginId 
      });

      let campaignActors: IActor[] = [];
      
      // If user is in a game session, also get actors from the current campaign
      if (socket.gameSessionId) {
        try {
          const gameSession = await GameSessionModel.findById(socket.gameSessionId);
          if (gameSession?.campaignId) {
            const campaign = await CampaignModel.findById(gameSession.campaignId);
            if (campaign && campaign.pluginId === pluginId) {
              // Get campaign characters that the user doesn't already own
              const campaignCharacters = await DocumentService.find({
                campaignId: gameSession.campaignId.toString(),
                documentType: 'character',
                pluginId: pluginId
              }) as ICharacter[];
              
              const campaignActorIds = campaignCharacters
                .filter((character: ICharacter) => !userActors.some(actor => actor.id === character.id))
                .map((character: ICharacter) => character.id);
              
              if (campaignActorIds.length > 0) {
                campaignActors = await actorService.searchActors({
                  id: { $in: campaignActorIds },
                  pluginId: pluginId
                });
              }
            }
          }
        } catch (campaignError) {
          console.warn('[Actor Handler] Error fetching campaign actors:', campaignError);
          // Continue without campaign actors if there's an error
        }
      }

      // Combine and deduplicate actors
      const allActors = [...userActors, ...campaignActors];
      const uniqueActors = allActors.filter((actor, index, self) => 
        self.findIndex(a => a.id === actor.id) === index
      );

      console.log(`[Actor Handler] Found ${userActors.length} user actors + ${campaignActors.length} campaign actors = ${uniqueActors.length} total actors for user ${socket.userId}`);
      
      callback({ success: true, data: uniqueActors });
    } catch (error) {
      console.error('[Actor Handler] Error in actor:list:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch actors' 
      });
    }
  });

  // Get single actor
  socket.on('actor:get', async (actorId, callback) => {
    try {
      console.log('[Actor Handler] actor:get request for actor:', actorId, 'from user:', socket.userId);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      const actor = await actorService.getActorById(actorId);
      
      // Check permissions
      const hasPermission = await actorService.checkUserPermission(actorId, socket.userId, false);
      if (!hasPermission) {
        callback({ success: false, error: 'Permission denied' });
        return;
      }
      
      callback({ success: true, data: actor });
    } catch (error) {
      console.error('[Actor Handler] Error in actor:get:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch actor' 
      });
    }
  });


  // Update existing actor
  socket.on('actor:update', async (updateData, callback) => {
    try {
      console.log('[Actor Handler] actor:update request from user:', socket.userId, 'data:', updateData);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      const { id, ...patchData } = updateData;

      const actor = await actorService.patchActor(id, patchData, socket.userId);
      console.log('[Actor Handler] Updated actor:', actor.id);
      
      // Broadcast update to other users
      if (actor.campaignId) {
        socket.broadcast.emit('actor:updated', actor as typeof actor & { campaignId: string });
      }
      
      callback({ success: true, data: actor });
    } catch (error) {
      console.error('[Actor Handler] Error in actor:update:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update actor' 
      });
    }
  });

  // Delete actor
  socket.on('actor:delete', async (actorId, callback) => {
    try {
      console.log('[Actor Handler] actor:delete request for actor:', actorId, 'from user:', socket.userId);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      await actorService.deleteActor(actorId);
      console.log('[Actor Handler] Deleted actor:', actorId);
      
      // Broadcast deletion to other users
      socket.broadcast.emit('actor:deleted', actorId);
      
      callback({ success: true });
    } catch (error) {
      console.error('[Actor Handler] Error in actor:delete:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete actor' 
      });
    }
  });

  console.log('[Actor Handler] Actor socket handlers registered successfully');
}

// Register the socket handler
socketHandlerRegistry.register(actorHandler);

export default actorHandler;