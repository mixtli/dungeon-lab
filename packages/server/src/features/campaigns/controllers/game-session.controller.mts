import { NextFunction, Request, Response } from 'express';
import { GameSessionService } from '../services/game-session.service.mjs';
import {
  BaseAPIResponse,
  createGameSessionSchema,
  updateGameSessionSchema,
  getGameSessionsQuerySchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { IGameSession, IGameSessionPatchData } from '@dungeon-lab/shared/types/index.mjs';
import { z } from 'zod';
import { getSocketServer } from '../../../websocket/socket-server.mjs';

export class GameSessionController {
  constructor(private gameSessionService: GameSessionService) {}

  getGameSessions = async (
    req: Request<object, object, object, z.infer<typeof getGameSessionsQuerySchema>>,
    res: Response<BaseAPIResponse<IGameSession[]>>
  ): Promise<Response<BaseAPIResponse<IGameSession[]>> | void> => {
    // Extract query parameters
    const { campaignId, status } = req.query;

    // Validate query parameters
    getGameSessionsQuerySchema.parse(req.query);

    const params: { campaignId?: string; status?: string } = {};

    if (campaignId) {
      params.campaignId = campaignId as string;
    }

    if (status) {
      params.status = status as string;
    }
    // Pass query parameters to the service
    const sessions = await this.gameSessionService.getGameSessions(req.session.user.id, params);

    return res.json({
      success: true,
      data: sessions
    });
  };

  getGameSession = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<IGameSession>>,
    next: NextFunction
  ): Promise<Response<BaseAPIResponse<IGameSession>> | void> => {
    try {
      const session = await this.gameSessionService.getGameSession(req.params.id);

      // Check if user has access to this session
      const hasAccess = await this.gameSessionService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Access denied'
        });
      }

      return res.json({
        success: true,
        data: session
      });
    } catch (error) {
      next(error)
    }
  };

  getCampaignSessions = async (
    req: Request<object, object, object, { campaignId: string }>,
    res: Response<BaseAPIResponse<IGameSession[]>>
  ): Promise<Response<BaseAPIResponse<IGameSession[]>> | void> => {
    const campaignId = req.query.campaignId;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        data: [],
        error: 'Campaign ID is required'
      });
    }

    const sessions = await this.gameSessionService.getCampaignSessions(campaignId);
    return res.json({
      success: true,
      data: sessions
    });
  };

  createGameSession = async (
    req: Request<object, object, z.infer<typeof createGameSessionSchema>>,
    res: Response<BaseAPIResponse<IGameSession>>
  ): Promise<Response<BaseAPIResponse<IGameSession>> | void> => {
    try {
      const validatedData = createGameSessionSchema.parse(req.body);

      // Create a session object with required fields that the service expects
      // The service will add the missing fields (gameMasterId, participants, etc.)
      const sessionData = {
        name: validatedData.name,
        campaignId: validatedData.campaignId,
        description: validatedData.description,
        status: validatedData.status || 'scheduled',
        settings: validatedData.settings
        // These will be set by the service but needed for type compatibility
      } as IGameSession;

      const session = await this.gameSessionService.createGameSession(
        sessionData,
        req.session.user.id
      );

      return res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error in createGameSession controller:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create game session'
      });
    }
  };

  updateGameSession = async (
    req: Request<{ id: string }, object, z.infer<typeof updateGameSessionSchema>>,
    res: Response<BaseAPIResponse<IGameSession>>
  ): Promise<Response<BaseAPIResponse<IGameSession>> | void> => {
    // Check if user has permission to update
    const hasAccess = await this.gameSessionService.checkUserPermission(
      req.params.id,
      req.session.user.id,
      req.session.user.isAdmin
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        data: null,
        error: 'Access denied'
      });
    }

    // Validate request body
    const validatedData = updateGameSessionSchema.parse(req.body);

    // Create a partial session object with the fields from the request
    const updateData: IGameSessionPatchData = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.description && { description: validatedData.description }),
      ...(validatedData.status && { status: validatedData.status }),
      ...(validatedData.settings && { settings: validatedData.settings })
      // Explicitly avoiding any nested object properties like gameMaster
    };

    const updatedSession = await this.gameSessionService.updateGameSession(
      req.params.id,
      updateData,
      req.session.user.id
    );

    return res.json({
      success: true,
      data: updatedSession
    });
  };

  deleteGameSession = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    // Check if user has permission to delete
    const hasAccess = await this.gameSessionService.checkUserPermission(
      req.params.id,
      req.session.user.id,
      req.session.user.isAdmin
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        data: null,
        error: 'Access denied'
      });
    }

    await this.gameSessionService.deleteGameSession(req.params.id);
    return res.status(204).send();
  };

  startGameSession = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<IGameSession>>
  ): Promise<Response<BaseAPIResponse<IGameSession>> | void> => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;

      // Check if user is the game master
      const session = await this.gameSessionService.getGameSession(sessionId);
      if (session.gameMasterId !== userId && !req.session.user.isAdmin) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Only the game master can start sessions'
        });
      }

      const updatedSession = await this.gameSessionService.startSession(sessionId, userId);
      
      return res.json({
        success: true,
        data: updatedSession
      });
    } catch (error) {
      console.error('Error in startGameSession controller:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to start game session'
      });
    }
  };

  pauseGameSession = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<IGameSession>>
  ): Promise<Response<BaseAPIResponse<IGameSession>> | void> => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;

      // Check if user is the game master
      const session = await this.gameSessionService.getGameSession(sessionId);
      if (session.gameMasterId !== userId && !req.session.user.isAdmin) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Only the game master can pause sessions'
        });
      }

      const updatedSession = await this.gameSessionService.pauseSession(sessionId, userId);
      
      // Emit WebSocket event to all session participants
      const socketServer = getSocketServer();
      const pauseEvent = {
        sessionId,
        pausedBy: userId,
        timestamp: Date.now()
      };
      socketServer.socketIo.to(`session:${sessionId}`).emit('gameSession:paused', pauseEvent);
      
      return res.json({
        success: true,
        data: updatedSession
      });
    } catch (error) {
      console.error('Error in pauseGameSession controller:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to pause game session'
      });
    }
  };

  resumeGameSession = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<IGameSession>>
  ): Promise<Response<BaseAPIResponse<IGameSession>> | void> => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;

      // Check if user is the game master
      const session = await this.gameSessionService.getGameSession(sessionId);
      if (session.gameMasterId !== userId && !req.session.user.isAdmin) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Only the game master can resume sessions'
        });
      }

      const updatedSession = await this.gameSessionService.resumeSession(sessionId, userId);
      
      // Emit WebSocket event to all session participants
      const socketServer = getSocketServer();
      const resumeEvent = {
        sessionId,
        resumedBy: userId,
        timestamp: Date.now()
      };
      socketServer.socketIo.to(`session:${sessionId}`).emit('gameSession:resumed', resumeEvent);
      
      return res.json({
        success: true,
        data: updatedSession
      });
    } catch (error) {
      console.error('Error in resumeGameSession controller:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to resume game session'
      });
    }
  };

  endGameSession = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<IGameSession>>
  ): Promise<Response<BaseAPIResponse<IGameSession>> | void> => {
    try {
      const sessionId = req.params.id;
      const userId = req.session.user.id;

      // Check if user is the game master
      const session = await this.gameSessionService.getGameSession(sessionId);
      if (session.gameMasterId !== userId && !req.session.user.isAdmin) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Only the game master can end sessions'
        });
      }

      const updatedSession = await this.gameSessionService.endSession(sessionId, userId);
      
      // Emit WebSocket event to all session participants
      const socketServer = getSocketServer();
      const endEvent = {
        sessionId,
        endedBy: userId,
        timestamp: Date.now()
      };
      socketServer.socketIo.to(`session:${sessionId}`).emit('gameSession:ended', endEvent);
      
      return res.json({
        success: true,
        data: updatedSession
      });
    } catch (error) {
      console.error('Error in endGameSession controller:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to end game session'
      });
    }
  };
}
