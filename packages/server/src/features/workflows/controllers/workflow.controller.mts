import { Request, Response } from 'express';
import { getSocketServer } from '../../../websocket/socket-server.mjs';
import { logger } from '../../../utils/logger.mjs';

// Define types for workflow progress payloads
interface WorkflowProgressPayload {
  step?: string;
  progress: number;
  workflow_type?: string;
  status: string;
  message?: string;
  metadata: Record<string, unknown>;
  flow?: {
    id: string;
    name: string;
    labels?: Record<string, string>;
  };
  flow_run?: {
    id: string;
    name: string;
    labels?: Record<string, string>;
    parameters?: Record<string, unknown>;
    state?: string;
  };
  result?: Record<string, unknown>;
}

// Define a type for dynamic event emitter to avoid 'any'
interface DynamicSocketEmitter {
  emit: (event: string, payload: WorkflowProgressPayload) => boolean;
  to: (userId: string) => DynamicSocketEmitter;
}

export class WorkflowController {
  /**
   * Handle progress and status updates from external workflow systems (e.g., Prefect)
   */
  async handleProgressUpdate(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        workflow_type, 
        flow, 
        flow_run, 
        status, 
        progress, 
        step, 
        message,
        metadata = {},
        result
      } = req.body;
      
      // Validate required fields
      if (!status || progress === undefined) {
        const errorMessage = 'Missing required fields: status or progress';
        logger.error(errorMessage);
        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }

      // Determine workflow type from either direct parameter or flow name
      const actualWorkflowType = workflow_type || (flow?.name?.split('-')[0] || 'unknown');
      
      // Get the socket server instance
      const socketServer = getSocketServer();
      
      // Construct event name based on workflow type
      // Format: "workflow:progress:{type}" - e.g., "workflow:progress:map", "workflow:progress:character"
      const eventName = `workflow:progress:${actualWorkflowType}`;
      
      // Get userId from flow run labels if available
      let userId = null;
      if (flow_run?.labels?.user_id) {
        userId = flow_run.labels.user_id;
      } else if (flow_run?.parameters?.userId) {
        userId = flow_run.parameters.userId;
      }

      // Create the payload with workflow information
      const payload: WorkflowProgressPayload = {
        step: step || message || 'unknown',
        progress,
        workflow_type: actualWorkflowType,
        status,
        metadata: {
          ...metadata,
          userId,
          flowRunId: flow_run?.id
        }
      };

      // Add result data if available
      if (result) {
        payload.result = result;
      }
      
      if (userId) {
        (socketServer.socketIo as unknown as DynamicSocketEmitter).to(userId).emit(eventName, payload);
        logger.info(`Sent targeted workflow update to user: ${userId}`);
      }
      
      const messageContent = message || step || 'Progress update';
      logger.info(`Workflow update [${actualWorkflowType}]: ${messageContent} - ${progress}% (${status})`, { 
        userId, 
        flowRunId: flow_run?.id 
      });
      
      return res.json({ 
        success: true,
        event: eventName
      });
    } catch (error) {
      logger.error('Error handling workflow update:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
} 