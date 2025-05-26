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
  socket.on('chat', (metadata, message) => {
    const recipient = metadata.recipient;
    
    // Construct room name by concatenating type and id (except for 'system')
    const roomName = recipient.type === 'system' ? 'system' : `${recipient.type}:${recipient.id}`;
    
    logger.info(`Chat message from: ${socket.userId}, to: ${roomName}, message: ${message}`);

    // Set sender userId if not provided
    if (!metadata.sender.id && socket.userId) {
      metadata.sender.id = socket.userId;
    }
    
    // Set timestamp if not provided
    if (!metadata.timestamp) {
      metadata.timestamp = new Date();
    }

    console.log("Sending chat message to room", roomName);
    socket.to(roomName).emit('chat', metadata, message);
  });
}

// Self-register the handler
socketHandlerRegistry.register(chatSocketHandler);

export default chatSocketHandler;
