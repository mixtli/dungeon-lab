import { Types } from 'mongoose';
import { ICampaign, ICampaignCreateData, ICampaignUpdateData } from '@dungeon-lab/shared/index.mjs';
import { CampaignModel, type CampaignDocument } from '../models/campaign.model.mjs';
import { ActorModel } from '../../actors/models/actor.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';

export class CampaignService {
  async getMyCampaigns(userId: string): Promise<ICampaign[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // First get all actors belonging to the user
      const userActors = await ActorModel.find({ createdBy: userObjectId });
      const actorIds = userActors.map(actor => actor._id);

      // Find campaigns where user is either the GM or has a character as a member
      const campaigns = await CampaignModel.find({
        $or: [
          { gameMasterId: userObjectId },
          { members: { $in: actorIds } }
        ]
      }).exec();

      return campaigns;
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      throw new Error('Failed to get campaigns');
    }
  }

  async getCampaign(id: string): Promise<ICampaign> {
    try {
      const campaign = await CampaignModel.findById(id).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      return campaign;
    } catch (error) {
      logger.error('Error getting campaign:', error);
      throw new Error('Failed to get campaign');
    }
  }

  async createCampaign(data: ICampaignCreateData, userId: string): Promise<ICampaign> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const campaignData = {
        ...data,
        gameMasterId: userObjectId,
        members: [userObjectId],
        createdBy: userObjectId,
        updatedBy: userObjectId
      };

      // Validate that the game system exists
      const gameSystem = pluginRegistry.getGameSystemPlugin(campaignData.gameSystemId.toString());
      if (!gameSystem) {
        throw new Error('Invalid game system');
      }

      const campaign = await CampaignModel.create(campaignData);
      return campaign;
    } catch (error) {
      logger.error('Error creating campaign:', error);
      throw new Error('Failed to create campaign');
    }
  }

  async updateCampaign(id: string, data: ICampaignUpdateData, userId: string): Promise<ICampaign> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      const updatedCampaign = await CampaignModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).exec();

      if (!updatedCampaign) {
        throw new Error('Campaign not found');
      }

      return updatedCampaign;
    } catch (error) {
      logger.error('Error updating campaign:', error);
      throw new Error('Failed to update campaign');
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    try {
      const campaign = await CampaignModel.findByIdAndDelete(id).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }
    } catch (error) {
      logger.error('Error deleting campaign:', error);
      throw new Error('Failed to delete campaign');
    }
  }

  async checkUserPermission(campaignId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    try {
      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check if user is GM or has a character in the campaign
      const userObjectId = new Types.ObjectId(userId);
      const userActors = await ActorModel.find({ createdBy: userObjectId });
      const actorIds = userActors.map(actor => actor._id);

      const isGM = campaign.gameMasterId?.toString() === userId;
      const hasCharacter = campaign.members.some(memberId => 
        actorIds.some(actorId => actorId instanceof Types.ObjectId && actorId.toString() === memberId.toString())
      );

      return isGM || hasCharacter || isAdmin;
    } catch (error) {
      logger.error('Error checking campaign permission:', error);
      throw new Error('Failed to check campaign permission');
    }
  }
} 