import express from 'express';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import { baseAPIResponseSchema } from '@dungeon-lab/shared/types/api/base.mjs';
import { CharacterService } from '../services/character.service.mjs';

const router = express.Router();
const characterService = new CharacterService();

// Apply authentication middleware to all character routes
router.use(authenticate);

const generateImageResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({
    message: z.string(),
    characterId: z.string(),
    imageType: z.string()
  })
});

const generateImageRequestSchema = z.object({
  imageType: z.enum(['avatar', 'token']),
  customPrompt: z.string().optional()
});

const joinCampaignRequestSchema = z.object({
  campaignId: z.string()
});

const joinCampaignResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({
    message: z.string(),
    characterId: z.string(),
    campaignId: z.string()
  })
});

const removeCampaignResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({
    message: z.string(),
    characterId: z.string()
  })
});

// Generate character image
router.post(
  '/:id/generate-image',
  oapi.validPath(
    createPathSchema({
      description: 'Generate AI image for character',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: generateImageRequestSchema.openapi({
              description: 'Generate image request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Image generation scheduled successfully',
          content: {
            'application/json': {
              schema: generateImageResponseSchema.openapi({
                description: 'Generate image response'
              })
            }
          }
        }
      }
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { imageType, customPrompt } = req.body;
      const userId = req.session.user!.id;

      await characterService.scheduleImageGeneration(id, imageType, userId, customPrompt);

      res.json({
        success: true,
        data: {
          message: `${imageType} generation scheduled`,
          characterId: id,
          imageType
        }
      });
    } catch (error) {
      console.error('Error scheduling character image generation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to schedule image generation'
      });
    }
  }
);

// Generate character avatar (convenience endpoint)
router.post(
  '/:id/generate-avatar',
  oapi.validPath(
    createPathSchema({
      description: 'Generate AI avatar for character',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              customPrompt: z.string().optional()
            }).openapi({
              description: 'Generate avatar request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Avatar generation scheduled successfully',
          content: {
            'application/json': {
              schema: generateImageResponseSchema.openapi({
                description: 'Generate avatar response'
              })
            }
          }
        }
      }
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { customPrompt } = req.body || {};
      const userId = req.session.user!.id;

      await characterService.scheduleImageGeneration(id, 'avatar', userId, customPrompt);

      res.json({
        success: true,
        data: {
          message: 'Avatar generation scheduled',
          characterId: id,
          imageType: 'avatar'
        }
      });
    } catch (error) {
      console.error('Error scheduling character avatar generation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to schedule avatar generation'
      });
    }
  }
);

// Generate character token (convenience endpoint)
router.post(
  '/:id/generate-token',
  oapi.validPath(
    createPathSchema({
      description: 'Generate AI token for character',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              customPrompt: z.string().optional()
            }).openapi({
              description: 'Generate token request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Token generation scheduled successfully',
          content: {
            'application/json': {
              schema: generateImageResponseSchema.openapi({
                description: 'Generate token response'
              })
            }
          }
        }
      }
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { customPrompt } = req.body || {};
      const userId = req.session.user!.id;

      await characterService.scheduleImageGeneration(id, 'token', userId, customPrompt);

      res.json({
        success: true,
        data: {
          message: 'Token generation scheduled',
          characterId: id,
          imageType: 'token'
        }
      });
    } catch (error) {
      console.error('Error scheduling character token generation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to schedule token generation'
      });
    }
  }
);

// Add character to campaign
router.put(
  '/:id/campaign',
  oapi.validPath(
    createPathSchema({
      description: 'Add character to campaign',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: joinCampaignRequestSchema.openapi({
              description: 'Join campaign request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Character added to campaign successfully',
          content: {
            'application/json': {
              schema: joinCampaignResponseSchema.openapi({
                description: 'Join campaign response'
              })
            }
          }
        }
      }
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { campaignId } = req.body;
      const userId = req.session.user!.id;

      await characterService.joinCampaign(id, campaignId, userId);

      res.json({
        success: true,
        data: {
          message: 'Character added to campaign',
          characterId: id,
          campaignId
        }
      });
    } catch (error) {
      console.error('Error adding character to campaign:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add character to campaign'
      });
    }
  }
);

// Remove character from campaign
router.delete(
  '/:id/campaign',
  oapi.validPath(
    createPathSchema({
      description: 'Remove character from campaign',
      requestParams: {
        path: z.object({ id: z.string() })
      },
      responses: {
        200: {
          description: 'Character removed from campaign successfully',
          content: {
            'application/json': {
              schema: removeCampaignResponseSchema.openapi({
                description: 'Remove campaign response'
              })
            }
          }
        }
      }
    })
  ),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user!.id;

      await characterService.leaveCampaign(id, userId);

      res.json({
        success: true,
        data: {
          message: 'Character removed from campaign',
          characterId: id
        }
      });
    } catch (error) {
      console.error('Error removing character from campaign:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove character from campaign'
      });
    }
  }
);

export default router;