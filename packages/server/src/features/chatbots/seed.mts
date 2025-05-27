import { logger } from '../../utils/logger.mjs';
import { ChatbotModel } from './models.mjs';
import { BotCapabilities } from '@dungeon-lab/shared/types/chatbots.mjs';
import { Types } from 'mongoose';

/**
 * Default D&D 5e bot configuration
 */
const defaultDnd5eBot = {
  name: 'D&D 5e Assistant',
  description: 'AI assistant for D&D 5th Edition rules, spells, and gameplay guidance',
  endpointUrl: process.env.DND5E_BOT_URL || 'http://localhost:8000',
  gameSystem: 'dnd5e',
  enabled: true,
  healthStatus: 'unknown' as const,
  capabilities: {
    name: 'D&D 5e Assistant',
    description: 'Provides D&D 5th Edition rules assistance and gameplay guidance',
    version: '1.0.0',
    gameSystem: ['dnd5e'],
    features: {
      conversationMemory: true,
      sourceCitations: true,
      streamingResponses: false
    },
    supportedLanguages: ['en'],
    maxSessionDuration: 3600, // 1 hour
    rateLimits: {
      requestsPerMinute: 60,
      concurrentSessions: 100
    }
  } as BotCapabilities
};

/**
 * Seed default chatbot configurations
 */
export async function seedDefaultChatbots(): Promise<void> {
  try {
    // Check if default D&D 5e bot already exists
    const existingBot = await ChatbotModel.findOne({
      name: defaultDnd5eBot.name,
      gameSystem: defaultDnd5eBot.gameSystem
    }).exec();

    if (existingBot) {
      logger.info('Default D&D 5e bot already exists, skipping seed');
      return;
    }

    logger.info('Seeding default D&D 5e bot configuration...');

    // Note: This creates a "global" bot without a specific campaign
    // In practice, bots should be associated with campaigns
    // This is just for demonstration/testing purposes
    const seedBot = new ChatbotModel({
      ...defaultDnd5eBot,
      // Use a placeholder campaign ID - in real usage, this should be a valid campaign
      campaignId: new Types.ObjectId('000000000000000000000000'),
      // Use a placeholder user ID - in real usage, this should be a valid user
      createdBy: new Types.ObjectId('000000000000000000000000'),
      updatedBy: new Types.ObjectId('000000000000000000000000'),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await seedBot.save();
    logger.info(`Successfully seeded default D&D 5e bot: ${seedBot._id}`);
  } catch (error) {
    logger.error('Failed to seed default chatbots:', error);
    throw error;
  }
}

/**
 * Create a default D&D 5e bot for a specific campaign
 */
export async function createDefaultBotForCampaign(
  campaignId: string,
  createdBy: string
): Promise<string> {
  try {
    // Check if bot already exists for this campaign
    const existingBot = await ChatbotModel.findOne({
      campaignId: new Types.ObjectId(campaignId),
      gameSystem: defaultDnd5eBot.gameSystem
    }).exec();

    if (existingBot) {
      logger.info(`D&D 5e bot already exists for campaign ${campaignId}`);
      return existingBot._id.toString();
    }

    logger.info(`Creating default D&D 5e bot for campaign ${campaignId}...`);

    const newBot = new ChatbotModel({
      ...defaultDnd5eBot,
      campaignId: new Types.ObjectId(campaignId),
      createdBy: new Types.ObjectId(createdBy),
      updatedBy: new Types.ObjectId(createdBy),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newBot.save();
    logger.info(`Successfully created D&D 5e bot for campaign ${campaignId}: ${newBot._id}`);
    
    return newBot._id.toString();
  } catch (error) {
    logger.error(`Failed to create default bot for campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Remove seed data (for testing/cleanup)
 */
export async function removeSeedChatbots(): Promise<void> {
  try {
    const result = await ChatbotModel.deleteMany({
      name: defaultDnd5eBot.name,
      gameSystem: defaultDnd5eBot.gameSystem
    }).exec();

    logger.info(`Removed ${result.deletedCount} seed chatbot(s)`);
  } catch (error) {
    logger.error('Failed to remove seed chatbots:', error);
    throw error;
  }
} 