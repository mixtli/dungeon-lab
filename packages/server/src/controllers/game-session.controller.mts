import { Response } from 'express';
import { Types } from 'mongoose';
import { GameSessionModel } from '../models/game-session.model.mjs';
import { AuthenticatedRequest } from '../middleware/auth.middleware.mjs';
import { logger } from '../utils/logger.mjs';

// Create a new game session
export async function createGameSession(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const userId = new Types.ObjectId(req.session.user.id);
    const campaignId = new Types.ObjectId(req.body.campaignId);

    // Check if there's already an active session for this campaign
    if (req.body.status === 'active') {
      const existingActiveSession = await GameSessionModel.findOne({
        campaignId,
        status: 'active'
      }).exec();

      if (existingActiveSession) {
        return res.status(400).json({
          message: 'There is already an active session for this campaign'
        });
      }
    }

    const sessionData = {
      ...req.body,
      participants: [userId], // Add creator as first participant
      createdBy: userId,
      updatedBy: userId
    };

    const session = await GameSessionModel.create(sessionData);
    return res.status(201).json(session);
  } catch (error) {
    logger.error('Error creating game session:', error);
    return res.status(500).json({ message: 'Failed to create game session' });
  }
}

// Get a specific game session
export async function getGameSession(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const session = await GameSessionModel.findById(req.params.id).exec();
    if (!session) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    const userId = new Types.ObjectId(req.session.user.id);

    // If user is not already a participant and the session is active, add them
    if (session.status === 'active' && !session.participants.includes(userId)) {
      session.participants.push(userId);
      await session.save();
    }

    return res.json(session);
  } catch (error) {
    logger.error('Error getting game session:', error);
    return res.status(500).json({ message: 'Failed to get game session' });
  }
}

// Get all sessions for a campaign
export async function getCampaignSessions(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const campaignId = new Types.ObjectId(req.params.campaignId);
    const userId = new Types.ObjectId(req.session.user.id);

    // Find all sessions for the campaign - all campaign members should be able to see sessions
    const sessions = await GameSessionModel.find({
      campaignId
    }).sort({ 'settings.scheduledStart': 1 }).exec();

    return res.json(sessions);
  } catch (error) {
    logger.error('Error getting campaign sessions:', error);
    return res.status(500).json({ message: 'Failed to get campaign sessions' });
  }
}

// Get all sessions for the current user
export async function getAllSessions(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const userId = new Types.ObjectId(req.session.user.id);

    // Find all sessions where user is a participant or game master
    const sessions = await GameSessionModel.find({
      $or: [
        { participants: userId },
        { gameMasterId: userId }
      ]
    }).sort({ 'settings.scheduledStart': 1 }).exec();

    return res.json(sessions);
  } catch (error) {
    logger.error('Error getting all sessions:', error);
    return res.status(500).json({ message: 'Failed to get sessions' });
  }
}

// Update session status
export async function updateSessionStatus(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const session = await GameSessionModel.findById(req.params.id).exec();
    if (!session) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    // Check if user has permission to update (must be game master)
    const userId = new Types.ObjectId(req.session.user.id);
    if (session.gameMasterId.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newStatus = req.body.status;

    // If trying to set status to active, check if there's already an active session
    if (newStatus === 'active') {
      const existingActiveSession = await GameSessionModel.findOne({
        campaignId: session.campaignId,
        status: 'active',
        _id: { $ne: session._id } // Exclude current session
      }).exec();

      if (existingActiveSession) {
        return res.status(400).json({
          message: 'There is already an active session for this campaign'
        });
      }
    }

    session.status = newStatus;
    session.updatedBy = userId;
    await session.save();

    return res.json(session);
  } catch (error) {
    logger.error('Error updating session status:', error);
    return res.status(500).json({ message: 'Failed to update session status' });
  }
}

// Delete a game session
export async function deleteGameSession(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const session = await GameSessionModel.findById(req.params.id).exec();
    if (!session) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    // Check if user has permission to delete (must be game master)
    const userId = new Types.ObjectId(req.session.user.id);
    if (session.gameMasterId.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await GameSessionModel.findByIdAndDelete(req.params.id).exec();
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting game session:', error);
    return res.status(500).json({ message: 'Failed to delete game session' });
  }
} 