import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import {
  openApiGet,
  openApiGetOne,
  openApiPost,
  openApiPut,
  openApiDelete,
  openApiPatch,
  toQuerySchema
} from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import { createSchema } from 'zod-openapi';
import {
  searchCampaignsQuerySchema,
  deleteAPIResponseSchema,
  baseAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { campaignSchema } from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
import {
  campaignCreateSchema,
  campaignPatchSchema
} from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
import { gameSessionSchema } from '@dungeon-lab/shared/schemas/game-session.schema.mjs';
import { encounterSchema } from '@dungeon-lab/shared/schemas/encounter.schema.mjs';

// Initialize services and controllers
const campaignController = new CampaignController();

// Create router
const router = Router();

// Campaign routes
router.get(
  '/',
  authenticate,
  openApiGet(searchCampaignsQuerySchema, {
    description:
      'Get all campaigns for the authenticated user with optional filtering by query parameters',
    parameters: toQuerySchema(searchCampaignsQuerySchema),
    responses: {
      200: {
        description: 'Campaigns retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.array(campaignSchema) }).openapi({
                description: 'Campaigns response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  campaignController.getMyCampaigns
);

router.get(
  '/:id',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get campaign by ID',
    responses: {
      200: {
        description: 'Campaign retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: campaignSchema }).openapi({
                description: 'Campaign response'
              })
            )
          }
        }
      },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  campaignController.getCampaign
);

router.post(
  '/',
  authenticate,
  openApiPost(campaignCreateSchema, {
    description: 'Create a new campaign',
    responses: {
      201: {
        description: 'Campaign created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: campaignSchema }).openapi({
                description: 'Create campaign response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid campaign data' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(campaignCreateSchema),
  campaignController.createCampaign
);

router.put(
  '/:id',
  authenticate,
  openApiPut(campaignCreateSchema, {
    description: 'Replace a campaign by ID (full update)',
    responses: {
      200: {
        description: 'Campaign updated successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: campaignSchema }).openapi({
                description: 'Update campaign response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid campaign data' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(campaignCreateSchema),
  campaignController.putCampaign
);

router.patch(
  '/:id',
  authenticate,
  openApiPatch(campaignPatchSchema, {
    description: 'Update a campaign by ID (partial update)',
    responses: {
      200: {
        description: 'Campaign patched successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: campaignSchema }).openapi({
                description: 'Patch campaign response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid campaign data' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  validateRequest(campaignPatchSchema),
  campaignController.patchCampaign
);

router.delete(
  '/:id',
  authenticate,
  openApiDelete(z.null(), {
    description: 'Delete a campaign by ID',
    responses: {
      204: { description: 'Campaign deleted successfully' },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              deleteAPIResponseSchema.openapi({}).openapi({
                description: 'Delete campaign response'
              })
            )
          }
        }
      }
    }
  }),
  campaignController.deleteCampaign
);

// Active session and encounter routes
router.get(
  '/:campaignId/active-session',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get the active game session for a campaign',
    responses: {
      200: {
        description: 'Active session retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: gameSessionSchema }).openapi({
                description: 'Active session response'
              })
            )
          }
        }
      },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  campaignController.getActiveCampaignSession
);

router.get(
  '/:campaignId/active-encounter',
  authenticate,
  openApiGetOne(z.null(), {
    description: 'Get the active encounter for a campaign',
    responses: {
      200: {
        description: 'Active encounter retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: encounterSchema }).openapi({
                description: 'Active encounter response'
              })
            )
          }
        }
      },
      403: { description: 'Forbidden - Access denied' },
      404: { description: 'Campaign not found' },
      500: { description: 'Server error' }
    }
  }),
  campaignController.getActiveCampaignEncounter
);

export { router as campaignRoutes };
