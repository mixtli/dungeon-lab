import { Request, Response } from 'express';
import { logger } from '../../utils/logger.mjs';
import { BotManager } from './bot-manager.mjs';
import {
  BotRegistration,
  BotUpdateData,
  ChatRequest,
  botRegistrationSchema,
  botUpdateSchema,
  chatRequestSchema
} from '@dungeon-lab/shared/types/chatbots.mjs';

export class ChatbotController {
  constructor(private botManager: BotManager) {}

  /**
   * Get bots with optional filters
   */
  async getBots(req: Request, res: Response): Promise<void> {
    try {
      const { campaignId, gameSystem, enabled, healthStatus } = req.query;
      
      let bots;
      
      if (campaignId) {
        // Filter by campaign
        bots = await this.botManager.loadBotsForCampaign(campaignId as string);
      } else {
        // Get all bots (admin check)
        const user = req.session.user;
        if (!user?.isAdmin) {
          res.status(403).json({ error: 'Admin access required to view all bots' });
          return;
        }
        bots = this.botManager.getAllBots();
      }

      // Apply additional filters
      if (gameSystem) {
        bots = bots.filter(bot => bot.gameSystem === gameSystem);
      }
      
      if (enabled !== undefined) {
        const enabledFilter = enabled === 'true';
        bots = bots.filter(bot => bot.enabled === enabledFilter);
      }
      
      if (healthStatus) {
        bots = bots.filter(bot => bot.healthStatus === healthStatus);
      }

      res.json(bots);
    } catch (error) {
      logger.error('Error getting bots:', error);
      res.status(500).json({ error: 'Failed to get bots' });
    }
  }

  /**
   * Get a specific bot by ID
   */
  async getBot(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      
      if (!botId) {
        res.status(400).json({ error: 'Bot ID is required' });
        return;
      }

      const bot = this.botManager.getBotById(botId);
      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      res.json(bot);
    } catch (error) {
      logger.error('Error getting bot:', error);
      res.status(500).json({ error: 'Failed to get bot' });
    }
  }

  /**
   * Create a new bot
   */
  async createBot(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.session.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Validate request body
      const validationResult = botRegistrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({ 
          error: 'Invalid bot registration data',
          details: validationResult.error.errors
        });
        return;
      }

      const registration: BotRegistration = validationResult.data;

      // campaignId should be in the request body now
      if (!registration.campaignId) {
        res.status(400).json({ error: 'Campaign ID is required in request body' });
        return;
      }

      const botId = await this.botManager.addBotToCampaign(registration.campaignId, registration, userId);
      const bot = this.botManager.getBotById(botId);

      res.status(201).json(bot);
    } catch (error) {
      logger.error('Error creating bot:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create bot' });
    }
  }

  /**
   * Update a bot configuration
   */
  async updateBot(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const userId = req.session.user?.id;

      if (!botId) {
        res.status(400).json({ error: 'Bot ID is required' });
        return;
      }

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Validate request body
      const validationResult = botUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({ 
          error: 'Invalid bot update data',
          details: validationResult.error.errors
        });
        return;
      }

      const updateData: BotUpdateData = validationResult.data;
      await this.botManager.updateBotConfig(botId, updateData, userId);
      
      const updatedBot = this.botManager.getBotById(botId);
      res.json(updatedBot);
    } catch (error) {
      logger.error('Error updating bot:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update bot' });
    }
  }

  /**
   * Delete a bot
   */
  async deleteBot(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const userId = req.session.user?.id;

      if (!botId) {
        res.status(400).json({ error: 'Bot ID is required' });
        return;
      }

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Get the bot to check if it exists and get its campaign
      const bot = this.botManager.getBotById(botId);
      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      await this.botManager.removeBotFromCampaign(bot.campaignId, botId);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting bot:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete bot' });
    }
  }

  /**
   * Test bot connection
   */
  async testBot(req: Request, res: Response): Promise<void> {
    try {
      const botConfig = req.body;
      
      if (!botConfig) {
        res.status(400).json({ error: 'Bot configuration is required' });
        return;
      }

      const testResult = await this.botManager.testBotConnection(botConfig);
      res.json(testResult);
    } catch (error) {
      logger.error('Error testing bot:', error);
      res.status(500).json({ error: 'Failed to test bot connection' });
    }
  }

  /**
   * Get bot health status
   */
  async getBotHealth(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      
      if (!botId) {
        res.status(400).json({ error: 'Bot ID is required' });
        return;
      }

      const healthStatus = await this.botManager.performHealthCheck(botId);
      res.json(healthStatus);
    } catch (error) {
      logger.error('Error getting bot health:', error);
      res.status(500).json({ error: 'Failed to get bot health status' });
    }
  }

  /**
   * Get bot capabilities
   */
  async getBotCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      
      if (!botId) {
        res.status(400).json({ error: 'Bot ID is required' });
        return;
      }

      const capabilities = await this.botManager.getBotCapabilities(botId);
      if (!capabilities) {
        res.status(404).json({ error: 'Bot capabilities not available' });
        return;
      }

      res.json(capabilities);
    } catch (error) {
      logger.error('Error getting bot capabilities:', error);
      res.status(500).json({ error: 'Failed to get bot capabilities' });
    }
  }

  /**
   * Send message to a bot
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const userId = req.session.user?.id;

      if (!botId) {
        res.status(400).json({ error: 'Bot ID is required' });
        return;
      }

      // Validate request body
      const validationResult = chatRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({ 
          error: 'Invalid chat request',
          details: validationResult.error.errors
        });
        return;
      }

      const bot = this.botManager.getBotById(botId);
      if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }

      if (!this.botManager.isBotHealthy(botId)) {
        res.status(503).json({ error: 'Bot is not available' });
        return;
      }

      const chatRequest: ChatRequest = {
        ...validationResult.data,
        userId
      };

      const chatbotService = this.botManager.getChatbotService();
      const response = await chatbotService.sendMessage(bot, chatRequest);

      res.json(response);
    } catch (error) {
      logger.error('Error sending message to bot:', error);
      res.status(500).json({ error: 'Failed to send message to bot' });
    }
  }

  /**
   * Clear bot session
   */
  async clearSession(req: Request, res: Response): Promise<void> {
    try {
      const { botId, sessionId } = req.params;

      if (!botId || !sessionId) {
        res.status(400).json({ error: 'Bot ID and Session ID are required' });
        return;
      }

      const success = await this.botManager.clearBotSession(botId, sessionId);
      res.json({ success });
    } catch (error) {
      logger.error('Error clearing bot session:', error);
      res.status(500).json({ error: 'Failed to clear bot session' });
    }
  }

  /**
   * Get all bots (admin only)
   */
  async getAllBots(req: Request, res: Response): Promise<void> {
    try {
      const user = req.session.user;
      
      if (!user?.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const bots = this.botManager.getAllBots();
      res.json(bots);
    } catch (error) {
      logger.error('Error getting all bots:', error);
      res.status(500).json({ error: 'Failed to get all bots' });
    }
  }
} 