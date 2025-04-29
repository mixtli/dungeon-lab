import { Router } from 'express';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { InviteController } from '../controllers/invite.controller.mjs';
import { InviteService } from '../services/invite.service.mjs';
import { CampaignService } from '../services/campaign.service.mjs';
import { z } from '../../../utils/zod.mjs';
import { openApiGet, openApiPost } from '../../../oapi.mjs';
import { createSchema } from 'zod-openapi';
import {
  getCampaignInvitesResponseSchema,
  getMyInvitesResponseSchema,
  createInviteRequestSchema,
  createInviteResponseSchema,
  respondToInviteRequestSchema,
  respondToInviteResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';

// Initialize services and controller
const campaignService = new CampaignService();
const inviteService = new InviteService(campaignService);
const inviteController = new InviteController(inviteService);

// Create router
const router = Router();

// Bind controller methods to maintain correct 'this' context
const getInvites = inviteController.getInvites.bind(inviteController);
const getMyInvites = inviteController.getMyInvites.bind(inviteController);
const createInvite = inviteController.createInvite.bind(inviteController);
const respondToInvite = inviteController.respondToInvite.bind(inviteController);

// Get invites for a campaign
router.get(
  '/campaign/:campaignId/invites',
  openApiGet(createInviteRequestSchema, {
    description: 'Get all invites for a campaign',
    responses: {
      200: {
        description: 'Invites retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              getCampaignInvitesResponseSchema.openapi({
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
              z
                .object({
                  success: z.boolean().default(false),
                  data: z.array(createInviteRequestSchema).default([]),
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
  getInvites
);

// Get invites for the current user
router.get(
  '/my-invites',
  openApiGet(createInviteRequestSchema, {
    description: 'Get all invites for the current user',
    responses: {
      200: {
        description: 'User invites retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              getMyInvitesResponseSchema.openapi({
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
              z
                .object({
                  success: z.boolean().default(false),
                  data: z.array(createInviteRequestSchema).default([]),
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
  getMyInvites
);

// Create invite
router.post(
  '/campaign/:campaignId/invites',
  openApiPost(createInviteRequestSchema, {
    description: 'Create a new invite for a campaign',
    responses: {
      201: {
        description: 'Invite created successfully',
        content: {
          'application/json': {
            schema: createSchema(
              createInviteResponseSchema.openapi({
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
              z
                .object({
                  success: z.boolean().default(false),
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
              z
                .object({
                  success: z.boolean().default(false),
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
              z
                .object({
                  success: z.boolean().default(false),
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
              z
                .object({
                  success: z.boolean().default(false),
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
  createInvite
);

// Respond to an invite
router.post(
  '/invites/:id/respond',
  openApiPost(respondToInviteRequestSchema, {
    description: 'Respond to an invite',
    responses: {
      200: {
        description: 'Invite response processed successfully',
        content: {
          'application/json': {
            schema: createSchema(
              respondToInviteResponseSchema.openapi({
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
              z
                .object({
                  success: z.boolean().default(false),
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
              z
                .object({
                  success: z.boolean().default(false),
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
              z
                .object({
                  success: z.boolean().default(false),
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
  respondToInvite
);

export default router;
