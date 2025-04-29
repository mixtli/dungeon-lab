import { Router } from 'express';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { InviteController } from '../controllers/invite.controller.mjs';
import { InviteService } from '../services/invite.service.mjs';
import { CampaignService } from '../services/campaign.service.mjs';
import { z } from '../../../utils/zod.mjs';
import { openApiGet, openApiPost, toQuerySchema } from '../../../oapi.mjs';
import { createSchema } from 'zod-openapi';
import {
  baseAPIResponseSchema,
  createInviteRequestSchema,
  respondToInviteRequestSchema
} from '@dungeon-lab/shared/types/api/index.mjs';

// Initialize services and controller
const campaignService = new CampaignService();
const inviteService = new InviteService(campaignService);
const inviteController = new InviteController(inviteService);

// Create router
const router = Router();

// Define query schema for filtering invites
const getInvitesQuerySchema = z
  .object({
    campaignId: z.string().optional()
  })
  .openapi({ description: 'Query parameters for filtering invites' });

// Get all invites (with optional campaign filter)
router.get(
  '/',
  openApiGet(getInvitesQuerySchema, {
    description: 'Get all invites, optionally filtered by campaign',
    parameters: toQuerySchema(getInvitesQuerySchema),
    responses: {
      200: {
        description: 'Invites retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.array(z.any())
                })
                .openapi({
                  description: 'Invites response'
                })
            )
          }
        }
      },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.array(z.any()).default([]),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      }
    }
  }),
  inviteController.getInvites
);

// Get invites for the current user
router.get(
  '/me',
  openApiGet(getInvitesQuerySchema, {
    description: 'Get all invites for the current user',
    parameters: toQuerySchema(getInvitesQuerySchema),
    responses: {
      200: {
        description: 'User invites retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.array(z.any())
                })
                .openapi({
                  description: 'User invites response'
                })
            )
          }
        }
      },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.array(z.any()).default([]),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      }
    }
  }),
  inviteController.getMyInvites
);

// Create invite
router.post(
  '/',
  openApiPost(createInviteRequestSchema, {
    description: 'Create a new invite for a campaign',
    responses: {
      201: {
        description: 'Invite created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.any()
                })
                .openapi({
                  description: 'Create invite response'
                })
            )
          }
        }
      },
      400: {
        description: 'Invalid invite data',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      },
      403: {
        description: 'Only the game master can create invites',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      },
      404: {
        description: 'Invited user not found',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      }
    }
  }),
  validateRequest(createInviteRequestSchema),
  inviteController.createInvite
);

// Respond to an invite
router.post(
  '/:id/respond',
  openApiPost(respondToInviteRequestSchema, {
    description: 'Respond to an invite',
    responses: {
      200: {
        description: 'Invite response processed successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.any()
                })
                .openapi({
                  description: 'Respond to invite response'
                })
            )
          }
        }
      },
      400: {
        description: 'Invalid response data',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      },
      404: {
        description: 'Invite not found or already processed',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      },
      500: {
        description: 'Server error',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            )
          }
        }
      }
    }
  }),
  validateRequest(respondToInviteRequestSchema),
  inviteController.respondToInvite
);

export default router;
