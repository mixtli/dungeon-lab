import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@dungeon-lab/shared/types/socket/index.mjs';

/**
 * Utility function to send system messages to a session
 * @param io - Socket.io server instance
 * @param sessionId - The session ID to send the message to
 * @param message - The system message content
 */
export function sendSystemMessage(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  sessionId: string,
  message: string
): void {
  const metadata = {
    sender: {
      type: 'system' as const,
      id: 'system'
    },
    recipient: {
      type: 'session' as const,
      id: sessionId
    },
    timestamp: new Date().toISOString()
  };

  io.to(`session:${sessionId}`).emit('chat', metadata, message);
}