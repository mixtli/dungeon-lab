import mongoose from 'mongoose';
import { DocumentModel } from '../features/documents/models/document.model.mjs';
import { CampaignModel } from '../features/campaigns/models/campaign.model.mjs';
import { logger } from '../utils/logger.mjs';

async function cleanCampaignMembers() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info('Connected to database');

    const campaigns = await CampaignModel.find();
    logger.info(`Found ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      if (!campaign.characterIds || campaign.characterIds.length === 0) continue;

      const characterIds = campaign.characterIds.map(
        (id: string | mongoose.Types.ObjectId) => new mongoose.Types.ObjectId(id)
      );
      const existingActors = (await DocumentModel.find({
        documentType: 'actor',
        _id: { $in: characterIds }
      })) as mongoose.Document[];
      const existingActorIds = new Set(existingActors.map((actor) => actor.get('_id').toString()));

      const nonExistentMembers = campaign.characterIds.filter(
        (id: string | mongoose.Types.ObjectId) => !existingActorIds.has(id.toString())
      );

      if (nonExistentMembers.length > 0) {
        logger.info(
          `Campaign ${campaign.name} (${campaign._id}) has ${nonExistentMembers.length} non-existent members`
        );

        const updatedMembers = campaign.characterIds.filter((id: string | mongoose.Types.ObjectId) =>
          existingActorIds.has(id.toString())
        );
        await CampaignModel.updateOne(
          { _id: campaign._id },
          { $set: { characterIds: updatedMembers } }
        );

        logger.info(
          `Updated campaign ${campaign.name} (${campaign._id}): removed ${nonExistentMembers.length} non-existent members`
        );
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
