import { Types } from 'mongoose';
import { IGameSession } from '@dungeon-lab/shared/index.mjs';
import { GameSessionModel } from '../models/game-session.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { CampaignService } from './campaign.service.mjs';

// Add an interface for filter parameters
interface GameSessionFilter {
  campaignId?: string;
  status?: string;
}

// Define a proper type for the MongoDB query
interface GameSessionQuery {
  $or: Array<{ gameMasterId: Types.ObjectId } | { participants: Types.ObjectId }>;
  campaignId?: string;
  status?: string;
}

export class GameSessionService {
  async getGameSessions(userId: string, filter?: GameSessionFilter): Promise<IGameSession[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Build the query with user access condition
      const baseQuery = {
        $or: [{ gameMasterId: userObjectId }, { participants: userObjectId }]
      };

      // Add filters if provided
      const query: GameSessionQuery = { ...baseQuery };

      if (filter?.campaignId) {
        query.campaignId = filter.campaignId;
      }

      if (filter?.status) {
        query.status = filter.status;
      }

      const sessions = await GameSessionModel.find(query).exec();
      return sessions;
    } catch (error) {
      logger.error('Error getting game sessions:', error);
      throw new Error('Failed to get game sessions');
    }
  }

  async getGameSession(id: string): Promise<IGameSession> {
    try {
      const session = await GameSessionModel.findById(id).populate('campaign');
      console.log('session', session);
      if (!session) {
        throw new Error('Game session not found');
      }
      return session;
    } catch (error) {
      logger.error('Error getting game session:', error);
      throw new Error('Failed to get game session');
    }
  }

  async getCampaignSessions(campaignId: string): Promise<IGameSession[]> {
    try {
      const sessions = await GameSessionModel.find({ campaignId }).exec();
      return sessions;
    } catch (error) {
      logger.error('Error getting campaign sessions:', error);
      throw new Error('Failed to get campaign sessions');
    }
  }

  async createGameSession(data: IGameSession, userId: string): Promise<IGameSession> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Verify campaign exists
      const campaign = await CampaignModel.findById(data.campaignId).exec();
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Verify user is the game master of the campaign
      if (campaign.gameMasterId?.toString() !== userId) {
        throw new Error('Only the game master can create sessions');
      }

      const sessionData = {
        ...data,
        gameMasterId: userObjectId,
        participants: [userObjectId],
        createdBy: userObjectId,
        updatedBy: userObjectId
      };

      const session = await GameSessionModel.create(sessionData);
      return session;
    } catch (error) {
      logger.error('Error creating game session:', error);
      throw new Error('Failed to create game session');
    }
  }

  async updateGameSession(
    id: string,
    data: Partial<IGameSession>,
    userId: string
  ): Promise<IGameSession> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      const updatedSession = await GameSessionModel.findByIdAndUpdate(id, updateData, {
        new: true
      }).exec();

      if (!updatedSession) {
        throw new Error('Game session not found');
      }

      return updatedSession;
    } catch (error) {
      logger.error('Error updating game session:', error);
      throw new Error('Failed to update game session');
    }
  }

  async deleteGameSession(id: string): Promise<void> {
    try {
      const session = await GameSessionModel.findByIdAndDelete(id).exec();
      if (!session) {
        throw new Error('Game session not found');
      }
    } catch (error) {
      logger.error('Error deleting game session:', error);
      throw new Error('Failed to delete game session');
    }
  }

  async checkUserPermission(sessionId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    try {
      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) {
        throw new Error('Game session not found');
      }

      const campaignService = new CampaignService();
      const isCampaignMember = await campaignService.isUserCampaignMember(
        session.campaignId,
        userId
      );
      // Check if user is GM or participant
      const isGM = session.gameMasterId?.toString() === userId;
      const isParticipant = session.participantIds.some((p) => p === userId);

      return isGM || isCampaignMember || isParticipant || isAdmin;
    } catch (error) {
      logger.error('Error checking game session permission:', error);
      throw new Error('Failed to check game session permission');
    }
  }
}
