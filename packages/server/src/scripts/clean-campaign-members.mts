import mongoose from 'mongoose';
import { connectToDatabase } from '../config/database.mjs';
import { CampaignModel } from '../features/campaigns/models/campaign.model.mjs';
import { ActorModel, type ActorDocument } from '../features/actors/models/actor.model.mjs';
import { logger } from '../utils/logger.mjs';
import { config } from '../config/index.mjs';

async function cleanCampaignMembers() {
  try {
    await connectToDatabase();
    logger.info('Connected to database');

    const campaigns = await CampaignModel.find();
    logger.info(`Found ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      if (!campaign.members || campaign.members.length === 0) continue;

      const memberIds = campaign.members.map(id => new mongoose.Types.ObjectId(id));
      const existingActors = await ActorModel.find({ _id: { $in: memberIds } }) as mongoose.Document[];
      const existingActorIds = new Set(existingActors.map(actor => actor.get('_id').toString()));

      const nonExistentMembers = campaign.members.filter(id => !existingActorIds.has(id.toString()));

      if (nonExistentMembers.length > 0) {
        logger.info(`Campaign ${campaign.name} (${campaign._id}) has ${nonExistentMembers.length} non-existent members`);
        
        const updatedMembers = campaign.members.filter(id => existingActorIds.has(id.toString()));
        await CampaignModel.updateOne(
          { _id: campaign._id },
          { $set: { members: updatedMembers } }
        );
        
        logger.info(`Updated campaign ${campaign.name} (${campaign._id}): removed ${nonExistentMembers.length} non-existent members`);
      }
    }

    logger.info('Finished cleaning campaign members');
    process.exit(0);
  } catch (error) {
    logger.error('Error cleaning campaign members:', error);
    process.exit(1);
  }
}

cleanCampaignMembers(); 