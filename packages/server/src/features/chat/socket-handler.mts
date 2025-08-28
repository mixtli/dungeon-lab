import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../../websocket/handler-registry.mjs';
import { SocketServer } from '../../websocket/socket-server.mjs';
import { logger } from '../../utils/logger.mjs';
import {
  ClientToServerEvents,
  ServerToClientEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';
import { ChatbotChatHandler } from '../chatbots/chat-handler.mjs';
import { botManager } from '../chatbots/routes.mjs';

// Create chatbot handler instance
const chatbotHandler = new ChatbotChatHandler(botManager);

/**
 * Socket handler for chat functionality
 * @param socket The client socket connection
 */
function chatSocketHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
  socket.on('chat', async (metadata, message) => {
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
      metadata.timestamp = new Date().toISOString();
    }

    console.log("Sending chat message to room", roomName);
    const io = SocketServer.getInstance().socketIo;
    io.to(roomName).emit('chat', metadata, message);

    // Process message for chatbots (async, non-blocking)
    // chatbotHandler.handleMessage(socket, metadata, message)
    //   .catch(error => logger.error('Chatbot handler error:', error));
  });
}

// Self-register the handler
socketHandlerRegistry.register(chatSocketHandler);

export default chatSocketHandler;
