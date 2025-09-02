import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { SocketServer } from '../socket-server.mjs';
import { logger } from '../../utils/logger.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { CampaignModel } from '../../features/campaigns/models/campaign.model.mjs';
import { GameStateModel } from '../../features/campaigns/models/game-state.model.mjs';
import { GameStateService } from '../../features/campaigns/services/game-state.service.mjs';
import { GameStateSyncService } from '../../features/campaigns/services/game-state-sync.service.mjs';
import { GameSessionService } from '../../features/campaigns/services/game-session.service.mjs';
import { CampaignService } from '../../features/campaigns/services/campaign.service.mjs';
// State hash utilities now handled by GameStateService
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  StateUpdate,
  StateUpdateResponse,
  IGameSessionPopulated,
  IGameSessionPopulatedDocument,
  IUser
} from '@dungeon-lab/shared/types/index.mjs';
import {
  gameStateRequestFullCallbackSchema,
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameSessionEndCallbackSchema,
  gameStateReinitializeCallbackSchema,
  gameStateCheckStatusCallbackSchema
} from '@dungeon-lab/shared/schemas/socket/game-state.mjs';
import { z } from 'zod';

/**
 * Unified game state handler for GM-authority state management
 * Handles all game state updates through a single, sequential system
 */
function gameStateHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const userId = socket.userId;
  const isAdmin = socket.isAdmin || false;
  const gameStateService = new GameStateService();
  const syncService = new GameStateSyncService();
  const gameSessionService = new GameSessionService();
  const campaignService = new CampaignService();


  
  // Helper function to check if user is GM of the session (for backwards compatibility)
  const isUserGameMaster = async (sessionId: string): Promise<boolean> => {
    try {
      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) return false;
      const campaign = await CampaignModel.findById(session.campaignId).exec();
      if (!campaign) return false;
      return isAdmin || campaign.gameMasterId === userId;
    } catch (error) {
      logger.error('Error checking GM status:', error);
      return false;
    }
  };

  // Helper function to check if user is authorized to access session
  const isUserAuthorizedForSession = async (sessionId: string): Promise<boolean> => {
    try {
      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) return false;
      
      // Admin or GM can always access
      if (isAdmin || session.gameMasterId === userId) return true;
      
      // Check if user has character in the session's campaign
      return await campaignService.isUserCampaignMember(userId, session.campaignId);
    } catch (error) {
      logger.error('Error checking session membership:', error);
      return false;
    }
  };

  // ============================================================================
  // GAME STATE UPDATE (GM ONLY)
  // ============================================================================

  socket.on('gameState:update', async (stateUpdate: StateUpdate, callback?: (response: StateUpdateResponse) => void) => {
    try {
      const { gameStateId } = stateUpdate;
      
      // Get the GameState document to find the associated campaign
      const gameStateDoc = await GameStateModel.findById(gameStateId).exec();
      if (!gameStateDoc) {
        const response: StateUpdateResponse = {
          success: false,
          error: {
            code: 'GAMESTATE_NOT_FOUND',
            message: 'Game state not found'
          }
        };
        callback?.(response);
        return;
      }

      // Delegate to service method
      const response = await gameStateService.updateGameState(
        gameStateDoc.campaignId,
        stateUpdate,
        userId
      );

      callback?.(response);

    } catch (error) {
      logger.error('Error in gameState:update handler:', error);
      const response: StateUpdateResponse = {
        success: false,
        error: {
          code: 'TRANSACTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update game state'
        }
      };
      callback?.(response);
    }
  });

  // ============================================================================
  // GAME STATE FULL REFRESH (ALL PLAYERS)
  // ============================================================================

  socket.on('gameState:requestFull', async (sessionId: string, callback?: (response: z.infer<typeof gameStateRequestFullCallbackSchema>) => void) => {
    try {
      logger.info('Full game state requested:', { sessionId, userId });

      // Check if user is in session
      if (!(await isUserAuthorizedForSession(sessionId))) {
        const response = {
          success: false,
          error: 'Access denied: not in session'
        };
        callback?.(response);
        return;
      }

      // First get the session to find the campaign
      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) {
        const response = {
          success: false,
          error: 'Session not found'
        };
        callback?.(response);
        return;
      }
      
      // Get the GameState document to extract its ID
      const gameStateDoc = await GameStateModel.findOne({ campaignId: session.campaignId }).exec();
      if (!gameStateDoc) {
        const response = {
          success: false,
          error: 'Game state not found for campaign'
        };
        callback?.(response);
        return;
      }

      // Use service to get game state for the campaign
      const gameStateData = await gameStateService.getGameState(session.campaignId);
      if (!gameStateData) {
        const response = {
          success: false,
          error: 'Game state not found for campaign'
        };
        callback?.(response);
        return;
      }

      // Return full state with separate gameStateId
      const response = {
        success: true,
        data: {
          sessionId,
          gameStateId: gameStateDoc.id, // Add gameState document ID separately
          gameState: gameStateData.gameState,
          gameStateVersion: gameStateData.gameStateVersion,
          gameStateHash: gameStateData.gameStateHash || '',
          timestamp: Date.now()
        }
      };
      callback?.(response);

      logger.info('Full game state sent:', { sessionId, version: gameStateData.gameStateVersion });

    } catch (error) {
      logger.error('Error sending full game state:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get game state'
      };
      callback?.(response);
    }
  });

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  socket.on('gameSession:join', async (sessionId: string, callback?: (response: z.infer<typeof gameSessionJoinCallbackSchema>) => void) => {
    try {
      logger.info('Session join requested:', { sessionId, userId });

      // Check if user has access to this session (as participant or GM)
      if (!(await isUserAuthorizedForSession(sessionId))) {
        const response = {
          success: false,
          error: 'Access denied: not a participant in this session'
        };
        callback?.(response);
        return;
      }

      // Add user to session participants (if not already added)
      await gameSessionService.addParticipantToSession(sessionId, userId);

      // Join socket room for real-time updates  
      await socket.join(`session:${sessionId}`);
      
      // Set gameSessionId on socket for other handlers to use
      socket.gameSessionId = sessionId;
      
      // Debug: Verify room membership immediately after joining
      const roomsAfterJoin = Array.from(socket.rooms);
      const expectedRoom = `session:${sessionId}`;
      const isInRoom = roomsAfterJoin.includes(expectedRoom);
      
      console.log('[GameStateHandler] 🔍 Session room join verification:', {
        userId,
        sessionId,
        expectedRoom,
        roomsAfterJoin,
        isInRoom,
        socketId: socket.id.substring(0, 8) + '...'
      });
      
      if (!isInRoom) {
        console.error('[GameStateHandler] ❌ CRITICAL: Socket failed to join session room!', {
          userId,
          sessionId,
          expectedRoom,
          actualRooms: roomsAfterJoin
        });
      }
      
      logger.info('User joined socket room:', { sessionId, userId });

      // Get fully populated session data to return to client
      const populatedSession = await GameSessionModel.findById(sessionId)
        .populate('campaign')
        .populate('gameMaster') 
        .populate('participants')
        .exec() as IGameSessionPopulatedDocument | null;

      if (!populatedSession) {
        const response = {
          success: false,
          error: 'Session not found'
        };
        callback?.(response);
        return;
      }

      // Broadcast join event to other session participants
      const user = populatedSession.participants?.find((p: IUser) => p.id === userId) || 
                   (populatedSession.gameMaster?.id === userId ? populatedSession.gameMaster : null);
      
      if (user) {
        const joinEvent = {
          sessionId,
          userId,
          userName: user.username || user.displayName || 'Unknown User',
          isGM: populatedSession.gameMasterId === userId,
          timestamp: Date.now()
        };
        socket.to(`session:${sessionId}`).emit('gameSession:joined', joinEvent);
      }

      // Return full session data to client
      const response = {
        success: true,
        session: populatedSession.toObject()
      };
      callback?.(response);

      logger.info('User joined session successfully:', { sessionId, userId });

    } catch (error) {
      logger.error('Error joining session:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join session'
      };
      callback?.(response);
    }
  });

  socket.on('gameSession:leave', async (sessionId: string, callback?: (response: z.infer<typeof gameSessionLeaveCallbackSchema>) => void) => {
    try {
      logger.info('Session leave requested:', { sessionId, userId });

      // Get session info before removing user
      const session = await GameSessionModel.findById(sessionId).populate('participants gameMaster').exec() as IGameSessionPopulated | null;
      if (!session) {
        const response = {
          success: false,
          error: 'Session not found'
        };
        callback?.(response);
        return;
      }

      const isGM = session.gameMasterId === userId;
      
      // If GM is leaving and there's game state, trigger sync
      const gameStateExists = await GameStateModel.findOne({ campaignId: session.campaignId }).exec();
      if (isGM && gameStateExists) {
        logger.info('GM leaving session - triggering sync to backing models:', { sessionId, userId });
        try {
          const syncResult = await syncService.syncGameStateToBackingModels(sessionId, 'gm-disconnect');
          logger.info('GM disconnect sync completed:', { 
            sessionId, 
            success: syncResult.success, 
            entitiesUpdated: syncResult.entitiesUpdated 
          });
        } catch (error) {
          logger.warn('GM disconnect sync failed (non-fatal):', { sessionId, error });
        }
      }

      // Remove user from session participants
      await gameSessionService.removeParticipantFromSession(sessionId, userId);

      // Leave socket room
      await socket.leave(`session:${sessionId}`);
      
      // Clear gameSessionId on socket
      socket.gameSessionId = undefined;

      // Get user info for broadcast
      const user = session.participants?.find((p: IUser) => p.id === userId) || 
                   (session.gameMaster?.id === userId ? session.gameMaster : null);
      
      if (user) {
        // Broadcast to other session participants
        const leaveEvent = {
          sessionId,
          userId,
          userName: user.username || user.displayName || 'Unknown User',
          timestamp: Date.now()
        };
        socket.to(`session:${sessionId}`).emit('gameSession:left', leaveEvent);
      }

      const response = {
        success: true
      };
      callback?.(response);

      logger.info('User left session successfully:', { sessionId, userId });

    } catch (error) {
      logger.error('Error leaving session:', error);
      const response = {
        success: true // Always succeed for leave operations to avoid client issues
      };
      callback?.(response);
    }
  });


  // ============================================================================
  // SESSION END
  // ============================================================================

  socket.on('gameSession:end', async (sessionId: string, callback?: (response: z.infer<typeof gameSessionEndCallbackSchema>) => void) => {
    try {
      logger.info('Session end requested:', { sessionId, userId });

      // Only GM can end sessions
      if (!(await isUserGameMaster(sessionId))) {
        const response = {
          success: false,
          error: 'Only the game master can end sessions'
        };
        callback?.(response);
        return;
      }

      // Update session status to ended
      const session = await GameSessionModel.findByIdAndUpdate(
        sessionId,
        { status: 'ended', endedAt: new Date() },
        { new: true }
      ).exec();

      if (!session) {
        const response = {
          success: false,
          error: 'Session not found'
        };
        callback?.(response);
        return;
      }

      // Sync game state to backing models before ending
      const gameStateExists = await GameStateModel.findOne({ campaignId: session.campaignId }).exec();
      if (gameStateExists) {
        logger.info('Session ending - triggering sync to backing models:', { sessionId });
        try {
          const syncResult = await syncService.syncGameStateToBackingModels(sessionId, 'session-end');
          logger.info('Session end sync completed:', { 
            sessionId, 
            success: syncResult.success, 
            entitiesUpdated: syncResult.entitiesUpdated 
          });
        } catch (error) {
          logger.warn('Session end sync failed (non-fatal):', { sessionId, error });
        }
      }

      // Broadcast session end to all participants
      const endEvent = {
        sessionId,
        endedBy: userId,
        timestamp: Date.now()
      };
      socket.to(`session:${sessionId}`).emit('gameSession:ended', endEvent);
      socket.emit('gameSession:ended', endEvent);

      const response = {
        success: true,
        sessionId
      };
      callback?.(response);

      logger.info('Session ended successfully:', { sessionId, userId });

    } catch (error) {
      logger.error('Error ending session:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end session'
      };
      callback?.(response);
    }
  });

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  socket.on('disconnect', async () => {
    logger.info(`User ${userId} disconnected from game state socket`);
    
    // Check what rooms this socket was actually in before disconnecting
    const roomsSocketWasIn = Array.from(socket.rooms);
    const gameSessionRooms = roomsSocketWasIn.filter(room => room.startsWith('session:'));
    
    // Enhanced debugging for socket disconnect
    console.log('[GameStateHandler] 🔍 Socket disconnect analysis:', {
      userId,
      socketId: socket.id.substring(0, 8) + '...',
      roomsSocketWasIn,
      gameSessionRooms,
      gameSessionId: socket.gameSessionId,
      disconnectTime: new Date().toISOString()
    });
    
    logger.info('Socket was in rooms:', { rooms: roomsSocketWasIn, gameSessionRooms, userId });
    
    // Only trigger sync if socket was actually participating in game sessions
    if (gameSessionRooms.length === 0) {
      logger.info('Socket was not in any game session rooms, skipping GM disconnect sync');
      return;
    }
    
    // Check if the disconnecting user is a GM in any active sessions and trigger sync
    try {
      const activeSessions = await GameSessionModel.find({
        gameMasterId: userId,
        status: 'active'
      }).select('_id campaignId').exec();

      for (const session of activeSessions) {
        const sessionRoomName = `session:${session.id}`;
        
        // Only sync if this socket was actually in this specific session room
        if (!gameSessionRooms.includes(sessionRoomName)) {
          logger.info('GM socket was not in this session room, skipping sync:', { 
            sessionId: session.id, 
            sessionRoom: sessionRoomName,
            socketRooms: gameSessionRooms
          });
          continue;
        }
        
        // Check if campaign has active GameState
        const gameStateExists = await GameStateModel.findOne({ campaignId: session.campaignId }).exec();
        if (gameStateExists) {
          logger.info('GM unexpectedly disconnected from active game session - triggering sync:', { 
            sessionId: session.id, 
            userId,
            sessionRoom: sessionRoomName
          });
          try {
          const syncResult = await syncService.syncGameStateToBackingModels(session.id, 'gm-disconnect');
          logger.info('GM disconnect sync completed:', { 
            sessionId: session.id, 
            success: syncResult.success, 
            entitiesUpdated: syncResult.entitiesUpdated 
          });
          } catch (error) {
            logger.warn('GM disconnect sync failed (non-fatal):', { sessionId: session.id, error });
          }
        }
      }
    } catch (error) {
      logger.error('Error handling GM disconnect sync:', { userId, error });
    }
    
    // Socket.io automatically handles leaving rooms on disconnect
  });

  // ============================================================================
  // DEBUG OPERATIONS
  // ============================================================================

  socket.on('gameState:resetHash', async (sessionId: string, callback?: (response: { success: boolean; error?: string; newHash?: string }) => void) => {
    try {
      logger.info('Game state hash reset requested:', { sessionId, userId });

      // Only GM can reset hash
      if (!(await isUserGameMaster(sessionId))) {
        const response = {
          success: false,
          error: 'Only the game master can reset the game state hash'
        };
        callback?.(response);
        return;
      }

      // Get the game session to find the campaign
      const gameSession = await GameSessionModel.findById(sessionId).exec();

      if (!gameSession) {
        const response = {
          success: false,
          error: 'Game session not found'
        };
        callback?.(response);
        return;
      }

      // Find game state using the reliable pattern used throughout the codebase
      const gameStateDoc = await GameStateModel.findOne({ campaignId: gameSession.campaignId }).exec();
      
      if (!gameStateDoc) {
        const response = {
          success: false,
          error: 'No game state found for this session'
        };
        callback?.(response);
        return;
      }

      // Reset the hash using the game state service
      const resetResult = await gameStateService.resetStateHash(gameStateDoc.id);
      
      if (resetResult.success) {
        logger.info('Game state hash reset successfully:', { 
          sessionId, 
          gameStateId: gameStateDoc.id,
          newHash: resetResult.newHash?.substring(0, 16) + '...'
        });
        
        callback?.({
          success: true,
          newHash: resetResult.newHash
        });
      } else {
        logger.error('Game state hash reset failed:', { sessionId, error: resetResult.error });
        callback?.({
          success: false,
          error: resetResult.error || 'Failed to reset game state hash'
        });
      }

    } catch (error) {
      logger.error('Error resetting game state hash:', error);
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset game state hash'
      });
    }
  });

  // ============================================================================
  // RE-INITIALIZE GAME STATE (GM ONLY)
  // ============================================================================

  socket.on('gameState:reinitialize', async (sessionId: string, callback?: (response: z.infer<typeof gameStateReinitializeCallbackSchema>) => void) => {
    try {
      logger.info('Game state re-initialize requested:', { sessionId, userId });

      // Only GM can re-initialize game state
      if (!(await isUserGameMaster(sessionId))) {
        const response = {
          success: false,
          error: 'Only the game master can re-initialize the game state'
        };
        callback?.(response);
        return;
      }

      // Get the game session to find the campaign
      const gameSession = await GameSessionModel.findById(sessionId).exec();

      if (!gameSession) {
        const response = {
          success: false,
          error: 'Game session not found'
        };
        callback?.(response);
        return;
      }

      // Re-initialize game state using the game state service
      const reinitializeResult = await gameStateService.reinitializeGameState(gameSession.campaignId);
      
      if (reinitializeResult.success) {
        logger.info('Game state re-initialized successfully:', { 
          sessionId, 
          campaignId: gameSession.campaignId,
          newVersion: reinitializeResult.newVersion
        });
        
        // Get the fresh game state to broadcast to all clients
        const freshGameState = await gameStateService.getGameState(gameSession.campaignId);
        
        if (freshGameState) {
          // Find the GameState document to get its ID
          const gameStateDoc = await GameStateModel.findOne({ campaignId: gameSession.campaignId }).exec();
          
          if (gameStateDoc) {
            // Broadcast the fresh state to ALL clients in all active session rooms for this campaign
            const activeSessions = await GameSessionModel.find({ 
              campaignId: gameSession.campaignId, 
              status: 'active' 
            }).exec();

            const reinitializeBroadcast = {
              gameStateId: gameStateDoc.id,
              gameState: freshGameState.gameState,
              gameStateVersion: freshGameState.gameStateVersion,
              gameStateHash: freshGameState.gameStateHash || '',
              timestamp: Date.now(),
              reinitializedBy: userId
            };

            // Broadcast to ALL clients in all active session rooms for this campaign
            const io = SocketServer.getInstance().socketIo;
            for (const session of activeSessions) {
              io.to(`session:${session.id}`).emit('gameState:reinitialized', reinitializeBroadcast);
            }
            
            logger.info('Game state reinitialization broadcast sent to all session participants', {
              campaignId: gameSession.campaignId,
              sessionCount: activeSessions.length,
              version: freshGameState.gameStateVersion
            });
          }
        }
        
        callback?.({
          success: true
        });
      } else {
        logger.error('Game state re-initialization failed:', { sessionId, error: reinitializeResult.error });
        callback?.({
          success: false,
          error: reinitializeResult.error?.message || 'Failed to re-initialize game state'
        });
      }

    } catch (error) {
      logger.error('Error re-initializing game state:', error);
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to re-initialize game state'
      });
    }
  });

  // ============================================================================
  // CHECK GAME STATE STATUS (GM ONLY)
  // ============================================================================

  socket.on('gameState:checkStatus', async (sessionId: string, callback?: (response: z.infer<typeof gameStateCheckStatusCallbackSchema>) => void) => {
    try {
      logger.info('Game state check status requested:', { sessionId, userId });

      // Only GM can check game state status
      if (!(await isUserGameMaster(sessionId))) {
        const response = {
          success: false,
          error: 'Only the game master can check the game state status'
        };
        callback?.(response);
        return;
      }

      // Get the game session to find the campaign
      const gameSession = await GameSessionModel.findById(sessionId).exec();

      if (!gameSession) {
        const response = {
          success: false,
          error: 'Game session not found'
        };
        callback?.(response);
        return;
      }

      // Find game state using the reliable pattern used throughout the codebase
      const gameStateDoc = await GameStateModel.findOne({ campaignId: gameSession.campaignId }).exec();
      
      if (!gameStateDoc) {
        const response = {
          success: false,
          error: 'No game state found for this session'
        };
        callback?.(response);
        return;
      }

      // Check game state status using the game state service
      const statusResult = await gameStateService.checkGameStateStatus(gameStateDoc.id);
      
      if (statusResult.success) {
        logger.info('Game state status checked successfully:', { 
          sessionId, 
          gameStateId: gameStateDoc.id,
          isHashValid: statusResult.isHashValid
        });
        
        callback?.({
          success: true,
          isHashValid: statusResult.isHashValid,
          storedHash: statusResult.storedHash,
          calculatedHash: statusResult.calculatedHash
        });
      } else {
        logger.error('Game state status check failed:', { sessionId, error: statusResult.error });
        callback?.({
          success: false,
          error: statusResult.error || 'Failed to check game state status'
        });
      }

    } catch (error) {
      logger.error('Error checking game state status:', error);
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check game state status'
      });
    }
  });

  // ============================================================================
  // SYNC GAME STATE TO BACKING MODELS (GM ONLY)
  // ============================================================================

  socket.on('gameState:sync', async (sessionId: string, callback?: (response: { success: boolean; error?: string; entitiesUpdated?: { campaigns: number; characters: number; actors: number; items: number; encounters: number } }) => void) => {
    try {
      logger.info('Game state sync to backing models requested:', { sessionId, userId });

      // Only GM can sync game state
      if (!(await isUserGameMaster(sessionId))) {
        const response = {
          success: false,
          error: 'Only the game master can sync the game state'
        };
        callback?.(response);
        return;
      }

      // Sync game state to backing models
      const syncResult = await syncService.syncGameStateToBackingModels(
        sessionId,
        'manual', // reason
        {} // default options
      );

      if (syncResult.success) {
        logger.info('Game state synced successfully:', { 
          sessionId, 
          entitiesUpdated: syncResult.entitiesUpdated,
          duration: syncResult.duration
        });
        
        callback?.({
          success: true,
          entitiesUpdated: syncResult.entitiesUpdated
        });
      } else {
        logger.error('Game state sync failed:', { sessionId, errors: syncResult.errors });
        callback?.({
          success: false,
          error: syncResult.errors.join('; ') || 'Failed to sync game state'
        });
      }

    } catch (error) {
      logger.error('Error syncing game state:', error);
      callback?.({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync game state'
      });
    }
  });
}

// ============================================================================
// HELPER FUNCTIONS  
// ============================================================================

// All state operations now handled by GameStateService

// Register the socket handler
socketHandlerRegistry.register(gameStateHandler);

export default gameStateHandler;