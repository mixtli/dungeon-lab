import { Response } from 'express';
import { Types } from 'mongoose';
import { GameSessionModel } from '../models/game-session.model.mjs';
import { AuthenticatedRequest } from '../middleware/auth.middleware.mjs';
import { logger } from '../utils/logger.mjs';

// Create a new game session
export async function createGameSession(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const userId = new Types.ObjectId(req.session.user.id);
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

    // Check if user has access to this session
    const userId = new Types.ObjectId(req.session.user.id);
    if (!session.participants.includes(userId) && session.gameMasterId.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json(session);
  } catch (error) {
    logger.error('Error getting game session:', error);
    return res.status(500).json({ message: 'Failed to get game session' });
  }
} 