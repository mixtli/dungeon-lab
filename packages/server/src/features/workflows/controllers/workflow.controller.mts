import { Request, Response } from 'express';
import { getSocketServer } from '../../../websocket/socket-server.mjs';
import { logger } from '../../../utils/logger.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';

// Define types for workflow progress payloads
interface WorkflowProgressSocketPayload {
  progress: number;
  status: string;
  message?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  flow?: string;
  flowRun?: string;
}

interface WorkflowProgressInput {
  flow: string;
  flow_run: string;
  status: string;
  progress: number;
  message?: string;
  user_id?: string;
}

interface WorkflowStateSocketPayload {
  flow: string;
  flowRun: string;
  userId?: string;
  state: string;
  result?: Record<string, unknown>;
}

interface WorkflowStateInput {
  flow: string;
  flow_run: string;
  user_id?: string;
  state: string;
  result?: Record<string, unknown>;
}

// Define a type for dynamic event emitter to avoid 'any'
interface DynamicSocketEmitter {
  emit: (
    event: string,
    payload: WorkflowProgressSocketPayload | WorkflowStateSocketPayload
  ) => boolean;
  to: (userId: string) => DynamicSocketEmitter;
}

export class WorkflowController {
  /**
   * Handle progress and status updates from external workflow systems (e.g., Prefect)
   */
  async handleProgressUpdate(
    req: Request<object, object, WorkflowProgressInput>,
    res: Response<BaseAPIResponse<null>>
  ): Promise<Response<BaseAPIResponse<null>>> {
    try {
      const { flow, flow_run, status, progress, message, user_id: userId } = req.body;

      // Validate required fields
      if (!status || progress === undefined) {
        const errorMessage = 'Missing required fields: status or progress';
        logger.error(errorMessage);
        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }

      // Get the socket server instance
      const socketServer = getSocketServer();

      // Construct event name based on workflow type
      const eventName = `workflow:progress:${flow}`;

      // Create the payload with workflow information
      const payload: WorkflowProgressSocketPayload = {
        progress,
        status,
        userId,
        message,
        flow,
        flowRun: flow_run
      };
      console.log('payload', payload);

      if (userId) {
        (socketServer.socketIo as unknown as DynamicSocketEmitter)
          .to(`user:${userId}`)
          .emit(eventName, payload);
        logger.info(`Sent targeted workflow update to user: ${userId}`);
      }

      const messageContent = message || 'Progress update';
      logger.info(`Workflow update [${flow}]: ${messageContent} - ${progress}% (${status})`, {
        userId,
        flowRunId: flow_run
      });

      return res.json({
        success: true
      });
    } catch (error) {
      logger.error('Error handling workflow update:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Handle state change updates from external workflow systems (e.g., Prefect)
   */
  async handleStateUpdate(
    req: Request<object, object, WorkflowStateInput>,
    res: Response<BaseAPIResponse<null>>
  ): Promise<Response<BaseAPIResponse<null>>> {
    try {
      // const { flow, flow_run, user_id, state, result } = req.body;
      const data: WorkflowStateInput = req.body;

      // Validate required fields
      if (!data.flow || !data.flow_run || !data.state) {
        const errorMessage = 'Missing required fields: flow, flow_run, or state';
        logger.error(errorMessage);
        return res.status(400).json({
          success: false,
          error: errorMessage
        });
      }

      // Get the socket server instance
      const socketServer = getSocketServer();

      // Construct event name based on workflow type
      const eventName = `workflow:state:${data.flow}`;

      // Get userId - either directly provided or from flow run labels
      const userId = data.user_id;

      if (!userId) {
        logger.warn(`No user ID found for workflow state update: ${data.flow} (${data.flow_run})`);
      }

      // Create the payload with workflow information
      const statePayload: WorkflowStateSocketPayload = {
        flow: data.flow,
        flowRun: data.flow_run,
        state: data.state,
        userId: data.user_id
      };

      // Add result data if available
      if (data.result) {
        statePayload.result = data.result;
      }

      if (userId) {
        (socketServer.socketIo as unknown as DynamicSocketEmitter)
          .to(`user:${userId}`)
          .emit(eventName, statePayload);
        logger.info(`Sent workflow state update to user: ${userId}, ${eventName}: ${data.state}`);
      }

      logger.info(`Workflow state update [${data.flow}]: ${data.state}`, {
        userId,
        flowRunId: data.flow_run
      });

      return res.json({
        success: true
      });
    } catch (error) {
      logger.error('Error handling workflow state update:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
