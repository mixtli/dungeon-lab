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
  getGameSessionsQuerySchema,
  getGameSessionsResponseSchema,
  getGameSessionResponseSchema,
  getCampaignSessionsResponseSchema,
  createGameSessionResponseSchema,
  updateGameSessionSchema,
  updateGameSessionResponseSchema,
  deleteGameSessionResponseSchema,
  createGameSessionSchema
} from '@dungeon-lab/shared/types/api/index.mjs';

// Initialize services and controllers
const gameSessionService = new GameSessionService();
const gameSessionController = new GameSessionController(gameSessionService);

// Create router
const router = Router();

// Bind controller methods to maintain 'this' context
const boundGetGameSessions = gameSessionController.getGameSessions.bind(gameSessionController);
const boundGetGameSession = gameSessionController.getGameSession.bind(gameSessionController);
const boundCreateGameSession = gameSessionController.createGameSession.bind(gameSessionController);
const boundUpdateGameSession = gameSessionController.updateGameSession.bind(gameSessionController);
const boundDeleteGameSession = gameSessionController.deleteGameSession.bind(gameSessionController);
const boundGetCampaignSessions =
  gameSessionController.getCampaignSessions?.bind(gameSessionController);

// Routes
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
              getGameSessionsResponseSchema.openapi({
                description: 'Game sessions response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  boundGetGameSessions
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
              getGameSessionResponseSchema.openapi({
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
  boundGetGameSession
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
              createGameSessionResponseSchema.openapi({
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
  boundCreateGameSession
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
              updateGameSessionResponseSchema.openapi({
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
  boundUpdateGameSession
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
              deleteGameSessionResponseSchema.openapi({
                description: 'Delete game session response'
              })
            )
          }
        }
      }
    }
  }),
  boundDeleteGameSession
);

if (boundGetCampaignSessions) {
  router.get(
    '/campaign/:campaignId',
    authenticate,
    openApiGet(z.null(), {
      description: 'Get all game sessions for a campaign',
      responses: {
        200: {
          description: 'Campaign game sessions retrieved successfully',
          content: {
            'application/json': {
              schema: createSchema(
                getCampaignSessionsResponseSchema.openapi({
                  description: 'Campaign game sessions response'
                })
              )
            }
          }
        },
        500: { description: 'Server error' }
      }
    }),
    boundGetCampaignSessions
  );
}

export { router as gameSessionRoutes };
