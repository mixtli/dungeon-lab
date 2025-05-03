import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { logger } from '../../utils/logger.mjs';
import { pluginRegistry } from '../../services/plugin-registry.service.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

/**
 * Socket handler for plugin actions
 * @param socket The client socket connection
 */
function pluginHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  // Handle plugin action
  socket.on('pluginAction', async (pluginId, data, callback) => {
    try {
      const plugin = pluginRegistry.getGameSystemPlugin(pluginId);

      if (!plugin) {
        throw new Error(`Plugin with ID ${pluginId} not found`);
      }

      // Process the plugin action
      // Note: We're accessing a custom property that might not be in the TypeScript interface
      // but is expected to be available at runtime
      const pluginWithAction = plugin as unknown as {
        handleAction?: (args: {
          pluginId: string;
          data: Record<string, unknown>;
          userId: string;
          gameSessionId?: string;
        }) => Promise<{
          stateUpdate?: { type: string; state: Record<string, unknown> };
          forward?: boolean;
        } | void>;
      };

      const result = await pluginWithAction.handleAction?.({
        pluginId,
        data,
        userId: socket.userId,
        gameSessionId: socket.gameSessionId
      });

      if (result?.stateUpdate) {
        // If forward is true, broadcast to all clients in the session
        if (result.forward && socket.gameSessionId) {
          socket.to(socket.gameSessionId).emit('pluginStateUpdate', {
            pluginId,
            ...result.stateUpdate
          });
        }
      }

      callback({
        success: true,
        data: result || {},
        error: ''
      });
    } catch (error) {
      logger.error('Error handling plugin action:', error);
      callback({
        success: false,
        data: {},
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

// Register the socket handler
socketHandlerRegistry.register(pluginHandler);

export default pluginHandler;
