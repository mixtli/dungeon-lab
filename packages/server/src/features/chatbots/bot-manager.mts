import { Types } from 'mongoose';
import { logger } from '../../utils/logger.mjs';
import { ChatbotModel } from './models.mjs';
import { ChatbotService, ChatbotServiceConfig } from './service.mjs';
import {
  ChatbotConfig,
  BotRegistration,
  BotUpdateData,
  BotTestResult,
  HealthStatus,
  BotCapabilities,
  botRegistrationSchema,
  botUpdateSchema
} from '@dungeon-lab/shared/types/chatbots.mjs';

export interface BotManagerConfig extends ChatbotServiceConfig {
  healthCheckInterval: number;
  autoRegisterDefault: boolean;
  defaultBotConfig?: {
    name: string;
    description: string;
    endpointUrl: string;
    gameSystem: string;
  };
}

export class BotManager {
  private chatbotService: ChatbotService;
  private registeredBots: Map<string, ChatbotConfig> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private config: BotManagerConfig;

  constructor(config: BotManagerConfig) {
    this.config = config;
    this.chatbotService = new ChatbotService(config);
  }

  /**
   * Initialize the bot manager
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Bot Manager...');
    
    try {
      // Load existing bots from database
      await this.loadAllBots();
      
      // Start health check monitoring
      this.scheduleHealthChecks();
      
      logger.info(`Bot Manager initialized with ${this.registeredBots.size} bots`);
    } catch (error) {
      logger.error('Failed to initialize Bot Manager:', error);
      throw error;
    }
  }

  /**
   * Reload all bots from database (public method)
   */
  async reloadAllBots(): Promise<void> {
    await this.loadAllBots();
  }

  /**
   * Load all bots from database
   */
  private async loadAllBots(): Promise<void> {
    try {
      const bots = await ChatbotModel.find({ enabled: true }).exec();
      
      for (const bot of bots) {
        this.registeredBots.set(bot.id, bot);
        logger.debug(`Loaded bot: ${bot.name} (${bot.id})`);
      }
    } catch (error) {
      logger.error('Failed to load bots from database:', error);
      throw error;
    }
  }

  /**
   * Load bots for a specific campaign
   */
  async loadBotsForCampaign(campaignId: string): Promise<ChatbotConfig[]> {
    try {
      const bots = await ChatbotModel.find({ 
        campaignId: Types.ObjectId.createFromHexString(campaignId),
        enabled: true 
      }).exec();
      
      return bots;
    } catch (error) {
      logger.error(`Failed to load bots for campaign ${campaignId}:`, error);
      throw new Error('Failed to load campaign bots');
    }
  }

  /**
   * Add a bot to a campaign
   */
  async addBotToCampaign(
    campaignId: string, 
    registration: BotRegistration,
    userId: string
  ): Promise<string> {
    // Validate registration data
    const validationResult = botRegistrationSchema.safeParse(registration);
    if (!validationResult.success) {
      throw new Error(`Invalid bot registration: ${validationResult.error.message}`);
    }

    try {
      // Test connection before adding
      const testResult = await this.chatbotService.testConnection({
        ...registration,
        healthStatus: 'unknown',
        enabled: true,
        createdBy: userId
      });

      if (!testResult.success) {
        throw new Error(`Bot connection test failed: ${testResult.error}`);
      }

      // Create bot configuration
      const botData = {
        campaignId: new Types.ObjectId(campaignId),
        name: registration.name,
        description: registration.description,
        endpointUrl: registration.endpointUrl,
        apiKey: registration.apiKey,
        gameSystem: registration.gameSystem,
        enabled: true,
        healthStatus: 'unknown' as const,
        capabilities: testResult.capabilities,
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId)
      };

      const bot = await ChatbotModel.create(botData);
      const botConfig = bot.toObject() as ChatbotConfig;
      
      // Register in memory
      this.registeredBots.set(bot.id, botConfig);
      
      // Perform initial health check
      this.performHealthCheck(bot.id).catch(error => {
        logger.warn(`Initial health check failed for bot ${bot.id}:`, error);
      });

      logger.info(`Added bot ${bot.name} to campaign ${campaignId}`);
      return bot.id;
    } catch (error) {
      logger.error(`Failed to add bot to campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a bot from a campaign
   */
  async removeBotFromCampaign(campaignId: string, botId: string): Promise<void> {
    try {
      const bot = await ChatbotModel.findOneAndDelete({
        _id: new Types.ObjectId(botId),
        campaignId: new Types.ObjectId(campaignId)
      }).exec();

      if (!bot) {
        throw new Error('Bot not found or not in specified campaign');
      }

      // Remove from memory
      this.registeredBots.delete(botId);
      
      logger.info(`Removed bot ${bot.name} from campaign ${campaignId}`);
    } catch (error) {
      logger.error(`Failed to remove bot ${botId} from campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Update bot configuration
   */
  async updateBotConfig(botId: string, updateData: BotUpdateData, userId: string): Promise<void> {
    // Validate update data
    const validationResult = botUpdateSchema.safeParse(updateData);
    if (!validationResult.success) {
      throw new Error(`Invalid bot update data: ${validationResult.error.message}`);
    }

    try {
      const bot = await ChatbotModel.findById(botId).exec();
      if (!bot) {
        throw new Error('Bot not found');
      }

      // If endpoint URL changed, test the new connection
      if (updateData.endpointUrl && updateData.endpointUrl !== bot.endpointUrl) {
        const testConfig = {
          ...bot.toObject(),
          ...updateData
        };
        
        const testResult = await this.chatbotService.testConnection(testConfig);
        if (!testResult.success) {
          throw new Error(`New endpoint test failed: ${testResult.error}`);
        }
        
        // Update capabilities if available
        if (testResult.capabilities) {
          updateData = { ...updateData, capabilities: testResult.capabilities };
        }
      }

      // Update in database
      const updatedBot = await ChatbotModel.findByIdAndUpdate(
        botId,
        {
          ...updateData,
          updatedBy: new Types.ObjectId(userId),
          updatedAt: new Date()
        },
        { new: true }
      ).exec();

      if (!updatedBot) {
        throw new Error('Failed to update bot');
      }

      // Update in memory
      this.registeredBots.set(botId, updatedBot.toObject() as ChatbotConfig);
      
      logger.info(`Updated bot configuration for ${updatedBot.name}`);
    } catch (error) {
      logger.error(`Failed to update bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Test bot connection
   */
  async testBotConnection(botConfig: Omit<ChatbotConfig, 'id' | 'createdAt' | 'updatedAt' | 'lastHealthCheck'>): Promise<BotTestResult> {
    return await this.chatbotService.testConnection(botConfig);
  }

  /**
   * Get bot by ID
   */
  getBotById(botId: string): ChatbotConfig | undefined {
    return this.registeredBots.get(botId);
  }

  /**
   * Get all bots for a campaign
   */
  getBotsForCampaign(campaignId: string): ChatbotConfig[] {
    return Array.from(this.registeredBots.values())
      .filter(bot => bot.campaignId === campaignId && bot.enabled);
  }

  /**
   * Get chatbot service for making requests
   */
  getChatbotService(): ChatbotService {
    return this.chatbotService;
  }

  /**
   * Schedule periodic health checks
   */
  scheduleHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performAllHealthChecks();
    }, this.config.healthCheckInterval);

    logger.info(`Scheduled health checks every ${this.config.healthCheckInterval}ms`);
  }

  /**
   * Perform health checks on all registered bots
   */
  private async performAllHealthChecks(): Promise<void> {
    const botIds = Array.from(this.registeredBots.keys());
    
    logger.debug(`Performing health checks on ${botIds.length} bots`);
    
    const healthCheckPromises = botIds.map(botId => 
      this.performHealthCheck(botId).catch(error => {
        logger.warn(`Health check failed for bot ${botId}:`, error);
      })
    );

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Perform health check on a specific bot
   */
  async performHealthCheck(botId: string): Promise<HealthStatus> {
    const bot = this.registeredBots.get(botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    try {
      const healthStatus = await this.chatbotService.performHealthCheck(bot);
      
      // Update health status in database and memory
      const newHealthStatus = healthStatus.healthy ? 'healthy' : 'unhealthy';
      
      await ChatbotModel.findByIdAndUpdate(botId, {
        healthStatus: newHealthStatus,
        lastHealthCheck: healthStatus.timestamp
      }).exec();

      // Update in memory
      bot.healthStatus = newHealthStatus;
      bot.lastHealthCheck = healthStatus.timestamp;
      this.registeredBots.set(botId, bot);

      logger.debug(`Health check for bot ${bot.name}: ${newHealthStatus}`);
      return healthStatus;
    } catch (error) {
      logger.error(`Health check failed for bot ${botId}:`, error);
      
      // Mark as unhealthy
      await ChatbotModel.findByIdAndUpdate(botId, {
        healthStatus: 'unhealthy',
        lastHealthCheck: new Date()
      }).exec();

      if (bot) {
        bot.healthStatus = 'unhealthy';
        bot.lastHealthCheck = new Date();
        this.registeredBots.set(botId, bot);
      }

      throw error;
    }
  }

  /**
   * Get bot capabilities
   */
  async getBotCapabilities(botId: string): Promise<BotCapabilities | null> {
    const bot = this.registeredBots.get(botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    return await this.chatbotService.getBotCapabilities(bot);
  }

  /**
   * Clear session for a bot
   */
  async clearBotSession(botId: string, sessionId: string): Promise<boolean> {
    const bot = this.registeredBots.get(botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    return await this.chatbotService.clearSession(bot, sessionId);
  }

  /**
   * Check if a bot is healthy and available
   */
  isBotHealthy(botId: string): boolean {
    const bot = this.registeredBots.get(botId);
    return bot?.healthStatus === 'healthy' && bot?.enabled === true;
  }

  /**
   * Get all registered bots
   */
  getAllBots(): ChatbotConfig[] {
    return Array.from(this.registeredBots.values());
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    this.chatbotService.cleanup();
    this.registeredBots.clear();
    
    logger.info('Bot Manager cleaned up');
  }
} 