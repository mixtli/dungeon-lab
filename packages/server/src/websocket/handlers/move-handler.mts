import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { logger } from '../../utils/logger.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

/**
 * Socket handler for movement messages
 * @param socket The client socket connection
 */
function moveHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  socket.on('move', (message) => {
    try {
      logger.info('Move message received:', message);

      // Broadcast the move to all clients in the game session
      if (socket.gameSessionId) {
        socket.to(socket.gameSessionId).emit('move', message);
      }
    } catch (error) {
      logger.error('Error handling move message:', error);
      socket.emit('error', 'Failed to process move');
    }
  });
}

// Register the socket handler
socketHandlerRegistry.register(moveHandler);

export default moveHandler;
