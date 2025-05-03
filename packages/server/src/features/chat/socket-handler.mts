import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../../websocket/handler-registry.mjs';
import { logger } from '../../utils/logger.mjs';
import {
  ClientToServerEvents,
  ServerToClientEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

/**
 * Socket handler for chat functionality
 * @param socket The client socket connection
 */
function chatSocketHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
  socket.on('chat', (recipient: string, message: string) => {
    logger.info(`Chat message from ${socket.userId}: ${message}, ${recipient}`);

    socket.to(recipient).emit('chat', socket.userId, message);
  });
}

// Self-register the handler
socketHandlerRegistry.register(chatSocketHandler);

export default chatSocketHandler;
