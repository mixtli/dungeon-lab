import { Request, Response } from 'express';
import { GameSessionService } from '../services/game-session.service.mjs';
import { logger } from '../../../utils/logger.mjs';

// Custom error type guard
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

export class GameSessionController {
  constructor(private gameSessionService: GameSessionService) {}

  async getGameSessions(req: Request, res: Response): Promise<Response | void> {
    try {
      // Extract query parameters
      const { campaignId, status } = req.query;

      // Pass query parameters to the service
      const sessions = await this.gameSessionService.getGameSessions(req.session.user.id, {
        campaignId: campaignId as string,
        status: status as string
      });
      return res.json(sessions);
    } catch (error) {
      logger.error('Error getting game sessions:', error);
      return res.status(500).json({ message: 'Failed to get game sessions' });
    }
  }

  async getGameSession(req: Request, res: Response): Promise<Response | void> {
    try {
      const session = await this.gameSessionService.getGameSession(req.params.id);

      // Check if user has access to this session
      const hasAccess = await this.gameSessionService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      return res.json(session);
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Game session not found') {
        return res.status(404).json({ message: 'Game session not found' });
      }
      logger.error('Error getting game session:', error);
      return res.status(500).json({ message: 'Failed to get game session' });
    }
  }

  async getCampaignSessions(req: Request, res: Response): Promise<Response | void> {
    try {
      const sessions = await this.gameSessionService.getCampaignSessions(req.params.campaignId);
      return res.json(sessions);
    } catch (error) {
      logger.error('Error getting campaign sessions:', error);
      return res.status(500).json({ message: 'Failed to get campaign sessions' });
    }
  }

  async createGameSession(req: Request, res: Response): Promise<Response | void> {
    try {
      const session = await this.gameSessionService.createGameSession(
        req.body,
        req.session.user.id
      );
      return res.status(201).json(session);
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Campaign not found') {
          return res.status(404).json({ message: 'Campaign not found' });
        }
        if (error.message === 'Only the game master can create sessions') {
          return res.status(403).json({ message: 'Only the game master can create sessions' });
        }
      }
      logger.error('Error creating game session:', error);
      return res.status(500).json({ message: 'Failed to create game session' });
    }
  }

  async updateGameSession(req: Request, res: Response): Promise<Response | void> {
    try {
      // Check if user has permission to update
      const hasAccess = await this.gameSessionService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updatedSession = await this.gameSessionService.updateGameSession(
        req.params.id,
        req.body,
        req.session.user.id
      );

      return res.json(updatedSession);
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Game session not found') {
        return res.status(404).json({ message: 'Game session not found' });
      }
      logger.error('Error updating game session:', error);
      return res.status(500).json({ message: 'Failed to update game session' });
    }
  }

  async deleteGameSession(req: Request, res: Response): Promise<Response | void> {
    try {
      // Check if user has permission to delete
      const hasAccess = await this.gameSessionService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await this.gameSessionService.deleteGameSession(req.params.id);
      return res.status(204).send();
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Game session not found') {
        return res.status(404).json({ message: 'Game session not found' });
      }
      logger.error('Error deleting game session:', error);
      return res.status(500).json({ message: 'Failed to delete game session' });
    }
  }
}
