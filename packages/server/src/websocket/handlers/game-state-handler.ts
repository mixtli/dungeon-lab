import { Server } from 'socket.io';
import { type IGameStateUpdateMessage } from '@dungeon-lab/shared';
import { AuthenticatedSocket } from '../types.js';

export async function handleGameStateUpdate(
  io: Server,
  socket: AuthenticatedSocket,
  message: IGameStateUpdateMessage
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

    // TODO: Implement game state validation and persistence
    // - Validate state changes
    // - Update database
    // - Handle turn/round progression
    // - Manage active effects

    // Broadcast state update to all participants
    io.to(socket.sessionId).emit('message', message);
  } catch (error) {
    console.error('Error handling game state update:', error);
    socket.emit('error', { message: 'Failed to process game state update' });
  }
}

// Helper function to get current game state
export async function getCurrentGameState(sessionId: string): Promise<IGameStateUpdateMessage['data']> {
  // TODO: Implement game state retrieval
  // - Load actors
  // - Load items
  // - Load maps
  // - Get current turn/round
  // - Get active effects
  return {
    actors: {},
    items: {},
    maps: {},
  };
} 