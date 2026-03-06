import { Router } from 'express';
import { ChatbotController } from './controller.js';
import { BotManager } from './bot-manager.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { config } from '../../config/index.js';

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
router.post('/bots', authenticate, chatbotController.createBot.bind(chatbotController));

// Bot management routes
router.get('/bots/:botId', authenticate, chatbotController.getBot.bind(chatbotController));

router.put('/bots/:botId', authenticate, chatbotController.updateBot.bind(chatbotController));

router.delete('/bots/:botId', authenticate, chatbotController.deleteBot.bind(chatbotController));

// Bot interaction routes
router.post('/bots/:botId/chat', authenticate, chatbotController.sendMessage.bind(chatbotController));

router.post('/bots/:botId/sessions/:sessionId/clear', authenticate, chatbotController.clearSession.bind(chatbotController));

// Bot status and testing routes
router.get('/bots/:botId/health', authenticate, chatbotController.getBotHealth.bind(chatbotController));

router.get('/bots/:botId/capabilities', authenticate, chatbotController.getBotCapabilities.bind(chatbotController));

router.post('/bots/test', authenticate, chatbotController.testBot.bind(chatbotController));

// Bot listing with optional filters
router.get('/bots', authenticate, chatbotController.getBots.bind(chatbotController));

export { router as chatbotRoutes, botManager };