import mongoose from 'mongoose';
import { logger } from '../utils/logger.mjs';

async function cleanCampaignMembers() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info('Connected to database');

    // This script is obsolete since characterIds were removed from campaign schema
    // Campaign membership is now managed via campaignId field on character documents
    logger.info('Campaign cleanup script is obsolete - characterIds removed from campaign schema');
    logger.info('Campaign membership now managed via campaignId field on character documents');
    
    logger.info('Finished cleaning campaign members');
    process.exit(0);
  } catch (error) {
    logger.error('Error cleaning campaign members:', error);
    process.exit(1);
  }
}

cleanCampaignMembers();
