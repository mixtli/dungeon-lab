import { Server } from 'socket.io';
import { ChatMessage } from '@dungeon-lab/shared';
import { AuthenticatedSocket, RemoteAuthenticatedSocket } from '../types.js';

export async function handleChatMessage(
  io: Server,
  socket: AuthenticatedSocket,
  message: ChatMessage
): Promise<void> {
  try {
    if (!socket.sessionId) {
      socket.emit('error', { message: 'Not in a game session' });
      return;
    }

    // Validate sender matches socket user
    if (message.sender.toString() !== socket.userId) {
      socket.emit('error', { message: 'Invalid message sender' });
      return;
    }

    // Handle different recipient types
    switch (message.recipient) {
      case 'all':
        // Broadcast to all users in the session
        io.to(socket.sessionId).emit('message', message);
        break;

      case 'gm':
        // Find GM socket and send message
        const sockets = await io.in(socket.sessionId).fetchSockets();
        const gmSocket = sockets.find(s => {
          const authSocket = s as unknown as RemoteAuthenticatedSocket;
          return authSocket.data.userId === message.recipient;
        });
        if (gmSocket) {
          (gmSocket as unknown as RemoteAuthenticatedSocket).emit('message', message);
        }
        break;

      case 'server':
        // Message only for server processing, no forwarding needed
        break;

      default:
        // Direct message to specific user
        const targetSockets = await io.in(socket.sessionId).fetchSockets();
        const targetSocket = targetSockets.find(s => {
          const authSocket = s as unknown as RemoteAuthenticatedSocket;
          return authSocket.data.userId === message.recipient;
        });
        if (targetSocket) {
          (targetSocket as unknown as RemoteAuthenticatedSocket).emit('message', message);
          // Also send to sender if they're not the target
          if (message.sender.toString() !== message.recipient.toString()) {
            socket.emit('message', message);
          }
        }
    }
  } catch (error) {
    console.error('Error handling chat message:', error);
    socket.emit('error', { message: 'Failed to process chat message' });
  }
} 