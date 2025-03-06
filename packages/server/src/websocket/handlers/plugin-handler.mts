import { Server, Socket } from 'socket.io';
import { IPluginActionMessage, IPluginStateUpdateMessage } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../../utils/logger.mjs';
import { pluginRegistry } from '../../services/plugin-registry.service.mjs';
import { PluginManager } from '../../services/plugin-manager.mjs';

export function handlePluginAction(io: Server, socket: Socket, message: IPluginActionMessage, pluginManager: PluginManager): void {
  try {
    const plugin = pluginManager.getPlugin(message.pluginId);
    if (!plugin) {
      logger.error('Plugin not found:', message.pluginId);
      socket.emit('error', { message: 'Plugin not found' });
      return;
    }

    // TODO: Implement plugin action handling
    logger.info('Plugin action received:', message);

    // Broadcast the action to all clients in the room
    socket.to(message.gameSessionId.toString()).emit('plugin-action', message);
  } catch (error) {
    logger.error('Error handling plugin action:', error);
    socket.emit('error', { message: 'Failed to process plugin action' });
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