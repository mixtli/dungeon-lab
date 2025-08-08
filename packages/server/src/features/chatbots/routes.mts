import { Router } from 'express';
import { ChatbotController } from './controller.mjs';
import { BotManager } from './bot-manager.mjs';
import { authenticate } from '../../middleware/auth.middleware.mjs';
import { createPathSchema, oapi } from '../../oapi.mjs';
import { z } from '../../utils/zod.mjs';
import { config } from '../../config/index.mjs';
import {
  chatbotConfigSchema,
  botRegistrationSchema,
  botUpdateSchema,
  chatRequestSchema,
  chatResponseSchema,
  botCapabilitiesSchema
} from '@dungeon-lab/shared/types/chatbots.mjs';

// Create bot manager instance with configuration from environment
const botManagerConfig = {
  ...config.chatbots,
  autoRegisterDefault: false
};

const botManager = new BotManager(botManagerConfig);
const chatbotController = new ChatbotController(botManager);

// Note: Bot manager initialization is now handled in the main server startup
// after MongoDB connection is established

const router = Router();

// Bot creation and management routes
router.post('/bots',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Create a new bot',
      requestBody: {
        content: {
          'application/json': {
            schema: botRegistrationSchema.openapi({
              description: 'Bot registration data'
            })
          }
        }
      },
      responses: {
        201: {
          description: 'Bot successfully created',
          content: {
            'application/json': {
              schema: chatbotConfigSchema.openapi({
                description: 'Created bot configuration'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.createBot.bind(chatbotController)
);

// Bot management routes
router.get('/bots/:botId',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get bot details',
      requestParams: {
        path: z.object({ botId: z.string() })
      },
      responses: {
        200: {
          description: 'Bot details',
          content: {
            'application/json': {
              schema: chatbotConfigSchema.openapi({
                description: 'Bot configuration'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.getBot.bind(chatbotController)
);

router.put('/bots/:botId',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Update bot configuration',
      requestParams: {
        path: z.object({ botId: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: botUpdateSchema.openapi({
              description: 'Bot update data'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Bot successfully updated',
          content: {
            'application/json': {
              schema: chatbotConfigSchema.openapi({
                description: 'Updated bot configuration'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.updateBot.bind(chatbotController)
);

router.delete('/bots/:botId',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Delete a bot',
      requestParams: {
        path: z.object({ botId: z.string() })
      },
      responses: {
        204: { description: 'Bot successfully deleted' }
      }
    })
  ),
  chatbotController.deleteBot.bind(chatbotController)
);

// Bot interaction routes
router.post('/bots/:botId/chat',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Send message to bot',
      requestParams: {
        path: z.object({ botId: z.string() })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: chatRequestSchema.openapi({
              description: 'Chat request'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Chat response from bot',
          content: {
            'application/json': {
              schema: chatResponseSchema.openapi({
                description: 'Chat response'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.sendMessage.bind(chatbotController)
);

router.post('/bots/:botId/sessions/:sessionId/clear',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Clear bot session',
      requestParams: {
        path: z.object({ 
          botId: z.string(),
          sessionId: z.string()
        })
      },
      responses: {
        200: {
          description: 'Session clear result',
          content: {
            'application/json': {
              schema: z.object({
                success: z.boolean()
              }).openapi({
                description: 'Clear session result'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.clearSession.bind(chatbotController)
);

// Bot status and testing routes
router.get('/bots/:botId/health',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get bot health status',
      requestParams: {
        path: z.object({ botId: z.string() })
      },
      responses: {
        200: {
          description: 'Bot health status',
          content: {
            'application/json': {
              schema: z.object({
                healthy: z.boolean(),
                timestamp: z.date(),
                responseTime: z.number(),
                error: z.string().optional()
              }).openapi({
                description: 'Health status'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.getBotHealth.bind(chatbotController)
);

router.get('/bots/:botId/capabilities',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get bot capabilities',
      requestParams: {
        path: z.object({ botId: z.string() })
      },
      responses: {
        200: {
          description: 'Bot capabilities',
          content: {
            'application/json': {
              schema: botCapabilitiesSchema.openapi({
                description: 'Bot capabilities'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.getBotCapabilities.bind(chatbotController)
);

router.post('/bots/test',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Test bot connection',
      requestBody: {
        content: {
          'application/json': {
            schema: z.object({
              name: z.string(),
              description: z.string(),
              endpointUrl: z.string().url(),
              apiKey: z.string().optional(),
              gameSystem: z.string(),
              enabled: z.boolean(),
              healthStatus: z.enum(['healthy', 'unhealthy', 'unknown']),
              createdBy: z.string()
            }).openapi({
              description: 'Bot configuration to test'
            })
          }
        }
      },
      responses: {
        200: {
          description: 'Bot test result',
          content: {
            'application/json': {
              schema: z.object({
                success: z.boolean(),
                responseTime: z.number(),
                capabilities: botCapabilitiesSchema.optional(),
                error: z.string().optional()
              }).openapi({
                description: 'Test result'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.testBot.bind(chatbotController)
);

// Bot listing with optional filters
router.get('/bots',
  authenticate,
  oapi.validPath(
    createPathSchema({
      description: 'Get bots with optional filters',
      requestParams: {
        query: z.object({
          campaignId: z.string().optional(),
          gameSystem: z.string().optional(),
          enabled: z.boolean().optional(),
          healthStatus: z.enum(['healthy', 'unhealthy', 'unknown']).optional()
        })
      },
      responses: {
        200: {
          description: 'List of bots matching filters',
          content: {
            'application/json': {
              schema: z.array(chatbotConfigSchema).openapi({
                description: 'Filtered bots'
              })
            }
          }
        }
      }
    })
  ),
  chatbotController.getBots.bind(chatbotController)
);

export { router as chatbotRoutes, botManager }; 