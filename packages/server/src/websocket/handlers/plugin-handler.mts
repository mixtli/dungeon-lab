import { Server, Socket } from 'socket.io';
import { IPluginActionMessage, IPluginStateUpdateMessage } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../../utils/logger.mjs';
import { pluginRegistry } from '../../services/plugin-registry.service.mjs';

export async function handlePluginAction(io: Server, socket: Socket, message: IPluginActionMessage): Promise<void> {
  try {
    const result = await pluginRegistry.handlePluginAction(message);
    
    if (result?.stateUpdate) {
      // If forward is true, broadcast to all clients, otherwise just send back to sender
      if (result.forward) {
        io.emit('plugin:stateUpdate', {
          pluginId: message.pluginId,
          ...result.stateUpdate
        });
      } else {
        socket.emit('plugin:stateUpdate', {
          pluginId: message.pluginId,
          ...result.stateUpdate
        });
      }
    }
  } catch (error) {
    console.error('Error handling plugin action:', error);
    socket.emit('error', {
      message: 'Failed to handle plugin action',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export function handlePluginStateUpdate(io: Server, socket: Socket, message: IPluginStateUpdateMessage): void {
  try {
    const plugin = pluginRegistry.getGameSystemPlugin(message.pluginId);
    if (!plugin) {
      logger.error('Plugin not found:', message.pluginId);
      socket.emit('error', { message: 'Plugin not found' });
      return;
    }

    // TODO: Implement plugin state update handling
    logger.info('Plugin state update received:', message);

    // Broadcast the state update to all clients in the room
    socket.to(message.gameSessionId.toString()).emit('plugin-state-update', message);
  } catch (error) {
    logger.error('Error handling plugin state update:', error);
    socket.emit('error', { message: 'Failed to process plugin state update' });
  }
} 