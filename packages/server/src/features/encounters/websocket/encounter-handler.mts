import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../../../websocket/handler-registry.mjs';
import { logger } from '../../../utils/logger.mjs';
import { EncounterService } from '../services/encounters.service.mjs';
import { encounterRateLimiters } from '../../../websocket/utils/rate-limiter.mjs';
import { GameSessionModel } from '../../campaigns/models/game-session.model.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  // Token events
  TokenMove,
  TokenMoved,
  TokenMoveCallback,
  TokenCreate,
  TokenCreated,
  TokenUpdate,
  TokenUpdated,
  TokenDelete,
  TokenDeleted,
  // Encounter events
  EncounterStart,
  EncounterStarted,
  EncounterError
} from '@dungeon-lab/shared/types/socket/index.mjs';

/**
 * Enhanced socket handler for encounter operations with comprehensive event support
 */
function encounterHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const encounterService = new EncounterService();
  const userId = socket.userId;
  const isAdmin = socket.isAdmin || false;

  // Helper function to emit errors
  const emitError = (encounterId: string, error: string, code?: string) => {
    const errorEvent: EncounterError = {
      encounterId,
      error,
      code,
      timestamp: new Date()
    };
    socket.emit('encounter:error', errorEvent);
    logger.warn(`Encounter error for user ${userId}:`, { encounterId, error, code });
  };

  // Helper function to check rate limits
  const checkRateLimit = (limiterName: keyof typeof encounterRateLimiters, encounterId: string): boolean => {
    const limiter = encounterRateLimiters[limiterName];
    if (limiter.isRateLimited(userId)) {
      emitError(encounterId, 'Rate limit exceeded', 'RATE_LIMIT');
      return false;
    }
    return true;
  };

  // ============================================================================
  // SESSION-BASED PERMISSIONS
  // ============================================================================

  // Helper function to check if user is in session
  const isUserInSession = async (sessionId: string): Promise<boolean> => {
    logger.info('Checking if user is in session:', { sessionId, userId, isAdmin });
    try {
      logger.info('Finding session by sessionId:', sessionId);
      const session = await GameSessionModel.findById(sessionId).exec();
      logger.info('Session found:', session);
      if (!session) {
        logger.error('Session not found for sessionId:', sessionId);
        return false;
      }
      
      // Check if user is in session participantIds or is admin
      console.log('userId', userId);
      console.log('session.participantIds', session.participantIds);
      console.log('session.gameMasterId', session.gameMasterId);
      return isAdmin || session.participantIds.includes(userId) || session.gameMasterId === userId;
    } catch (error) {
      logger.error('Error checking session membership:', error);
      return false;
    }
  };

  // ============================================================================
  // TOKEN MOVEMENT
  // ============================================================================

  socket.on('token:move', async (data: TokenMove, callback?: (response: TokenMoveCallback) => void) => {
    try {
      const { sessionId, encounterId, tokenId, position } = data;
      logger.info('Token move event received:', { sessionId, encounterId, tokenId, position });
      
      if (!checkRateLimit('tokenMove', encounterId)) return;
      logger.info('Token move rate limit check passed');

      // Check session permissions (simple and fast)
      if (!(await isUserInSession(sessionId))) {
        logger.info('Token move session permission check failed');
        const response: TokenMoveCallback = {
          success: false,
          error: 'Access denied: not in session'
        };
        callback?.(response);
        return;
      }

      // Move token using service (skip permission check since we validated session membership)
      await encounterService.moveToken(encounterId, tokenId, position, userId, true);

      // Emit success to all session participants
      const moveEvent: TokenMoved = {
        encounterId,
        tokenId,
        position,
        userId,
        timestamp: new Date()
      };

      socket.to(`session:${sessionId}`).emit('token:moved', moveEvent);
      socket.emit('token:moved', moveEvent);

      // Send callback response
      const response: TokenMoveCallback = {
        success: true,
        tokenId,
        position
      };
      callback?.(response);

    } catch (error) {
      logger.error('Error moving token:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to move token';
      emitError(data.encounterId, errorMessage, 'TOKEN_MOVE_FAILED');
      
      const response: TokenMoveCallback = {
        success: false,
        error: errorMessage
      };
      callback?.(response);
    }
  });

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  socket.on('token:create', async (data: TokenCreate) => {
    try {
      const { sessionId, encounterId, tokenData } = data;
      
      if (!checkRateLimit('encounterUpdates', encounterId)) return;

      // Check session permissions (simple and fast)
      if (!(await isUserInSession(sessionId))) {
        emitError(encounterId, 'Access denied: not in session');
        return;
      }

      // Create token using service
      const tokenDataWithDefaults = {
        ...tokenData,
        encounterId,
        conditions: []
      };
      const token = await encounterService.addToken(encounterId, tokenDataWithDefaults, userId);

      // Emit to all session participants
      const createEvent: TokenCreated = {
        encounterId,
        token,
        userId,
        timestamp: new Date()
      };

      socket.to(`session:${sessionId}`).emit('token:created', createEvent);
      socket.emit('token:created', createEvent);

    } catch (error) {
      logger.error('Error creating token:', error);
      emitError(data.encounterId, error instanceof Error ? error.message : 'Failed to create token');
    }
  });

  socket.on('token:update', async (data: TokenUpdate) => {
    try {
      const { sessionId, encounterId, tokenId, updates } = data;
      
      if (!checkRateLimit('encounterUpdates', encounterId)) return;

      // Check session permissions (simple and fast)
      if (!(await isUserInSession(sessionId))) {
        emitError(encounterId, 'Access denied: not in session');
        return;
      }

      // Update token using service
      const updatesWithUserId = {
        ...updates,
        updatedBy: userId
      };
      const token = await encounterService.updateToken(encounterId, tokenId, updatesWithUserId, userId, isAdmin);

      // Emit success to all session participants
      const updateEvent: TokenUpdated = {
        encounterId,
        tokenId,
        token,
        userId,
        timestamp: new Date()
      };

      socket.to(`session:${sessionId}`).emit('token:updated', updateEvent);
      socket.emit('token:updated', updateEvent);

    } catch (error) {
      logger.error('Error updating token:', error);
      emitError(data.encounterId, error instanceof Error ? error.message : 'Failed to update token');
    }
  });

  socket.on('token:delete', async (data: TokenDelete) => {
    try {
      const { sessionId, encounterId, tokenId } = data;
      
      if (!checkRateLimit('encounterUpdates', encounterId)) return;

      // Check session permissions (simple and fast)
      if (!(await isUserInSession(sessionId))) {
        emitError(encounterId, 'Access denied: not in session');
        return;
      }

      // Delete token using service
      await encounterService.removeToken(encounterId, tokenId, userId, isAdmin);

      // Emit success to all session participants
      const deleteEvent: TokenDeleted = {
        encounterId,
        tokenId,
        userId,
        timestamp: new Date()
      };

      socket.to(`session:${sessionId}`).emit('token:deleted', deleteEvent);
      socket.emit('token:deleted', deleteEvent);

    } catch (error) {
      logger.error('Error deleting token:', error);
      emitError(data.encounterId, error instanceof Error ? error.message : 'Failed to delete token');
    }
  });

  // ============================================================================
  // ENCOUNTER STATE MANAGEMENT
  // ============================================================================

  socket.on('encounter:start', async (data: EncounterStart) => {
    try {
      const { sessionId, encounterId } = data;
      logger.info('Encounter start event received:', { sessionId, encounterId, userId });

      // Check session permissions - only GM can start encounters
      const session = await GameSessionModel.findById(sessionId).exec();
      
      if (!session) {
        emitError(encounterId, 'Session not found');
        return;
      }

      // Only GM or admin can start encounters
      if (!isAdmin && session.gameMasterId !== userId) {
        emitError(encounterId, 'Access denied: only game master can start encounters');
        return;
      }

      // Verify encounter exists and belongs to the campaign
      const encounter = await encounterService.getEncounter(encounterId, userId, isAdmin);
      if (!encounter) {
        emitError(encounterId, 'Encounter not found');
        return;
      }

      if (encounter.campaignId !== session.campaignId) {
        emitError(encounterId, 'Encounter does not belong to this campaign');
        return;
      }

      // Update game session with current encounter
      session.currentEncounterId = encounterId;
      await session.save();

      // Emit to all session participants
      const startEvent: EncounterStarted = {
        sessionId,
        encounterId,
        encounter,
        timestamp: new Date()
      };

      socket.to(`session:${sessionId}`).emit('encounter:started', startEvent);
      socket.emit('encounter:started', startEvent);

      logger.info('Encounter started successfully:', { sessionId, encounterId });

    } catch (error) {
      logger.error('Error starting encounter:', error);
      emitError(data.encounterId, error instanceof Error ? error.message : 'Failed to start encounter');
    }
  });

  /*
  socket.on('encounter:pause', async (data: EncounterPause) => {
    // Implementation for later tasks
  });

  socket.on('encounter:end', async (data: EncounterEnd) => {
    // Implementation for later tasks
  });
  */

  // ============================================================================
  // ACTION SYSTEM (TODO: Implement in Task 10)
  // ============================================================================

  /*
  socket.on('action:execute', async (data: ActionExecute) => {
    // Implementation for Task 10
  });

  socket.on('action:validate', async (data: ActionValidate) => {
    // Implementation for Task 10
  });
  */

  // ============================================================================
  // EFFECT SYSTEM (TODO: Implement in Task 11)
  // ============================================================================

  /*
  socket.on('effect:apply', async (data: EffectApply) => {
    // Implementation for Task 11
  });

  socket.on('effect:remove', async (data: EffectRemove) => {
    // Implementation for Task 11
  });
  */

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  socket.on('disconnect', () => {
    logger.info(`User ${userId} disconnected from encounter socket`);
    // Socket.io automatically handles leaving rooms on disconnect
  });
}

// Register the socket handler
socketHandlerRegistry.register(encounterHandler);

export default encounterHandler;
