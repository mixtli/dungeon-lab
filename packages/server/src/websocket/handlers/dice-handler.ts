import { Server } from 'socket.io';
import { DiceRollMessage } from '@dungeon-lab/shared';
import { AuthenticatedSocket, RemoteAuthenticatedSocket } from '../types.js';
import { rollDice } from '../utils/dice.js';

export async function handleDiceRoll(
  io: Server,
  socket: AuthenticatedSocket,
  message: DiceRollMessage
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

    // Roll the dice and get results
    const rollResult = await rollDice(message.data.formula);
    const rollMessage = {
      ...message,
      data: {
        ...message.data,
        result: rollResult,
      },
    };

    // Handle different recipient types and roll privacy
    if (message.data.isSecret) {
      // Secret rolls only go to GM and roller
      const sockets = await io.in(socket.sessionId).fetchSockets();
      const gmSocket = sockets.find(s => {
        const authSocket = s as unknown as RemoteAuthenticatedSocket;
        return authSocket.data.userId === 'gm';
      });
      
      // Send to GM
      if (gmSocket) {
        (gmSocket as unknown as RemoteAuthenticatedSocket).emit('message', rollMessage);
      }
      
      // Send to roller if they're not the GM
      if (socket.userId !== 'gm') {
        socket.emit('message', rollMessage);
      }
    } else {
      // Handle normal roll visibility based on recipient
      switch (message.recipient) {
        case 'all':
          io.to(socket.sessionId).emit('message', rollMessage);
          break;

        case 'gm':
          const sockets = await io.in(socket.sessionId).fetchSockets();
          const gmSocket = sockets.find(s => {
            const authSocket = s as unknown as RemoteAuthenticatedSocket;
            return authSocket.data.userId === message.recipient;
          });
          if (gmSocket) {
            (gmSocket as unknown as RemoteAuthenticatedSocket).emit('message', rollMessage);
            // Also send to roller if they're not the GM
            if (socket.userId !== 'gm') {
              socket.emit('message', rollMessage);
            }
          }
          break;

        case 'server':
          // Process roll result on server if needed
          break;

        default:
          // Direct message to specific user
          const targetSockets = await io.in(socket.sessionId).fetchSockets();
          const targetSocket = targetSockets.find(s => {
            const authSocket = s as unknown as RemoteAuthenticatedSocket;
            return authSocket.data.userId === message.recipient;
          });
          if (targetSocket) {
            (targetSocket as unknown as RemoteAuthenticatedSocket).emit('message', rollMessage);
            // Also send to roller if they're not the target
            if (message.sender.toString() !== message.recipient.toString()) {
              socket.emit('message', rollMessage);
            }
          }
      }
    }
  } catch (error) {
    console.error('Error handling dice roll:', error);
    socket.emit('error', { message: 'Failed to process dice roll' });
  }
} 