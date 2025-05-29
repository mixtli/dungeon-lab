import { Router } from 'express';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import {
  baseAPIResponseSchema,
  getGameSessionsQuerySchema,
  deleteAPIResponseSchema,
  createGameSessionSchema,
  updateGameSessionSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { gameSessionSchema } from '@dungeon-lab/shared/schemas/index.mjs';

// Initialize services and controller
const gameSessionService = new GameSessionService();
const gameSessionController = new GameSessionController(gameSessionService);

// Create router
const router = Router();

// Create response schemas using baseAPIResponseSchema
const getGameSessionsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(gameSessionSchema)
});

const getGameSessionResponseSchema = baseAPIResponseSchema.extend({
  data: gameSessionSchema
});

// Define campaign query schema
const campaignQuerySchema = z.object({
  campaignId: z.string()
});

// Define routes
router.get(
  '/',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get all game sessions',
      requestParams: {
        query: getGameSessionsQuerySchema
      },
      responses: {
        200: {
          description: 'Game sessions retrieved successfully',
          content: {
            'application/json': {
              schema: getGameSessionsResponseSchema.openapi({
                description: 'Game sessions response'
              })
            }
          }
        }
      }
    })
  ),
  gameSessionController.getGameSessions
);

router.get(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get game session by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Game session retrieved successfully',
          content: {
            'application/json': {
              schema: getGameSessionResponseSchema.openapi({
                description: 'Game session response'
              })
            }
          }
        }
      }
    })
  ),
  gameSessionController.getGameSession
);

router.post(
  '/',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Create a new game session',
      requestBody: {
        content: {
          'application/json': {
            schema: createGameSessionSchema.openapi({
              description: 'Create game session request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Game session created successfully',
          content: {
            'application/json': {
              schema: getGameSessionResponseSchema.openapi({
                description: 'Create game session response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(createGameSessionSchema),
  gameSessionController.createGameSession
);

router.patch(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Update a game session by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: updateGameSessionSchema.openapi({
              description: 'Update game session request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Game session updated successfully',
          content: {
            'application/json': {
              schema: getGameSessionResponseSchema.openapi({
                description: 'Update game session response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(updateGameSessionSchema),
  gameSessionController.updateGameSession
);

router.delete(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Delete a game session by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Game session deleted successfully',
          content: {
            'application/json': {
              schema: deleteAPIResponseSchema.openapi({
                description: 'Delete game session response'
              })
            }
          }
        }
      }
    })
  ),
  gameSessionController.deleteGameSession
);

// Add route for getting sessions by campaign ID using query parameter
router.get(
  '/campaign',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get all game sessions for a campaign',
      requestParams: {
        query: campaignQuerySchema
      },
      responses: {
        200: {
          description: 'Campaign game sessions retrieved successfully',
          content: {
            'application/json': {
              schema: getGameSessionsResponseSchema.openapi({
                description: 'Campaign game sessions response'
              })
            }
          }
        }
      }
    })
  ),
  gameSessionController.getCampaignSessions
);

export { router as gameSessionRoutes };
