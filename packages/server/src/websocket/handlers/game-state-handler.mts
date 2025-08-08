import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { SocketServer } from '../socket-server.mjs';
import { logger } from '../../utils/logger.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { GameStateService } from '../../features/campaigns/services/game-state.service.mjs';
import { GameStateSyncService } from '../../features/campaigns/services/game-state-sync.service.mjs';
import { GameSessionService } from '../../features/campaigns/services/game-session.service.mjs';
// State hash utilities now handled by GameStateService
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  StateUpdate,
  StateUpdateResponse,
  StateUpdateBroadcast,
  IGameSessionPopulated,
  IGameSessionPopulatedDocument,
  IUser
} from '@dungeon-lab/shared/types/index.mjs';
import {
  gameStateRequestFullCallbackSchema,
  gameSessionJoinCallbackSchema,
  gameSessionLeaveCallbackSchema,
  gameSessionEndCallbackSchema
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


  // Helper function to check if user is GM of the session
  const isUserGameMaster = async (sessionId: string): Promise<boolean> => {
    try {
      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) return false;
      return isAdmin || session.gameMasterId === userId;
    } catch (error) {
      logger.error('Error checking GM status:', error);
      return false;
    }
  };

  // Helper function to check if user is in session
  const isUserInSession = async (sessionId: string): Promise<boolean> => {
    try {
      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) return false;
      return isAdmin || session.participantIds.includes(userId) || session.gameMasterId === userId;
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
      const { sessionId, source = 'gm' } = stateUpdate;
      logger.info('Game state update received:', { sessionId, version: stateUpdate.version, operationCount: stateUpdate.operations.length, source, userId });

      // Only GM can update game state (unless it's a system update)
      if (source !== 'system' && !(await isUserGameMaster(sessionId))) {
        const response: StateUpdateResponse = {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Only the game master can update game state'
          }
        };
        callback?.(response);
        return;
      }

      // Use service to apply state update - defaults to full validation for safety
      const response = await gameStateService.applyStateUpdate(stateUpdate, { 
        enableMetrics: true
        // Note: Defaults to full validation (skipHashCheck: false) for predictable behavior
      });

      // Broadcast update to all session participants if successful
      if (response.success && response.newVersion) {
        const broadcast: StateUpdateBroadcast = {
          sessionId,
          operations: stateUpdate.operations,
          newVersion: response.newVersion,
          expectedHash: response.newHash || '',
          timestamp: Date.now(),
          source: stateUpdate.source || 'gm'
        };

        // Broadcast to ALL clients in the session room (including the GM who sent the update)
        // This ensures consistent state updates for all participants
        const io = SocketServer.getInstance().socketIo;
        io.to(`session:${sessionId}`).emit('gameState:updated', broadcast);
      }

      callback?.(response);

    } catch (error) {
      logger.error('Error updating game state:', error);
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
      if (!(await isUserInSession(sessionId))) {
        const response = {
          success: false,
          error: 'Access denied: not in session'
        };
        callback?.(response);
        return;
      }

      // Use service to get game state
      const gameStateData = await gameStateService.getGameState(sessionId);
      if (!gameStateData) {
        const response = {
          success: false,
          error: 'Session not found'
        };
        callback?.(response);
        return;
      }

      // Return full state
      const response = {
        success: true,
        data: {
          sessionId,
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
      if (!(await isUserInSession(sessionId))) {
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
      if (isGM && session.gameState) {
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
  // GAME STATE SYNC
  // ============================================================================

  socket.on('gameState:syncEncounter', async (sessionId: string, callback?: (response: { success: boolean; error?: string }) => void) => {
    try {
      logger.info('Encounter sync requested:', { sessionId, userId });

      // Only GM can trigger encounter sync
      if (!(await isUserGameMaster(sessionId))) {
        const response = {
          success: false,
          error: 'Only the game master can sync encounters'
        };
        callback?.(response);
        return;
      }

      // Trigger sync of current encounter to backing store
      const syncResult = await syncService.syncGameStateToBackingModels(sessionId, 'manual');
      
      if (syncResult.success) {
        logger.info('Encounter sync completed:', { 
          sessionId, 
          entitiesUpdated: syncResult.entitiesUpdated.encounters 
        });
        
        const response = {
          success: true
        };
        callback?.(response);
      } else {
        logger.error('Encounter sync failed:', { sessionId, errors: syncResult.errors });
        const response = {
          success: false,
          error: syncResult.errors.join('; ') || 'Failed to sync encounter'
        };
        callback?.(response);
      }

    } catch (error) {
      logger.error('Error syncing encounter:', error);
      const response = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync encounter'
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
      if (session.gameState) {
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
    
    // Check if the disconnecting user is a GM in any active sessions and trigger sync
    try {
      const activeSessions = await GameSessionModel.find({
        gameMasterId: userId,
        status: 'active',
        gameState: { $ne: null }
      }).select('_id').exec();

      for (const session of activeSessions) {
        logger.info('GM unexpectedly disconnected - triggering sync:', { sessionId: session.id, userId });
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
    } catch (error) {
      logger.error('Error handling GM disconnect sync:', { userId, error });
    }
    
    // Socket.io automatically handles leaving rooms on disconnect
  });
}

// ============================================================================
// HELPER FUNCTIONS  
// ============================================================================

// All state operations now handled by GameStateService

// Register the socket handler
socketHandlerRegistry.register(gameStateHandler);

export default gameStateHandler;