import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../../../websocket/handler-registry.mjs';
import { logger } from '../../../utils/logger.mjs';
import { EncounterService } from '../services/encounters.service.mjs';
import { encounterRateLimiters } from '../../../websocket/utils/rate-limiter.mjs';
import { encounterPermissionValidator } from './encounter-permissions.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  // Room management
  EncounterJoin,
  EncounterLeave,
  EncounterJoinCallback,
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
  // ROOM MANAGEMENT
  // ============================================================================

  socket.on('encounter:join', async (data: EncounterJoin, callback?: (response: EncounterJoinCallback) => void) => {
    try {
      const { encounterId } = data;
      
      if (!checkRateLimit('general', encounterId)) return;

      // Validate permissions
      const permissions = await encounterPermissionValidator.getEncounterPermissions(
        encounterId, userId, isAdmin
      );

      if (!permissions.canView) {
        const response: EncounterJoinCallback = {
          success: false,
          error: 'Access denied: insufficient permissions to view encounter'
        };
        callback?.(response);
        return;
      }

      // Get encounter data
      const encounter = await encounterService.getEncounter(encounterId, userId, isAdmin);

      // Join encounter room
      await socket.join(`encounter:${encounterId}`);
      
      logger.info(`User ${userId} joined encounter ${encounterId}`);

      // Send success response with encounter data
      const response: EncounterJoinCallback = {
        success: true,
        encounter,
        permissions
      };
      callback?.(response);

      // Notify other participants
      socket.to(`encounter:${encounterId}`).emit('userJoinedSession', {
        userId,
        sessionId: encounterId,
        actorId: undefined
      });

    } catch (error) {
      logger.error('Error joining encounter:', error);
      const response: EncounterJoinCallback = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join encounter'
      };
      callback?.(response);
    }
  });

  socket.on('encounter:leave', async (data: EncounterLeave) => {
    try {
      const { encounterId } = data;
      
      // Leave encounter room
      await socket.leave(`encounter:${encounterId}`);
      
      logger.info(`User ${userId} left encounter ${encounterId}`);

      // Notify other participants
      socket.to(`encounter:${encounterId}`).emit('userLeftSession', {
        userId,
        sessionId: encounterId,
        actorIds: [],
        characterNames: []
      });

    } catch (error) {
      logger.error('Error leaving encounter:', error);
      emitError(data.encounterId, 'Failed to leave encounter');
    }
  });

  // ============================================================================
  // TOKEN MOVEMENT
  // ============================================================================

  socket.on('token:move', async (data: TokenMove, callback?: (response: TokenMoveCallback) => void) => {
    try {
      const { encounterId, tokenId, position } = data;
      
      if (!checkRateLimit('tokenMove', encounterId)) return;

      // Validate token control permissions
      await encounterPermissionValidator.validateTokenControl(tokenId, userId, isAdmin);

      // Move token using service
      await encounterService.moveToken(encounterId, tokenId, position, userId);

      // Emit success to all participants
      const moveEvent: TokenMoved = {
        encounterId,
        tokenId,
        position,
        userId,
        timestamp: new Date()
      };

      socket.to(`encounter:${encounterId}`).emit('token:moved', moveEvent);
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
      const { encounterId, tokenData } = data;
      
      if (!checkRateLimit('encounterUpdates', encounterId)) return;

      // Validate encounter modify permissions
      await encounterPermissionValidator.validateEncounterAccess(
        encounterId, userId, 'canModify', isAdmin
      );

      // Create token using service
      const tokenDataWithDefaults = {
        ...tokenData,
        encounterId,
        conditions: []
      };
      const token = await encounterService.addToken(encounterId, tokenDataWithDefaults, userId);

      // Emit to all participants
      const createEvent: TokenCreated = {
        encounterId,
        token,
        userId,
        timestamp: new Date()
      };

      socket.to(`encounter:${encounterId}`).emit('token:created', createEvent);
      socket.emit('token:created', createEvent);

    } catch (error) {
      logger.error('Error creating token:', error);
      emitError(data.encounterId, error instanceof Error ? error.message : 'Failed to create token');
    }
  });

  socket.on('token:update', async (data: TokenUpdate) => {
    try {
      const { encounterId, tokenId, updates } = data;
      
      if (!checkRateLimit('encounterUpdates', encounterId)) return;

      // Validate token control permissions
      await encounterPermissionValidator.validateTokenControl(tokenId, userId, isAdmin);

      // Update token using service
      const updatesWithUserId = {
        ...updates,
        updatedBy: userId
      };
      const token = await encounterService.updateToken(encounterId, tokenId, updatesWithUserId, userId, isAdmin);

      // Emit success to all participants
      const updateEvent: TokenUpdated = {
        encounterId,
        tokenId,
        token,
        userId,
        timestamp: new Date()
      };

      socket.to(`encounter:${encounterId}`).emit('token:updated', updateEvent);
      socket.emit('token:updated', updateEvent);

    } catch (error) {
      logger.error('Error updating token:', error);
      emitError(data.encounterId, error instanceof Error ? error.message : 'Failed to update token');
    }
  });

  socket.on('token:delete', async (data: TokenDelete) => {
    try {
      const { encounterId, tokenId } = data;
      
      if (!checkRateLimit('encounterUpdates', encounterId)) return;

      // Validate token control permissions
      await encounterPermissionValidator.validateTokenControl(tokenId, userId, isAdmin);

      // Delete token using service
      await encounterService.removeToken(encounterId, tokenId, userId, isAdmin);

      // Emit success to all participants
      const deleteEvent: TokenDeleted = {
        encounterId,
        tokenId,
        userId,
        timestamp: new Date()
      };

      socket.to(`encounter:${encounterId}`).emit('token:deleted', deleteEvent);
      socket.emit('token:deleted', deleteEvent);

    } catch (error) {
      logger.error('Error deleting token:', error);
      emitError(data.encounterId, error instanceof Error ? error.message : 'Failed to delete token');
    }
  });

  // ============================================================================
  // ENCOUNTER STATE MANAGEMENT (TODO: Implement in later tasks)
  // ============================================================================

  /*
  socket.on('encounter:start', async (data: EncounterStart) => {
    // Implementation for later tasks
  });

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
