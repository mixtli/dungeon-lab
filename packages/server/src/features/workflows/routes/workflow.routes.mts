import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller.mjs';

// Initialize controller
const workflowController = new WorkflowController();

// Create router
const router = Router();

/**
 * @openapi
 * /api/workflows/progress:
 *   post:
 *     summary: Report progress updates from workflow systems
 *     description: Endpoint for external systems like Prefect to report progress on workflows
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
 *               - session_id
 *               - workflow_type
 *               - step
 *               - progress
 *             properties:
 *               session_id:
 *                 type: string
 *                 description: The unique session ID for this workflow
 *               workflow_type:
 *                 type: string
 *                 description: Type of workflow (e.g., 'map', 'character', 'encounter')
 *                 example: "map"
 *               step:
 *                 type: string
 *                 description: The current step in the workflow
 *               progress:
 *                 type: number
 *                 description: The progress percentage (0-100)
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/progress', workflowController.handleProgressUpdate);

export { router as workflowRoutes }; 