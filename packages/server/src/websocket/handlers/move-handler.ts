import { Server } from 'socket.io';
import { MoveMessage } from '@dungeon-lab/shared';
import { AuthenticatedSocket } from '../types.js';

export async function handleMove(
  io: Server,
  socket: AuthenticatedSocket,
  message: MoveMessage
): Promise<void> {
  try {
    if (!socket.sessionId) {
      socket.emit('error', { message: 'Not in a game session' });
      return;
    }

    // Validate sender
    if (message.sender.toString() !== socket.userId) {
      socket.emit('error', { message: 'Invalid message sender' });
      return;
    }

    // TODO: Implement movement validation
    // - Check if actor belongs to the user
    // - Validate movement range
    // - Check for terrain effects
    // - Check for opportunity attacks (if in combat)
    // - Update position in game state

    // Broadcast movement to all participants
    io.to(socket.sessionId).emit('message', message);
  } catch (error) {
    console.error('Error handling movement:', error);
    socket.emit('error', { message: 'Failed to process movement' });
  }
} 