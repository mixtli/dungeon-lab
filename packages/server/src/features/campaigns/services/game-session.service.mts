import { Types } from 'mongoose';
import {
  ICreateGameSession,
  IGameSession,
  IGameSessionPatchData
} from '@dungeon-lab/shared/types/index.mjs';
import { GameSessionModel } from '../models/game-session.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { CampaignService } from './campaign.service.mjs';

// Add an interface for filter parameters
interface GameSessionFilter {
  campaignId?: string;
  status?: string;
}


export class GameSessionService {
  async getGameSessions(userId: string, filter?: GameSessionFilter): Promise<IGameSession[]> {
    console.log("getGameSessions userId", userId);
    try {
      //const userObjectId = new Types.ObjectId(userId);

      const query = filter ?? {};
      const sessions = await GameSessionModel.find(query).exec();
      return sessions;
    } catch (error) {
      logger.error('Error getting game sessions:', error);
      throw new Error(`Failed to get game sessions: ${error instanceof Error ? error.message : String(error)}`);
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

  async createGameSession(data: ICreateGameSession, userId: string): Promise<IGameSession> {
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
        participantIds: [userObjectId],
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
    data: IGameSessionPatchData,
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

  /**
   * Add an actor to a game session
   * If the actor already exists in the session, no changes are made
   * @param sessionId - ID of the game session
   * @param actorId - ID of the actor to add
   * @returns The updated game session
   */
  async addActorToSession(sessionId: string, actorId: string): Promise<IGameSession> {
    try {
      // Check if session exists
      const sessionExists = await GameSessionModel.exists({ _id: sessionId });
      if (!sessionExists) {
        throw new Error('Game session not found');
      }

      // Use $addToSet to add the actor to characterIds array only if it doesn't already exist
      const result = await GameSessionModel.updateOne(
        { _id: sessionId },
        { $addToSet: { characterIds: actorId } }
      );
      
      if (result.modifiedCount > 0) {
        logger.info(`Actor ${actorId} added to session ${sessionId}`);
      } else {
        logger.info(`Actor ${actorId} already exists in session ${sessionId}, no changes made`);
      }

      // Return the updated session
      const updatedSession = await GameSessionModel.findById(sessionId)
        .populate('campaign')
        .populate('characters');
      
      if (!updatedSession) {
        throw new Error('Game session not found after update');
      }
      
      return updatedSession;
    } catch (error) {
      logger.error('Error adding actor to session:', error);
      throw new Error(`Failed to add actor to session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove an actor from a game session
   * If the actor doesn't exist in the session, no changes are made
   * @param sessionId - ID of the game session
   * @param actorId - ID of the actor to remove
   * @returns The updated game session
   */
  async removeActorFromSession(sessionId: string, actorId: string): Promise<IGameSession> {
    try {
      // Check if session exists
      const sessionExists = await GameSessionModel.exists({ _id: sessionId });
      if (!sessionExists) {
        throw new Error('Game session not found');
      }

      // Use $pull to remove the actor from characterIds array
      const result = await GameSessionModel.updateOne(
        { _id: sessionId },
        { $pull: { characterIds: actorId } }
      );
      
      if (result.modifiedCount > 0) {
        logger.info(`Actor ${actorId} removed from session ${sessionId}`);
      } else {
        logger.info(`Actor ${actorId} not found in session ${sessionId}, no changes made`);
      }

      // Return the updated session
      const updatedSession = await GameSessionModel.findById(sessionId)
        .populate('campaign')
        .populate('characters');
      
      if (!updatedSession) {
        throw new Error('Game session not found after update');
      }
      
      return updatedSession;
    } catch (error) {
      logger.error('Error removing actor from session:', error);
      throw new Error(`Failed to remove actor from session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add a participant (user) to a game session
   * If the participant already exists in the session, no changes are made
   * @param sessionId - ID of the game session
   * @param userId - ID of the user to add
   * @returns The updated game session
   */
  async addParticipantToSession(sessionId: string, userId: string): Promise<IGameSession> {
    try {
      // Check if session exists
      const sessionExists = await GameSessionModel.exists({ _id: sessionId });
      if (!sessionExists) {
        throw new Error('Game session not found');
      }

      // Use $addToSet to add the participant to participantIds array only if it doesn't already exist
      const result = await GameSessionModel.updateOne(
        { _id: sessionId },
        { $addToSet: { participantIds: userId } }
      );
      
      if (result.modifiedCount > 0) {
        logger.info(`Participant ${userId} added to session ${sessionId}`);
      } else {
        logger.info(`Participant ${userId} already exists in session ${sessionId}, no changes made`);
      }

      // Return the updated session
      const updatedSession = await GameSessionModel.findById(sessionId)
        .populate('campaign')
        .populate('characters');
      
      if (!updatedSession) {
        throw new Error('Game session not found after update');
      }
      
      return updatedSession;
    } catch (error) {
      logger.error('Error adding participant to session:', error);
      throw new Error(`Failed to add participant to session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove a participant (user) from a game session
   * If the participant doesn't exist in the session, no changes are made
   * @param sessionId - ID of the game session
   * @param userId - ID of the user to remove
   * @returns The updated game session
   */
  async removeParticipantFromSession(sessionId: string, userId: string): Promise<IGameSession> {
    try {
      // Check if session exists
      const sessionExists = await GameSessionModel.exists({ _id: sessionId });
      if (!sessionExists) {
        throw new Error('Game session not found');
      }

      // Use $pull to remove the participant from participantIds array
      const result = await GameSessionModel.updateOne(
        { _id: sessionId },
        { $pull: { participantIds: userId } }
      );
      
      if (result.modifiedCount > 0) {
        logger.info(`Participant ${userId} removed from session ${sessionId}`);
      } else {
        logger.info(`Participant ${userId} not found in session ${sessionId}, no changes made`);
      }

      // Return the updated session
      const updatedSession = await GameSessionModel.findById(sessionId)
        .populate('campaign')
        .populate('characters');
      
      if (!updatedSession) {
        throw new Error('Game session not found after update');
      }
      
      return updatedSession;
    } catch (error) {
      logger.error('Error removing participant from session:', error);
      throw new Error(`Failed to remove participant from session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
