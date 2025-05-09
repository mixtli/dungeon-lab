import { Request, Response } from 'express';
import { getSocketServer } from '../../../websocket/socket-server.mjs';
import { logger } from '../../../utils/logger.mjs';

// Define types for workflow progress payloads
interface WorkflowProgressPayload {
  step: string;
  progress: number;
  workflow_type: string;
  metadata: Record<string, unknown>;
}

// Define a type for dynamic event emitter to avoid 'any'
interface DynamicSocketEmitter {
  emit: (event: string, payload: WorkflowProgressPayload) => boolean;
}

export class WorkflowController {
  /**
   * Handle progress updates from external workflow systems (e.g., Prefect)
   */
  async handleProgressUpdate(req: Request, res: Response): Promise<Response> {
    try {
      const { workflow_type, step, progress, metadata = {} } = req.body;
      
      // Validate required fields
      if (!workflow_type || !step || progress === undefined) {
        const errorMessage = 'Missing required fields: workflow_type, step, or progress';
        logger.error(errorMessage);
        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }

      // Get the socket server instance
      const socketServer = getSocketServer();
      
      // Construct event name based on workflow type
      // Format: "workflow:progress:{type}" - e.g., "workflow:progress:map", "workflow:progress:character"
      const eventName = `workflow:progress:${workflow_type}`;
      
      // Create the payload with workflow information
      const payload: WorkflowProgressPayload = {
        step,
        progress,
        workflow_type,
        metadata
      };
      
      // Use a more specific type cast to allow dynamic event names
      (socketServer.socketIo as unknown as DynamicSocketEmitter).emit(eventName, payload);
      
      logger.info(`Workflow progress update [${workflow_type}]: ${step} - ${progress}%`, { metadata });
      
      return res.json({ 
        success: true,
        event: eventName
      });
    } catch (error) {
      logger.error('Error handling workflow progress update:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
} 