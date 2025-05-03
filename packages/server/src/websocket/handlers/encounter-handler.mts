import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { logger } from '../../utils/logger.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

interface EncounterMessage {
  sessionId: string;
  encounterId: string;
  campaignId: string;
}

/**
 * Socket handler for encounter actions
 * @param socket The client socket connection
 */
function encounterHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  // Handle encounter start
  socket.on('encounter:start', async (message: EncounterMessage) => {
    try {
      logger.info('[Encounter Start] Received request:', {
        userId: socket.userId,
        sessionId: message.sessionId,
        encounterId: message.encounterId,
        campaignId: message.campaignId
      });

      // Verify the game session exists and user is the game master
      const session = await GameSessionModel.findById(message.sessionId);
      if (!session) {
        logger.warn('[Encounter Start] Game session not found:', message.sessionId);
        socket.emit('error', 'Game session not found');
        return;
      }

      logger.debug('[Encounter Start] Found session:', {
        sessionId: session._id,
        gameMasterId: session.gameMasterId
      });

      if (session.gameMasterId.toString() !== socket.userId) {
        logger.warn('[Encounter Start] Unauthorized attempt:', {
          userId: socket.userId,
          gameMasterId: session.gameMasterId
        });
        socket.emit('error', 'Only the game master can start encounters');
        return;
      }

      // Broadcast encounter start to all participants in the session
      const eventData = {
        encounterId: message.encounterId,
        campaignId: message.campaignId,
        timestamp: new Date()
      };

      logger.info('[Encounter Start] Broadcasting to session:', {
        sessionId: message.sessionId,
        eventData
      });

      // Broadcast to the room
      socket.to(message.sessionId).emit('encounter:start', eventData);
      // Also send back to the sender
      socket.emit('encounter:start', eventData);

      logger.info('[Encounter Start] Successfully started:', {
        encounterId: message.encounterId,
        sessionId: message.sessionId
      });
    } catch (error) {
      logger.error('[Encounter Start] Error:', error);
      socket.emit('error', 'Failed to start encounter');
    }
  });

  // Handle encounter stop
  socket.on('encounter:stop', async (message: EncounterMessage) => {
    try {
      logger.info('[Encounter Stop] Received request:', {
        userId: socket.userId,
        sessionId: message.sessionId,
        encounterId: message.encounterId,
        campaignId: message.campaignId
      });

      // Verify the game session exists and user is the game master
      const session = await GameSessionModel.findById(message.sessionId);
      if (!session) {
        logger.warn('[Encounter Stop] Game session not found:', message.sessionId);
        socket.emit('error', 'Game session not found');
        return;
      }

      logger.debug('[Encounter Stop] Found session:', {
        sessionId: session._id,
        gameMasterId: session.gameMasterId
      });

      if (session.gameMasterId.toString() !== socket.userId) {
        logger.warn('[Encounter Stop] Unauthorized attempt:', {
          userId: socket.userId,
          gameMasterId: session.gameMasterId
        });
        socket.emit('error', 'Only the game master can stop encounters');
        return;
      }

      // Broadcast encounter stop to all participants in the session
      const eventData = {
        encounterId: message.encounterId,
        campaignId: message.campaignId,
        timestamp: new Date()
      };

      logger.info('[Encounter Stop] Broadcasting to session:', {
        sessionId: message.sessionId,
        eventData
      });

      // Broadcast to the room
      socket.to(message.sessionId).emit('encounter:stop', eventData);
      // Also send back to the sender
      socket.emit('encounter:stop', eventData);

      logger.info('[Encounter Stop] Successfully stopped:', {
        encounterId: message.encounterId,
        sessionId: message.sessionId
      });
    } catch (error) {
      logger.error('[Encounter Stop] Error:', error);
      socket.emit('error', 'Failed to stop encounter');
    }
  });
}

// Register the socket handler
socketHandlerRegistry.register(encounterHandler);

export default encounterHandler;
