import { Types } from 'mongoose';
import { ICampaign, ICampaignPatchData, IUser, IGameSession, IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { DocumentService } from '../../documents/services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
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
        campaigns = await CampaignModel.find(mongoQuery).exec();
      } else {
        // First get all user's characters that have a campaignId
        const userCharacters = await DocumentService.find({ 
          createdBy: userId, 
          documentType: 'character',
          campaignId: { $exists: true }
        });
        const campaignIds = userCharacters.map((character) => character.campaignId).filter(Boolean);

        // Find campaigns where user is either the GM or has characters in the campaign
        // AND apply any additional search filters
        campaigns = await CampaignModel.find({
          $and: [
            { $or: [{ gameMasterId: userObjectId }, { _id: { $in: campaignIds } }] },
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
    const campaign = await CampaignModel.findById(campaignId).exec();
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    const characters = await DocumentService.find({ campaignId, documentType: 'character' });
    const usersPromises = characters.map(async (character) => await UserModel.findById(character.createdBy));
    const users = await Promise.all(usersPromises);
    return users.filter((user) => user !== null) as IUser[];
  }

  // async isUserCampaignMember(campaignId: string, userId: string): Promise<boolean> {
  //   const users = await this.getCampaignUsers(campaignId);
  //   return users.some((user) => user.id === userId);
  // }

  async createCampaign(data: Omit<ICampaign,  'id' | 'characters' | 'createdAt' | 'updatedAt'>, userId: string): Promise<ICampaign> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Members will be added by setting campaignId on character documents
      const campaignData = {
        ...data,
        gameMasterId: userObjectId.toString(),
        createdBy: userObjectId.toString(),
        updatedBy: userObjectId.toString()
      };

      // Note: Plugin validation now happens client-side only
      // Server trusts that client has already validated plugin data
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
      const isGM = campaign.gameMasterId?.toString() === userId;
      
      // Check if user has any characters in this campaign
      const userCharactersInCampaign = await DocumentService.find({
        campaignId,
        createdBy: userId,
        documentType: 'character'
      });
      const hasCharacter = userCharactersInCampaign.length > 0;

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
    
    // Check if user has any characters in this campaign
    const userCharactersInCampaign = await DocumentService.find({
      campaignId,
      createdBy: userId,
      documentType: 'character'
    });
    
    return userCharactersInCampaign.length > 0;
  }

  async isActorCampaignMember(actorId: string, campaignId: string): Promise<boolean> {
    try {
      const campaign = await CampaignModel.findById(campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get the character/actor document
      const character = await DocumentService.findById(actorId);
      if (!character || character.documentType !== 'character') {
        throw new Error('Character not found');
      }

      // Check if this character belongs to the campaign
      return character.campaignId === campaignId;
    } catch (error) {
      logger.error('Error checking if character is campaign member:', error);
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
