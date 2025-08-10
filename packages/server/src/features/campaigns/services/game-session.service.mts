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
import { GameStateService } from './game-state.service.mjs';

// Add an interface for filter parameters
interface GameSessionFilter {
  campaignId?: string;
  status?: string;
}


export class GameSessionService {
  private gameStateService: GameStateService;

  constructor() {
    this.gameStateService = new GameStateService();
  }

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
        ownerId: userObjectId, // Set ownerId for new game sessions
        updatedBy: userObjectId,
        // GameState is now handled by a separate GameState model
      };

      const session = await GameSessionModel.create(sessionData);
      
      // Initialize game state for the campaign if not already done
      await this.gameStateService.initializeGameState(data.campaignId);
      
      // Return the session with initialized game state
      const initializedSession = await GameSessionModel.findById(session.id).exec();
      return initializedSession || session;
    } catch (error) {
      logger.error('Error creating game session:', error);
      // Preserve the original error message instead of masking it
      throw error instanceof Error ? error : new Error('Failed to create game session');
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
      console.log("session.campaignId", session.campaignId);
      const isCampaignMember = await campaignService.isUserCampaignMember(
        userId,
        session.campaignId
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

  // Actor/character session management methods removed - no longer needed in unified game state system
  // All characters are available via gameState.characters, no need to add/remove them from sessions

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
        .populate('campaign');
      
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
        .populate('campaign');
      
      if (!updatedSession) {
        throw new Error('Game session not found after update');
      }
      
      return updatedSession;
    } catch (error) {
      logger.error('Error removing participant from session:', error);
      throw new Error(`Failed to remove participant from session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Start a scheduled game session
   * @param sessionId - ID of the game session to start
   * @param userId - ID of the user starting the session (must be GM)
   * @returns The updated game session
   */
  async startSession(sessionId: string, userId: string): Promise<IGameSession> {
    try {
      const session = await GameSessionModel.findById(sessionId);
      if (!session) {
        throw new Error('Game session not found');
      }

      // Validate state transition
      if (session.status !== 'scheduled') {
        throw new Error(`Cannot start session from status: ${session.status}`);
      }

      // Check for existing active/paused sessions in the campaign
      const existingActiveSessions = await GameSessionModel.find({
        campaignId: session.campaignId,
        status: { $in: ['active', 'paused'] }
      });

      if (existingActiveSessions.length > 0) {
        throw new Error('Another session is already active or paused for this campaign');
      }

      // Update session to active
      const updatedSession = await GameSessionModel.findByIdAndUpdate(
        sessionId,
        {
          status: 'active',
          actualStartTime: new Date(),
          updatedBy: userId
        },
        { new: true }
      );

      if (!updatedSession) {
        throw new Error('Failed to update session');
      }

      logger.info(`Session ${sessionId} started by user ${userId}`);
      return updatedSession;
    } catch (error) {
      logger.error('Error starting session:', error);
      throw error instanceof Error ? error : new Error('Failed to start session');
    }
  }

  /**
   * Pause an active game session
   * @param sessionId - ID of the game session to pause
   * @param userId - ID of the user pausing the session (must be GM)
   * @returns The updated game session
   */
  async pauseSession(sessionId: string, userId: string): Promise<IGameSession> {
    try {
      const session = await GameSessionModel.findById(sessionId);
      if (!session) {
        throw new Error('Game session not found');
      }

      // Validate state transition
      if (session.status !== 'active') {
        throw new Error(`Cannot pause session from status: ${session.status}`);
      }

      // Update session to paused
      const updatedSession = await GameSessionModel.findByIdAndUpdate(
        sessionId,
        {
          status: 'paused',
          updatedBy: userId
        },
        { new: true }
      );

      if (!updatedSession) {
        throw new Error('Failed to update session');
      }

      logger.info(`Session ${sessionId} paused by user ${userId}`);
      return updatedSession;
    } catch (error) {
      logger.error('Error pausing session:', error);
      throw error instanceof Error ? error : new Error('Failed to pause session');
    }
  }

  /**
   * Resume a paused game session
   * @param sessionId - ID of the game session to resume
   * @param userId - ID of the user resuming the session (must be GM)
   * @returns The updated game session
   */
  async resumeSession(sessionId: string, userId: string): Promise<IGameSession> {
    try {
      const session = await GameSessionModel.findById(sessionId);
      if (!session) {
        throw new Error('Game session not found');
      }

      // Validate state transition
      if (session.status !== 'paused') {
        throw new Error(`Cannot resume session from status: ${session.status}`);
      }

      // Check for other active sessions in the campaign
      const existingActiveSessions = await GameSessionModel.find({
        campaignId: session.campaignId,
        status: 'active',
        _id: { $ne: sessionId }
      });

      if (existingActiveSessions.length > 0) {
        throw new Error('Another session is already active for this campaign');
      }

      // Update session to active
      const updatedSession = await GameSessionModel.findByIdAndUpdate(
        sessionId,
        {
          status: 'active',
          updatedBy: userId
        },
        { new: true }
      );

      if (!updatedSession) {
        throw new Error('Failed to update session');
      }

      logger.info(`Session ${sessionId} resumed by user ${userId}`);
      return updatedSession;
    } catch (error) {
      logger.error('Error resuming session:', error);
      throw error instanceof Error ? error : new Error('Failed to resume session');
    }
  }

  /**
   * End a game session
   * @param sessionId - ID of the game session to end
   * @param userId - ID of the user ending the session (must be GM)
   * @returns The updated game session
   */
  async endSession(sessionId: string, userId: string): Promise<IGameSession> {
    try {
      const session = await GameSessionModel.findById(sessionId);
      if (!session) {
        throw new Error('Game session not found');
      }

      // Validate state transition
      if (!this.validateStateTransition(session.status, 'ended')) {
        throw new Error(`Cannot end session from status: ${session.status}`);
      }

      // Update session to ended
      const updatedSession = await GameSessionModel.findByIdAndUpdate(
        sessionId,
        {
          status: 'ended',
          actualEndTime: new Date(),
          updatedBy: userId
        },
        { new: true }
      );

      if (!updatedSession) {
        throw new Error('Failed to update session');
      }

      logger.info(`Session ${sessionId} ended by user ${userId}`);
      return updatedSession;
    } catch (error) {
      logger.error('Error ending session:', error);
      throw error instanceof Error ? error : new Error('Failed to end session');
    }
  }

  /**
   * Validate if a session state transition is allowed
   * @param fromStatus - Current session status
   * @param toStatus - Target session status
   * @returns true if transition is valid
   */
  validateStateTransition(fromStatus: string, toStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      scheduled: ['active', 'ended'],
      active: ['paused', 'ended'],
      paused: ['active', 'ended'],
      ended: [] // No transitions from ended state
    };

    return validTransitions[fromStatus]?.includes(toStatus) ?? false;
  }
}
