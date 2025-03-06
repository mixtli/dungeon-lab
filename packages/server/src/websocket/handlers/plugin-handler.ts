import { Server } from 'socket.io';
import { PluginActionMessage, PluginStateUpdateMessage } from '@dungeon-lab/shared';
import { AuthenticatedSocket, RemoteAuthenticatedSocket } from '../types.js';
import { PluginManager } from '../../services/plugin-manager.js';

export async function handlePluginAction(
  io: Server,
  socket: AuthenticatedSocket,
  message: PluginActionMessage,
  pluginManager: PluginManager
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

    // Get the plugin instance
    const plugin = await pluginManager.getPlugin(message.pluginId);
    if (!plugin) {
      socket.emit('error', { message: `Plugin ${message.pluginId} not found` });
      return;
    }

    // Let the plugin handle the action
    try {
      const result = await plugin.handleAction(message);
      
      // If the plugin returns a state update, broadcast it
      if (result?.stateUpdate) {
        const stateUpdateMessage: PluginStateUpdateMessage = {
          id: crypto.randomUUID(),
          type: 'plugin-state-update',
          timestamp: new Date(),
          sender: message.sender,
          gameSessionId: message.gameSessionId,
          pluginId: message.pluginId,
          recipient: message.recipient,
          data: {
            stateType: result.stateUpdate.type,
            state: result.stateUpdate.state,
          },
        };

        // Handle different recipient types
        switch (message.recipient) {
          case 'all':
            io.to(socket.sessionId).emit('message', stateUpdateMessage);
            break;
          case 'gm':
            const gmSocket = await findGMSocket(io, socket.sessionId);
            if (gmSocket) {
              gmSocket.emit('message', stateUpdateMessage);
            }
            break;
          case 'server':
            // Already processed by the plugin
            break;
          default:
            // Direct message to specific user
            const targetSocket = await findUserSocket(io, socket.sessionId, message.recipient.toString());
            if (targetSocket) {
              targetSocket.emit('message', stateUpdateMessage);
            }
        }
      }

      // Forward the original action message if needed
      if (result?.forward) {
        switch (message.recipient) {
          case 'all':
            io.to(socket.sessionId).emit('message', message);
            break;
          case 'gm':
            const gmSocket = await findGMSocket(io, socket.sessionId);
            if (gmSocket) {
              gmSocket.emit('message', message);
            }
            break;
          default:
            if (message.recipient !== 'server') {
              const targetSocket = await findUserSocket(io, socket.sessionId, message.recipient.toString());
              if (targetSocket) {
                targetSocket.emit('message', message);
              }
            }
        }
      }
    } catch (error) {
      console.error(`Plugin ${message.pluginId} error:`, error);
      socket.emit('error', { message: `Plugin ${message.pluginId} failed to process action` });
    }
  } catch (error) {
    console.error('Error handling plugin action:', error);
    socket.emit('error', { message: 'Failed to process plugin action' });
  }
}

async function findGMSocket(io: Server, sessionId: string): Promise<RemoteAuthenticatedSocket | undefined> {
  const sockets = await io.in(sessionId).fetchSockets();
  const socket = sockets.find(s => {
    const authSocket = s as unknown as RemoteAuthenticatedSocket;
    return authSocket.data.userId === 'gm';
  });
  return socket as unknown as RemoteAuthenticatedSocket | undefined;
}

async function findUserSocket(io: Server, sessionId: string, userId: string): Promise<RemoteAuthenticatedSocket | undefined> {
  const sockets = await io.in(sessionId).fetchSockets();
  const socket = sockets.find(s => {
    const authSocket = s as unknown as RemoteAuthenticatedSocket;
    return authSocket.data.userId === userId;
  });
  return socket as unknown as RemoteAuthenticatedSocket | undefined;
} 