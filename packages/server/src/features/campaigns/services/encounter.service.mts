import { Types } from 'mongoose';
import { IEncounter} from '@dungeon-lab/shared/src/schemas/encounter.schema.mjs';
import { EncounterModel} from '../models/encounter.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { ActorModel } from '../../actors/models/actor.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { IActor } from '@dungeon-lab/shared/index.mjs';

// Transform MongoDB document to API response
function transformEncounter(doc: any): IEncounter {
  const { _id, ...rest } = doc;
  return {
    id: _id.toString(),
    ...rest
  };
}

export class EncounterService {
  async getEncounters(campaignId: string): Promise<IEncounter[]> {
    try {
      const encounters = await EncounterModel.find({ campaignId })
        .lean()
        .exec();
      return encounters.map(transformEncounter);
    } catch (error) {
      logger.error('Error getting encounters:', error);
      throw new Error('Failed to get encounters');
    }
  }

  async getEncounter(id: string, campaignId: string): Promise<IEncounter> {
    try {
      // First check if the ID is a valid ObjectId to avoid Mongoose casting errors
      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(campaignId)) {
        throw new Error('Encounter not found');
      }

      const encounter = await EncounterModel.findOne({
        _id: id,
        campaignId
      })
        .lean()
        .exec();
      
      if (!encounter) {
        throw new Error('Encounter not found');
      }
      return transformEncounter(encounter);
    } catch (error) {
      // If it's our specific error, rethrow it
      if (error instanceof Error && error.message === 'Encounter not found') {
        throw error;
      }
      // Otherwise log and throw a generic error
      logger.error('Error getting encounter:', error);
      throw new Error('Failed to get encounter');
    }
  }

  async createEncounter(data: IEncounter, campaignId: string, userId: string): Promise<IEncounter> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const mapObjectId = new Types.ObjectId(data.mapId);
      const campaignObjectId = new Types.ObjectId(campaignId);
      
      // Verify campaign exists
      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Verify user is the game master of the campaign
      if (campaign.gameMasterId?.toString() !== userId) {
        throw new Error('Only the game master can create encounters');
      }

      const encounterData = {
        name: data.name,
        description: data.description || '',
        mapId: mapObjectId,
        campaignId: campaignObjectId,
        status: data.status || 'draft',
        settings: data.settings || {},
        participants: [],
        createdBy: userObjectId,
        updatedBy: userObjectId
      };

      logger.debug('Creating encounter with data (stringified):', JSON.stringify(encounterData, null, 2));
      logger.debug('ObjectId values:', {
        mapId: mapObjectId instanceof Types.ObjectId,
        campaignId: campaignObjectId instanceof Types.ObjectId,
        createdBy: userObjectId instanceof Types.ObjectId
      });

      // Log schema info
      logger.debug('Encounter schema paths:', Object.keys(EncounterModel.schema.paths));
      logger.debug('Encounter schema:', EncounterModel.schema);

      const encounter = new EncounterModel(encounterData);
      await encounter.save();
      return transformEncounter(encounter.toObject());
    } catch (error) {
      logger.error('Error creating encounter:', error);
      throw new Error('Failed to create encounter');
    }
  }

  async updateEncounter(encounterId: string, data: Partial<IEncounter>, userId: string): Promise<IEncounter> {
    try {
      const encounter = await EncounterModel.findById(encounterId);
      if (!encounter) {
        throw new Error('Encounter not found');
      }

      // Add updatedBy to the data
      const updateData = {
        ...data,
        updatedBy: new Types.ObjectId(userId)
      };

      const updatedEncounter = await EncounterModel.findByIdAndUpdate(
        encounterId,
        updateData,
        { new: true }
      );

      if (!updatedEncounter) {
        throw new Error('Failed to update encounter');
      }

      return transformEncounter(updatedEncounter.toObject());
    } catch (error) {
      logger.error('Error updating encounter:', error);
      throw error;
    }
  }

  async deleteEncounter(id: string): Promise<void> {
    try {
      const encounter = await EncounterModel.findByIdAndDelete(id).exec();
      if (!encounter) {
        throw new Error('Encounter not found');
      }
    } catch (error) {
      logger.error('Error deleting encounter:', error);
      throw new Error('Failed to delete encounter');
    }
  }

  async checkUserPermission(encounterId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    try {
      const encounter = await EncounterModel.findById(encounterId).exec();
      if (!encounter) {
        throw new Error('Encounter not found');
      }

      // Get the campaign to check permissions
      const campaign = await CampaignModel.findById(encounter.campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get user's actors
      const userObjectId = new Types.ObjectId(userId);
      const userActors = await ActorModel.find({ createdBy: userObjectId });
      const actorIds = userActors.map((actor: IActor) => actor.id!)

      // Check if user is GM, participant, has a character in the campaign, or is admin
      const isGM = campaign.gameMasterId?.toString() === userId;
      const isParticipant = encounter.participants.some(p => p.toString() === userId);
      const hasCharacter = campaign.members.some(memberId => 
        actorIds.some(actorId => actorId.toString() === memberId.toString())
      );

      return isGM || isParticipant || hasCharacter || isAdmin;
    } catch (error) {
      logger.error('Error checking encounter permission:', error);
      throw new Error('Failed to check encounter permission');
    }
  }
} 