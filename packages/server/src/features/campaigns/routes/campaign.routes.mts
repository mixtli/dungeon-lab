import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import {
  searchCampaignsQuerySchema,
  deleteAPIResponseSchema,
  baseAPIResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import {
  campaignSchema,
  campaignCreateSchema,
  campaignPatchSchema,
  gameSessionSchema,
  encounterSchema
} from '@dungeon-lab/shared/schemas/index.mjs';

// Initialize services and controllers
const campaignController = new CampaignController();

// Create router
const router = Router();

// Create response schemas using baseAPIResponseSchema
const getCampaignsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(campaignSchema)
});

const getCampaignResponseSchema = baseAPIResponseSchema.extend({
  data: campaignSchema
});

const gameSessionResponseSchema = baseAPIResponseSchema.extend({
  data: gameSessionSchema
});

const encounterResponseSchema = baseAPIResponseSchema.extend({
  data: encounterSchema
});

// Campaign routes
router.get(
  '/',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description:
        'Get all campaigns for the authenticated user with optional filtering by query parameters',
      requestParams: {
        query: searchCampaignsQuerySchema
      },
      responses: {
        200: {
          description: 'Campaigns retrieved successfully',
          content: {
            'application/json': {
              schema: getCampaignsResponseSchema.openapi({
                description: 'Campaigns response'
              })
            }
          }
        }
      }
    })
  ),
  campaignController.getMyCampaigns
);

router.get(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get campaign by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Campaign retrieved successfully',
          content: {
            'application/json': {
              schema: getCampaignResponseSchema.openapi({
                description: 'Campaign response'
              })
            }
          }
        }
      }
    })
  ),
  campaignController.getCampaign
);

router.post(
  '/',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Create a new campaign',
      requestBody: {
        content: {
          'application/json': {
            schema: campaignCreateSchema.openapi({
              description: 'Create campaign request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Campaign created successfully',
          content: {
            'application/json': {
              schema: getCampaignResponseSchema.openapi({
                description: 'Create campaign response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(campaignCreateSchema),
  campaignController.createCampaign
);

router.put(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Replace a campaign by ID (full update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: campaignCreateSchema.openapi({
              description: 'Update campaign request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Campaign updated successfully',
          content: {
            'application/json': {
              schema: getCampaignResponseSchema.openapi({
                description: 'Update campaign response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(campaignCreateSchema),
  campaignController.putCampaign
);

router.patch(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Update a campaign by ID (partial update)',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: campaignPatchSchema.openapi({
              description: 'Patch campaign request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Campaign patched successfully',
          content: {
            'application/json': {
              schema: getCampaignResponseSchema.openapi({
                description: 'Patch campaign response'
              })
            }
          }
        }
      }
    })
  ),
  validateRequest(campaignPatchSchema),
  campaignController.patchCampaign
);

router.delete(
  '/:id',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Delete a campaign by ID',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Campaign deleted successfully',
          content: {
            'application/json': {
              schema: deleteAPIResponseSchema.openapi({
                description: 'Delete campaign response'
              })
            }
          }
        }
      }
    })
  ),
  campaignController.deleteCampaign
);

// Active session and encounter routes
router.get(
  '/:campaignId/active-session',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get the active game session for a campaign',
      requestParams: {
        path: z.object({ campaignId: z.string() })
      },
      responses: {
        200: {
          description: 'Active session retrieved successfully',
          content: {
            'application/json': {
              schema: gameSessionResponseSchema.openapi({
                description: 'Active session response'
              })
            }
          }
        }
      }
    })
  ),
  campaignController.getActiveCampaignSession
);

router.get(
  '/:campaignId/active-encounter',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get the active encounter for a campaign',
      requestParams: {
        path: z.object({ campaignId: z.string() })
      },
      responses: {
        200: {
          description: 'Active encounter retrieved successfully',
          content: {
            'application/json': {
              schema: encounterResponseSchema.openapi({
                description: 'Active encounter response'
              })
            }
          }
        }
      }
    })
  ),
  campaignController.getActiveCampaignEncounter
);

export { router as campaignRoutes };
