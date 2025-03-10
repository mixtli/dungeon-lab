import { Types } from 'mongoose';
import { IEncounter, IEncounterCreateData, IEncounterUpdateData } from '@dungeon-lab/shared/src/schemas/encounter.schema.mjs';
import { EncounterModel, type EncounterDocument } from '../models/encounter.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { GameSessionModel } from '../models/game-session.model.mjs';
import { logger } from '../../../utils/logger.mjs';

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

  async createEncounter(data: IEncounterCreateData, campaignId: string, userId: string): Promise<IEncounter> {
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

  async updateEncounter(id: string, data: IEncounterUpdateData, userId: string): Promise<IEncounter> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      const updatedEncounter = await EncounterModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      )
        .lean()
        .exec();

      if (!updatedEncounter) {
        throw new Error('Encounter not found');
      }

      return transformEncounter(updatedEncounter);
    } catch (error) {
      logger.error('Error updating encounter:', error);
      throw new Error('Failed to update encounter');
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

      // Check if user is GM or participant
      const isGM = campaign.gameMasterId?.toString() === userId;
      const isParticipant = encounter.participants.some(p => p.toString() === userId);

      return isGM || isParticipant || isAdmin;
    } catch (error) {
      logger.error('Error checking encounter permission:', error);
      throw new Error('Failed to check encounter permission');
    }
  }
} 