import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../types.mjs';
import { GameSessionModel } from '../../models/game-session.model.mjs';
import { logger } from '../../utils/logger.mjs';

interface EncounterStartMessage {
  sessionId: string;
  encounterId: string;
}

export async function handleEncounterStart(
  io: Server,
  socket: AuthenticatedSocket,
  message: EncounterStartMessage
): Promise<void> {
  try {
    // Verify the game session exists and user is the game master
    const session = await GameSessionModel.findById(message.sessionId);
    if (!session) {
      socket.emit('error', { message: 'Game session not found' });
      return;
    }

    if (session.gameMasterId.toString() !== socket.userId) {
      socket.emit('error', { message: 'Only the game master can start encounters' });
      return;
    }

    // Broadcast encounter start to all participants
    io.to(message.sessionId).emit('encounter:start', {
      encounterId: message.encounterId,
      timestamp: new Date(),
    });

    logger.info(`Encounter ${message.encounterId} started in session ${message.sessionId}`);
  } catch (error) {
    logger.error('Error handling encounter start:', error);
    socket.emit('error', { message: 'Failed to start encounter' });
  }
} 