import { Server, Socket } from 'socket.io';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { AuthenticatedSocket } from '../types.mjs';
import { logger } from '../../utils/logger.mjs';

interface EncounterStartMessage {
  sessionId: string;
  encounterId: string;
  campaignId: string;
}

interface EncounterStopMessage {
  sessionId: string;
  encounterId: string;
  campaignId: string;
}

export async function handleEncounterStart(
  io: Server,
  socket: AuthenticatedSocket,
  message: EncounterStartMessage
): Promise<void> {
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
      socket.emit('error', { message: 'Game session not found' });
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
      socket.emit('error', { message: 'Only the game master can start encounters' });
      return;
    }

    // Broadcast encounter start to all participants in the session
    const eventData = {
      encounterId: message.encounterId,
      campaignId: message.campaignId,
      timestamp: new Date(),
    };
    
    // Log current session members before broadcasting
    const sockets = await io.in(message.sessionId).fetchSockets();
    logger.info('[Encounter Start] Current session members:', {
      sessionId: message.sessionId,
      memberCount: sockets.length,
      members: sockets.map(s => ((s as unknown) as AuthenticatedSocket).userId)
    });
    
    logger.info('[Encounter Start] Broadcasting to session:', {
      sessionId: message.sessionId,
      eventData
    });
    
    // Broadcast and log the result
    const broadcastResult = io.to(message.sessionId).emit('encounter:start', eventData);
    logger.info('[Encounter Start] Broadcast result:', {
      success: !!broadcastResult,
      sessionId: message.sessionId
    });

    logger.info('[Encounter Start] Successfully started:', {
      encounterId: message.encounterId,
      sessionId: message.sessionId
    });
  } catch (error) {
    logger.error('[Encounter Start] Error:', error);
    socket.emit('error', { message: 'Failed to start encounter' });
  }
}

export async function handleEncounterStop(
  io: Server,
  socket: AuthenticatedSocket,
  message: EncounterStopMessage
): Promise<void> {
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
      socket.emit('error', { message: 'Game session not found' });
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
      socket.emit('error', { message: 'Only the game master can stop encounters' });
      return;
    }

    // Broadcast encounter stop to all participants in the session
    const eventData = {
      encounterId: message.encounterId,
      campaignId: message.campaignId,
      timestamp: new Date(),
    };
    
    // Log current session members before broadcasting
    const sockets = await io.in(message.sessionId).fetchSockets();
    logger.info('[Encounter Stop] Current session members:', {
      sessionId: message.sessionId,
      memberCount: sockets.length,
      members: sockets.map(s => ((s as unknown) as AuthenticatedSocket).userId)
    });
    
    logger.info('[Encounter Stop] Broadcasting to session:', {
      sessionId: message.sessionId,
      eventData
    });
    
    // Broadcast and log the result
    const broadcastResult = io.to(message.sessionId).emit('encounter:stop', eventData);
    logger.info('[Encounter Stop] Broadcast result:', {
      success: !!broadcastResult,
      sessionId: message.sessionId
    });

    logger.info('[Encounter Stop] Successfully stopped:', {
      encounterId: message.encounterId,
      sessionId: message.sessionId
    });
  } catch (error) {
    logger.error('[Encounter Stop] Error:', error);
    socket.emit('error', { message: 'Failed to stop encounter' });
  }
} 