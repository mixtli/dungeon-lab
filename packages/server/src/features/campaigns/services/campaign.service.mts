import { Types } from 'mongoose';
import { ICampaign, ICampaignPatchData, IUser, IGameSession, IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/index.mjs';
import { UserModel } from '../../../models/user.model.mjs';
import { GameSessionModel } from '../models/game-session.model.mjs';
import { QueryValue } from '@dungeon-lab/shared/types/index.mjs';
import { campaignStatusSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { z } from '../../../utils/zod.mjs';

export const campaignQuerySchema = z.object({
  status: campaignStatusSchema.optional()
});

type CampaignQuery = z.infer<typeof campaignQuerySchema>;

export class CampaignService {

  async getMyCampaigns(userId: string, query: CampaignQuery = {}): Promise<ICampaign[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // First get all actors belonging to the user
      const userActors = await DocumentService.find({ createdBy: userId, documentType: 'actor' });
      const actorIds = userActors.map((actor) => actor.id);

      // Convert query to case-insensitive regex for string values
      // Only convert simple string values, not nested paths
      const mongoQuery = Object.entries(query).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && !key.includes('.')) {
          acc[key] = new RegExp(value, 'i');
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, QueryValue>);
      const user = await UserModel.findById(userId);

      let campaigns: ICampaign[] = [];
      if (user?.isAdmin) {
        campaigns = await CampaignModel.find().exec();
      } else {
        // Find campaigns where user is either the GM or has a character as a member
        // AND apply any additional search filters
        campaigns = await CampaignModel.find({
          $and: [
            { $or: [{ gameMasterId: userObjectId }, { characterIds: { $in: actorIds } }] },
            mongoQuery // Add the search query as an additional filter
          ]
        }).populate('gameMaster', 'username displayName').populate('characters');
      }

      return campaigns;
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      throw new Error('Failed to get campaigns');
    }
  }

  async getCampaign(id: string): Promise<ICampaign> {
    try {
      const campaign = await CampaignModel.findById(id)
        .populate('gameMaster', 'username displayName')
        .populate({
          path: 'characters',
          populate: [
            { path: 'token' },
            { path: 'avatar' }
          ]
        })
        .exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      return campaign;
    } catch (error) {
      logger.error('Error getting campaign:', error);
      throw new Error('Failed to get campaign');
    }
  }

  async getCampaignUsers(campaignId: string): Promise<IUser[]> {
    const campaign = await CampaignModel.findById(campaignId).populate('characters').exec();
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    const actors = await DocumentService.find({ _id: { $in: campaign.characterIds }, documentType: 'actor' });
    const usersPromises = actors.map(async (actor) => await UserModel.findById(actor.createdBy));
    const users = await Promise.all(usersPromises);
    return users.filter((user) => user !== null) as IUser[];
  }

  // async isUserCampaignMember(campaignId: string, userId: string): Promise<boolean> {
  //   const users = await this.getCampaignUsers(campaignId);
  //   return users.some((user) => user.id === userId);
  // }

  async createCampaign(data: Omit<ICampaign,  'id' | 'characters' | 'characterIds' | 'createdAt' | 'updatedAt'>, userId: string): Promise<ICampaign> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Initialize with empty members array - members will be added later as actors
      const campaignData = {
        ...data,
        gameMasterId: userObjectId.toString(),
        createdBy: userObjectId.toString(),
        updatedBy: userObjectId.toString()
      };

      // Validate that the plugin exists
      const gameSystem = pluginRegistry.getGameSystemPlugin(campaignData.pluginId.toString());
      if (!gameSystem) {
        throw new Error('Invalid plugin');
      }
      const user = await UserModel.findById(userId);
      if (user?.isAdmin) {
        if (data.createdBy) {
          campaignData.createdBy = data.createdBy;
        }
        if (data.gameMasterId) {
          campaignData.gameMasterId = data.gameMasterId;
        }
      }

      const campaign = await CampaignModel.create(campaignData);
      return campaign;
    } catch (error) {
      logger.error('Error creating campaign:', error);
      throw error
    }
  }

  async updateCampaign(id: string, data: Partial<ICampaign>, userId: string): Promise<ICampaign> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      const updatedCampaign = await CampaignModel.findByIdAndUpdate(id, updateData, {
        new: true
      }).exec();

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

  async checkUserPermission(
    campaignId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      // This ensures that the returned campaign is correctly typed as ICampaign.
      const campaign = await CampaignModel.findById<ICampaign>(campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check if user is GM or has a character in the campaign
      const userActors = await DocumentService.find({ createdBy: userId, documentType: 'actor' });
      const actorIds = userActors.map((actor) => actor.id);

      const isGM = campaign.gameMasterId?.toString() === userId;
      const hasCharacter = campaign.characterIds.some((characterId) =>
        actorIds.includes(characterId.toString())
      );

      return isGM || hasCharacter || isAdmin;
    } catch (error) {
      logger.error('Error checking campaign permission:', error);
      throw new Error('Failed to check campaign permission');
    }
  }

  async isUserCampaignMember(userId: string, campaignId: string): Promise<boolean> {
    console.log("userId", userId);
    console.log("campaignId", campaignId);
    const campaign = await CampaignModel.findById(campaignId).exec();
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Check if user is the game master
    if (campaign.gameMasterId === userId) {
      return true;
    }
    
    // Check if user has any characters in this campaign by looking at the actors
    const userCharactersInCampaign = await DocumentService.find({
      _id: { $in: campaign.characterIds },
      createdBy: userId,
      documentType: 'actor'
    });
    
    return userCharactersInCampaign.length > 0;
  }

  async isActorCampaignMember(actorId: string, campaignId: string): Promise<boolean> {
    try {
      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // // Check if user is the Game Master
      // const isGM = campaign.gameMasterId?.toString() === actorId;
      // if (isGM) {
      //   return true;
      // }

      // Get the actor
      const actor = await DocumentService.findById(actorId);
      if (!actor || actor.documentType !== 'actor') {
        throw new Error('Actor not found');
      }

      // Check if any of the user's actors are members of the campaign
      const isMember = campaign.characterIds.some((characterId) =>
        actor.id === characterId.toString()
      );

      return isMember;
    } catch (error) {
      logger.error('Error checking if user is campaign member:', error);
      throw new Error('Failed to check campaign membership');
    }
  }

  /**
   * Replace an entire campaign (PUT)
   */
  async putCampaign(id: string, data: Omit<ICampaign, 'id'>, userId: string): Promise<ICampaign> {
    try {
      const campaign = await CampaignModel.findById(id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Set the entire campaign data (full replacement)
      campaign.set({
        ...data,
        updatedBy: userId
      });

      await campaign.save();
      return campaign;
    } catch (error) {
      logger.error('Error in putCampaign service:', error);
      throw error;
    }
  }

  /**
   * Partially update a campaign (PATCH)
   */
  async patchCampaign(id: string, data: ICampaignPatchData, userId: string): Promise<ICampaign> {
    try {
      const campaign = await CampaignModel.findById(id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Apply partial update using deepMerge
      const obj = campaign.toObject();
      const updateData = {
        ...data,
        updatedBy: userId
      };

      const mergedData = deepMerge(obj, updateData) as ICampaign;
      // unique characterIds
      mergedData.characterIds = [...new Set(mergedData.characterIds)];
      campaign.set(mergedData);
      await campaign.save();
      return campaign;
    } catch (error) {
      logger.error('Error in patchCampaign service:', error);
      throw error;
    }
  }

  /**
   * Get the active game session for a campaign
   * There is only one active session per campaign
   */
  async getActiveCampaignSession(campaignId: string): Promise<IGameSession | null> {
    try {
      // First check if the campaign exists
      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Find an active session for this campaign
      const activeSession = await GameSessionModel.findOne({
        campaignId,
        status: 'active'
      }).exec();

      return activeSession;
    } catch (error) {
      logger.error('Error getting active campaign session:', error);
      throw new Error('Failed to get active campaign session');
    }
  }

  /**
   * Get the active encounter for a campaign
   */
  async getActiveCampaignEncounter(campaignId: string): Promise<IEncounter | null> {
    // First check if the campaign exists
    const campaign = await CampaignModel.findById(campaignId).exec();
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // For now, return null as the campaign model doesn't have active encounter tracking yet
    // This can be implemented when the encounter management feature is added
    return null;
  }
}
