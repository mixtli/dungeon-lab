import { Server, Socket } from 'socket.io';
import { IMoveMessage } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../../utils/logger.mjs';

export function handleMoveMessage(_io: Server, socket: Socket, message: IMoveMessage): void {
  try {
    // TODO: Implement move message handling
    logger.info('Move message received:', message);

    // Broadcast the move to all clients in the room
    socket.to(message.gameSessionId.toString()).emit('move', message);
  } catch (error) {
    logger.error('Error handling move message:', error);
    socket.emit('error', { message: 'Failed to process move' });
  }
} 