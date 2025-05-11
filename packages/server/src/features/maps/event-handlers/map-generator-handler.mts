import { Socket } from 'socket.io';
import { PrefectClient } from '../../workflows/services/prefect-client.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { socketHandlerRegistry } from '../../../websocket/handler-registry.mjs';
import type {
  ClientToServerEvents,
  ServerToClientEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

/**
 * Handle map generation requests via socket
 * @param socket The Socket.io socket
 */
function setupMapGeneratorHandler(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
): void {
  // Handle map generation requests
  socket.on('map:generate', async (data, callback) => {
    try {
      // Get user ID from socket
      const userId = socket.userId as string;
      
      if (!userId) {
        throw new Error('User ID not found in socket data');
      }
      
      logger.info(`Map generation requested by user ${userId}`);
      
      const prefect = new PrefectClient();

      
      
      // Create the flow run
      const flowRun = await prefect.runFlow(
        "generate-map",
        "generate-map",
        {
          description: data.description,
          parameters: data.parameters
        },
        userId
      );
      
      // Send success response with flow ID
      callback({
        success: true,
        flowId: flowRun.id
      });
      
      logger.info(`Map generation flow started: ${flowRun.id} for user ${userId}`);
    } catch (error) {
      logger.error('Error starting map generation flow:', error);
      callback({
        success: false,
        flowId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

// Register the handler with the registry
socketHandlerRegistry.register(setupMapGeneratorHandler);

// Export for testing
export { setupMapGeneratorHandler }; 