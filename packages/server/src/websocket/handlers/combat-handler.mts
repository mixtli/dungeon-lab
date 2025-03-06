import { Server } from 'socket.io';
import { IPluginActionMessage } from '@dungeon-lab/shared/index.mjs';
import { AuthenticatedSocket } from '../types.mjs';

export async function handleCombatAction(
  io: Server,
  socket: AuthenticatedSocket,
  message: IPluginActionMessage
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

    // Process the combat action based on type
    switch (message.data.actionType) {
      case 'attack':
        await handleAttackAction(io, socket, message);
        break;
      case 'cast-spell':
        await handleSpellAction(io, socket, message);
        break;
      default:
        // For simple actions, just broadcast to all participants
        io.to(socket.sessionId).emit('message', message);
    }
  } catch (error) {
    console.error('Error handling combat action:', error);
    socket.emit('error', { message: 'Failed to process combat action' });
  }
}

async function handleAttackAction(
  io: Server,
  socket: AuthenticatedSocket,
  message: IPluginActionMessage
): Promise<void> {
  if (!socket.sessionId) {
    socket.emit('error', { message: 'Not in a game session' });
    return;
  }

  // TODO: Implement attack resolution logic
  // - Check range
  // - Calculate attack roll
  // - Calculate damage if hit
  // - Update target state
  io.to(socket.sessionId).emit('message', message);
}

async function handleSpellAction(
  io: Server,
  socket: AuthenticatedSocket,
  message: IPluginActionMessage
): Promise<void> {
  if (!socket.sessionId) {
    socket.emit('error', { message: 'Not in a game session' });
    return;
  }

  // TODO: Implement spell casting logic
  // - Check spell requirements
  // - Handle different spell types
  // - Apply spell effects
  // - Update affected targets
  io.to(socket.sessionId).emit('message', message);
} 