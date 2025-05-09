import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller.mjs';

export const workflowRoutes = Router();
const workflowController = new WorkflowController();

/**
 * @openapi
 * /api/workflows/callback/progress:
 *   post:
 *     summary: Report progress and status updates from workflow systems
 *     description: Endpoint for external systems like Prefect to report progress and status updates on workflows
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *       - Workflows
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - progress
 *             properties:
 *               workflow_type:
 *                 type: string
 *                 description: Type of workflow (e.g., 'map', 'feature-detection')
 *               status:
 *                 type: string
 *                 description: Current workflow status (e.g., 'running', 'completed', 'failed')
 *               flow:
 *                 type: object
 *                 description: Information about the flow definition
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Flow ID
 *                   name:
 *                     type: string
 *                     description: Flow name
 *                   labels:
 *                     type: object
 *                     description: Flow labels
 *               flow_run:
 *                 type: object
 *                 description: Information about the flow run instance
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Flow run ID
 *                   name:
 *                     type: string
 *                     description: Flow run name
 *                   parameters:
 *                     type: object
 *                     description: Flow run parameters
 *                   labels:
 *                     type: object
 *                     description: Flow run labels
 *               step:
 *                 type: string
 *                 description: The current step in the workflow
 *               message:
 *                 type: string
 *                 description: A message describing the current progress
 *               progress:
 *                 type: number
 *                 description: The progress percentage (0-100)
 *               result:
 *                 type: object
 *                 description: Result data for completed workflows
 *               metadata:
 *                 type: object
 *                 description: Additional workflow-specific data
 *     responses:
 *       200:
 *         description: Progress update received
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 event:
 *                   type: string
 *                   description: The event name that was emitted
 *       400:
 *         description: Bad Request - Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
workflowRoutes.post(
  '/callback/progress',
  (req, res, next) => {
    Promise.resolve(workflowController.handleProgressUpdate(req, res))
      .catch(next);
  }
); 