import mongoose from 'mongoose';
import { DocumentModel } from '../features/documents/models/document.model.mjs';
import { CampaignModel } from '../features/campaigns/models/campaign.model.mjs';
import { logger } from '../utils/logger.mjs';

interface LegacyCampaign {
  _id: mongoose.Types.ObjectId;
  name: string;
  characterIds?: string[];
}

async function migrateCampaignCharacters() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info('Connected to database');

    // Find all campaigns that still have characterIds field in the database
    const campaigns = await CampaignModel.collection.find({
      characterIds: { $exists: true }
    }).toArray() as LegacyCampaign[];
    
    logger.info(`Found ${campaigns.length} campaigns with characterIds to migrate`);

    let migratedCount = 0;
    let totalCharactersMigrated = 0;

    for (const campaign of campaigns) {
      if (!campaign.characterIds || campaign.characterIds.length === 0) {
        // Remove empty characterIds field
        await CampaignModel.collection.updateOne(
          { _id: campaign._id },
          { $unset: { characterIds: 1 } }
        );
        continue;
      }

      logger.info(`Migrating campaign: ${campaign.name} (${campaign._id})`);
      logger.info(`  Found ${campaign.characterIds.length} character IDs to migrate`);

      // Set campaignId on all character documents referenced in characterIds
      const result = await DocumentModel.updateMany(
        {
          _id: { $in: campaign.characterIds.map(id => new mongoose.Types.ObjectId(id)) },
          documentType: 'character'
        },
        {
          $set: { campaignId: campaign._id.toString() }
        }
      );

      logger.info(`  Updated ${result.modifiedCount} character documents`);
      totalCharactersMigrated += result.modifiedCount;

      // Remove characterIds field from campaign
      await CampaignModel.collection.updateOne(
        { _id: campaign._id },
        { $unset: { characterIds: 1 } }
      );

      migratedCount++;
    }

    logger.info('Migration completed successfully');
    logger.info(`  Campaigns processed: ${campaigns.length}`);
    logger.info(`  Campaigns with characters migrated: ${migratedCount}`);
    logger.info(`  Total characters migrated: ${totalCharactersMigrated}`);

    process.exit(0);
  } catch (error) {
    logger.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateCampaignCharacters();