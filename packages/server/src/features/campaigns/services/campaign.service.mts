import { Types } from 'mongoose';
import { ICampaign, ICampaignPatchData, IUser } from '@dungeon-lab/shared/types/index.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { ActorModel } from '../../actors/models/actor.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/deepMerge.mjs';
import { UserModel } from '../../../models/user.model.mjs';
import { GameSessionModel } from '../models/game-session.model.mjs';
import { EncounterModel } from '../models/encounter.model.mjs';
import { IGameSession } from '@dungeon-lab/shared/types/index.mjs';
import { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { QueryValue } from '@dungeon-lab/shared/types/index.mjs';
import { campaignStatusSchema } from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
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
      const userActors = await ActorModel.find({ createdBy: userObjectId });
      const actorIds = userActors.map((actor) => actor._id);

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
            { $or: [{ gameMasterId: userObjectId }, { members: { $in: actorIds } }] },
            mongoQuery // Add the search query as an additional filter
          ]
        }).exec();
      }

      return campaigns;
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      throw new Error('Failed to get campaigns');
    }
  }

  async getCampaign(id: string): Promise<ICampaign> {
    try {
      //const campaign = await CampaignModel.findById(id).populate('gameMaster').exec();
      const campaign = await CampaignModel.findById(id)
        .populate('gameMaster', 'username displayName')
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
    const campaign = await CampaignModel.findById(campaignId).populate('members').exec();
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    const actors = await ActorModel.find({ _id: { $in: campaign.members } });
    const usersPromises = actors.map(async (actor) => await UserModel.findById(actor.createdBy));
    const users = await Promise.all(usersPromises);
    return users.filter((user: IUser | null) => user !== null);
  }

  // async isUserCampaignMember(campaignId: string, userId: string): Promise<boolean> {
  //   const users = await this.getCampaignUsers(campaignId);
  //   return users.some((user) => user.id === userId);
  // }

  async createCampaign(data: Omit<ICampaign, 'id'>, userId: string): Promise<ICampaign> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Initialize with empty members array - members will be added later as actors
      const campaignData = {
        ...data,
        gameMasterId: userObjectId.toString(),
        createdBy: userObjectId.toString(),
        updatedBy: userObjectId.toString()
      };

      // Validate that the game system exists
      const gameSystem = pluginRegistry.getGameSystemPlugin(campaignData.gameSystemId.toString());
      if (!gameSystem) {
        throw new Error('Invalid game system');
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
      throw new Error('Failed to create campaign');
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
      const userObjectId = new Types.ObjectId(userId);
      const userActors = await ActorModel.find({ createdBy: userObjectId });
      const actorIds = userActors.map((actor) => actor._id.toString());

      const isGM = campaign.gameMasterId?.toString() === userId;
      const hasCharacter = campaign.members.some((memberId) =>
        actorIds.includes(memberId.toString())
      );

      return isGM || hasCharacter || isAdmin;
    } catch (error) {
      logger.error('Error checking campaign permission:', error);
      throw new Error('Failed to check campaign permission');
    }
  }

  async isUserCampaignMember(campaignId: string, userId: string): Promise<boolean> {
    try {
      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check if user is the Game Master
      const isGM = campaign.gameMasterId?.toString() === userId;
      if (isGM) {
        return true;
      }

      // Get all actors belonging to the user
      const userObjectId = new Types.ObjectId(userId);
      const userActors = await ActorModel.find({ createdBy: userObjectId });
      const actorIds = userActors.map((actor) => actor._id.toString());

      // Check if any of the user's actors are members of the campaign
      const isMember = campaign.members.some((memberId) => actorIds.includes(memberId.toString()));

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

      campaign.set(deepMerge(obj, updateData));
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
   * There is only one active encounter per campaign
   */
  async getActiveCampaignEncounter(campaignId: string): Promise<IEncounter | null> {
    try {
      // First check if the campaign exists
      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Find an active encounter for this campaign (in_progress status)
      const activeEncounter = await EncounterModel.findOne({
        campaignId,
        status: 'in_progress'
      }).exec();

      return activeEncounter;
    } catch (error) {
      logger.error('Error getting active campaign encounter:', error);
      throw new Error('Failed to get active campaign encounter');
    }
  }
}
