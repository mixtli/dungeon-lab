import { Router } from 'express';
import { validateRequest } from '../../../middleware/validation.middleware.mjs';
import { InviteController } from '../controllers/invite.controller.mjs';
import { InviteService } from '../services/invite.service.mjs';
import { CampaignService } from '../services/campaign.service.mjs';
import { z } from '../../../utils/zod.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import {
  baseAPIResponseSchema,
  createInviteRequestSchema,
  respondToInviteRequestSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { inviteSchema } from '@dungeon-lab/shared/schemas/invite.schema.mjs';

// Initialize services and controller
const campaignService = new CampaignService();
const inviteService = new InviteService(campaignService);
const inviteController = new InviteController(inviteService);

// Create router
const router = Router();

// Define query schema for filtering invites
const getInvitesQuerySchema = z
  .object({
    campaignId: z.string().optional(),
    status: z.enum(['pending', 'accepted', 'declined', 'expired']).optional(),
    forCurrentUser: z.enum(['true', 'false']).optional()
  })
  .openapi({ description: 'Query parameters for filtering invites' });

// Create response schemas using baseAPIResponseSchema
const getInvitesResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(inviteSchema)
});

const inviteResponseSchema = baseAPIResponseSchema.extend({
  data: inviteSchema
});

// Get all invites (with optional filters)
router.get(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Get invites with optional filters',
      requestParams: {
        query: getInvitesQuerySchema
      },
      responses: {
        200: {
          description: 'Invites retrieved successfully',
          content: {
            'application/json': {
              schema: getInvitesResponseSchema.openapi({
                description: 'Invites response'
              })
            }
          }
        },
        500: {
          description: 'Server error',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema
                .extend({
                  data: z.array(z.any()).default([]),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            }
          }
        }
      }
    })
  ),
  inviteController.getInvites
);

// Create invite
router.post(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Create a new invite for a campaign',
      requestBody: {
        content: {
          'application/json': {
            schema: createInviteRequestSchema.openapi({
              description: 'Create invite request'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Invite created successfully',
          content: {
            'application/json': {
              schema: inviteResponseSchema.openapi({
                description: 'Create invite response'
              })
            }
          }
        },
        400: {
          description: 'Invalid invite data',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            }
          }
        },
        403: {
          description: 'Only the game master can create invites',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            }
          }
        },
        404: {
          description: 'Invited user not found',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            }
          }
        },
        500: {
          description: 'Server error',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            }
          }
        }
      }
    })
  ),
  validateRequest(createInviteRequestSchema),
  inviteController.createInvite
);

// Respond to an invite
router.post(
  '/:id/respond',
  oapi.validPath(
    createPathSchema({
      description: 'Respond to an invite',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: respondToInviteRequestSchema.openapi({
              description: 'Respond to invite request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Invite response processed successfully',
          content: {
            'application/json': {
              schema: inviteResponseSchema.openapi({
                description: 'Respond to invite response'
              })
            }
          }
        },
        400: {
          description: 'Invalid response data',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            }
          }
        },
        404: {
          description: 'Invite not found or already processed',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            }
          }
        },
        500: {
          description: 'Server error',
          content: {
            'application/json': {
              schema: baseAPIResponseSchema
                .extend({
                  data: z.null(),
                  error: z.string()
                })
                .openapi({
                  description: 'Error response'
                })
            }
          }
        }
      }
    })
  ),
  validateRequest(respondToInviteRequestSchema),
  inviteController.respondToInvite
);

export default router;
