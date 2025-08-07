import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { logger } from '../../utils/logger.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { GameStateService } from '../../features/campaigns/services/game-state.service.mjs';
// State hash utilities now handled by GameStateService
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  StateUpdate,
  StateUpdateResponse,
  StateUpdateBroadcast,
  ServerGameState
} from '@dungeon-lab/shared/types/index.mjs';

/**
 * Unified game state handler for GM-authority state management
 * Handles all game state updates through a single, sequential system
 */
function gameStateHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const userId = socket.userId;
  const isAdmin = socket.isAdmin || false;
  const gameStateService = new GameStateService();

  // Helper function to emit game state errors
  const emitGameStateError = (sessionId: string, error: any) => {
    const errorEvent = {
      sessionId,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        currentVersion: error.currentVersion,
        currentHash: error.currentHash
      }
    };
    socket.emit('gameState:error', errorEvent);
    logger.warn(`Game state error for user ${userId}:`, errorEvent);
  };

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
      const { sessionId, source } = stateUpdate;
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
          timestamp: Date.now()
        };

        socket.to(`session:${sessionId}`).emit('gameState:updated', broadcast);
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

  socket.on('gameState:requestFull', async (sessionId: string, callback?: (response: any) => void) => {
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
        sessionId,
        gameState: gameStateData.gameState,
        gameStateVersion: gameStateData.gameStateVersion,
        gameStateHash: gameStateData.gameStateHash,
        timestamp: Date.now()
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

  socket.on('gameSession:join', async (sessionId: string, callback?: (response: any) => void) => {
    try {
      logger.info('Session join requested:', { sessionId, userId });

      // Check if user is in session
      if (!(await isUserInSession(sessionId))) {
        const response = {
          success: false,
          error: 'Access denied: not in session'
        };
        callback?.(response);
        return;
      }

      // Join socket room for real-time updates
      await socket.join(`session:${sessionId}`);

      // Get user info for broadcast
      const session = await GameSessionModel.findById(sessionId).populate('participants gameMaster').exec();
      const user = session?.participants?.find((p: any) => p._id.toString() === userId) || 
                   (session?.gameMaster as any)?._id?.toString() === userId ? session.gameMaster : null;
      
      if (user) {
        // Broadcast to other session participants
        const joinEvent = {
          sessionId,
          userId,
          userName: (user as any).name || 'Unknown User',
          isGM: session?.gameMasterId === userId,
          timestamp: Date.now()
        };
        socket.to(`session:${sessionId}`).emit('gameSession:joined', joinEvent);
      }

      const response = {
        success: true,
        sessionId
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

  socket.on('gameSession:leave', async (sessionId: string, callback?: (response: any) => void) => {
    try {
      logger.info('Session leave requested:', { sessionId, userId });

      // Leave socket room
      await socket.leave(`session:${sessionId}`);

      // Get user info for broadcast
      const session = await GameSessionModel.findById(sessionId).populate('participants gameMaster').exec();
      const user = session?.participants?.find((p: any) => p._id.toString() === userId) || 
                   (session?.gameMaster as any)?._id?.toString() === userId ? session.gameMaster : null;
      
      if (user) {
        // Broadcast to other session participants
        const leaveEvent = {
          sessionId,
          userId,
          userName: (user as any).name || 'Unknown User',
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
        success: true // Always succeed for leave operations
      };
      callback?.(response);
    }
  });

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  socket.on('disconnect', () => {
    logger.info(`User ${userId} disconnected from game state socket`);
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