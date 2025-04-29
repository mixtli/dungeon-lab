import { Router } from 'express';
import { GameSessionController } from '../controllers/game-session.controller.mjs';
import { GameSessionService } from '../services/game-session.service.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { createSchema } from 'zod-openapi';
import {
  openApiGet,
  openApiGetOne,
  openApiPost,
  openApiDelete,
  openApiPatch,
  toQuerySchema
} from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import {
  baseAPIResponseSchema,
  getGameSessionsQuerySchema,
  deleteAPIResponseSchema,
  createGameSessionSchema,
  updateGameSessionSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { gameSessionSchema } from '@dungeon-lab/shared/schemas/game-session.schema.mjs';

// Initialize services and controller
const gameSessionService = new GameSessionService();
const gameSessionController = new GameSessionController(gameSessionService);

// Create router
const router = Router();

// Define routes
router.get(
  '/',
  authenticate,
  openApiGet(getGameSessionsQuerySchema, {
    description: 'Get all game sessions',
    parameters: toQuerySchema(getGameSessionsQuerySchema),
    responses: {
      200: {
        description: 'Game sessions retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.array(gameSessionSchema)
                })
                .openapi({
                  description: 'Game sessions response'
                })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  gameSessionController.getGameSessions
);

router.get(
  '/:id',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get game session by ID',
    responses: {
      200: {
        description: 'Game session retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: gameSessionSchema
                })
                .openapi({
                  description: 'Game session response'
                })
            )
          }
        }
      },
      404: { description: 'Game session not found' },
      500: { description: 'Server error' }
    }
  }),
  gameSessionController.getGameSession
);

router.post(
  '/',
  authenticate,
  openApiPost(createGameSessionSchema, {
    description: 'Create a new game session',
    responses: {
      201: {
        description: 'Game session created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: gameSessionSchema
                })
                .openapi({
                  description: 'Create game session response'
                })
            )
          }
        }
      },
      400: { description: 'Invalid game session data' },
      403: { description: 'Only the game master can create sessions' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(createGameSessionSchema),
  gameSessionController.createGameSession
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(updateGameSessionSchema, {
    description: 'Update a game session by ID',
    responses: {
      200: {
        description: 'Game session updated successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: gameSessionSchema
                })
                .openapi({
                  description: 'Update game session response'
                })
            )
          }
        }
      },
      400: { description: 'Invalid game session data' },
      403: { description: 'Access denied' },
      404: { description: 'Game session not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(updateGameSessionSchema),
  gameSessionController.updateGameSession
);

router.delete(
  '/:id',
  authenticate,
  openApiDelete(z.null(), {
    description: 'Delete a game session by ID',
    responses: {
      204: { description: 'Game session deleted successfully' },
      403: { description: 'Access denied' },
      404: { description: 'Game session not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteAPIResponseSchema.openapi({
                description: 'Delete game session response'
              })
            )
          }
        }
      }
    }
  }),
  gameSessionController.deleteGameSession
);

// Add route for getting sessions by campaign ID using query parameter
router.get(
  '/campaign',
  authenticate,
  openApiGet(
    z.object({
      campaignId: z.string()
    }),
    {
      description: 'Get all game sessions for a campaign',
      parameters: toQuerySchema(
        z.object({
          campaignId: z.string()
        })
      ),
      responses: {
        200: {
          description: 'Campaign game sessions retrieved successfully',
          content: {
            'application/json': {
              schema: createSchema(
                baseAPIResponseSchema
                  .extend({
                    data: z.array(gameSessionSchema)
                  })
                  .openapi({
                    description: 'Campaign game sessions response'
                  })
              )
            }
          }
        },
        500: { description: 'Server error' }
      }
    }
  ),
  gameSessionController.getCampaignSessions
);

export { router as gameSessionRoutes };
