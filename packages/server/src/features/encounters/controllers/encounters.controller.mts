import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../utils/logger.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { IEncounter, IToken } from '@dungeon-lab/shared/types/index.mjs';
import { z } from 'zod';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import {
  createEncounterSchema,
  updateEncounterSchema
} from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import {
  createTokenSchema,
  updateTokenSchema
} from '@dungeon-lab/shared/schemas/tokens.schema.mjs';
import { EncounterService } from '../services/encounters.service.mjs';

// Define request types
type CreateEncounterData = z.infer<typeof createEncounterSchema>;
type UpdateEncounterData = z.infer<typeof updateEncounterSchema>;
type CreateTokenData = z.infer<typeof createTokenSchema>;
type UpdateTokenData = z.infer<typeof updateTokenSchema>;

export class EncounterController {
  constructor(private encounterService: EncounterService) {}

  // ============================================================================
  // ENCOUNTER CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all encounters, optionally filtered by campaignId
   */
  getEncounters = async (
    req: Request<object, object, object, { campaignId?: string }>,
    res: Response<BaseAPIResponse<IEncounter[]>>,
    next: NextFunction
  ): Promise<Response<BaseAPIResponse<IEncounter[]>> | void> => {
    try {
      const { campaignId } = req.query;
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const encounters = await this.encounterService.getEncounters(
        userId,
        isAdmin,
        campaignId
      );

      return res.json({
        success: true,
        data: encounters
      });
    } catch (error) {
      logger.error('Error getting encounters:', error);
      next(error);
    }
  };

  /**
   * Get a specific encounter by ID
   */
  getEncounter = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<IEncounter>>,
    next: NextFunction
  ): Promise<Response<BaseAPIResponse<IEncounter>> | void> => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const encounter = await this.encounterService.getEncounter(id, userId, isAdmin);

      return res.json({
        success: true,
        data: encounter
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
      }
      logger.error('Error getting encounter:', error);
      next(error);
    }
  };

  /**
   * Create a new encounter
   */
  createEncounter = async (
    req: Request<object, object, CreateEncounterData>,
    res: Response<BaseAPIResponse<IEncounter>>
  ): Promise<Response<BaseAPIResponse<IEncounter>> | void> => {
    try {
      const validatedData = await createEncounterSchema.parseAsync(req.body);
      const userId = req.session.user.id;

      const encounter = await this.encounterService.createEncounter(
        validatedData,
        userId
      );

      return res.status(201).json({
        success: true,
        data: encounter
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
          data: null
        });
      }
      if (isErrorWithMessage(error)) {
        if (error.message === 'Campaign not found') {
          return res.status(404).json({
            success: false,
            error: 'Campaign not found',
            data: null
          });
        }
        if (error.message === 'Only the game master can create encounters') {
          return res.status(403).json({
            success: false,
            error: 'Only the game master can create encounters',
            data: null
          });
        }
        if (error.message === 'Map not found') {
          return res.status(404).json({
            success: false,
            error: 'Map not found',
            data: null
          });
        }
      }
      logger.error('Error creating encounter:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create encounter',
        data: null
      });
    }
  };

  /**
   * Update an encounter
   */
  updateEncounter = async (
    req: Request<{ id: string }, object, UpdateEncounterData>,
    res: Response<BaseAPIResponse<IEncounter>>
  ): Promise<Response<BaseAPIResponse<IEncounter>> | void> => {
    try {
      const { id } = req.params;
      const validatedData = await updateEncounterSchema.parseAsync(req.body);
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const updatedEncounter = await this.encounterService.updateEncounter(
        id,
        validatedData,
        userId,
        isAdmin
      );

      return res.json({
        success: true,
        data: updatedEncounter
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
          data: null
        });
      }
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
        if (error.message === 'Version conflict') {
          return res.status(409).json({
            success: false,
            error: 'Version conflict - encounter was modified by another user',
            data: null
          });
        }
      }
      logger.error('Error updating encounter:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update encounter',
        data: null
      });
    }
  };

  /**
   * Delete an encounter
   */
  deleteEncounter = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<null>>,
    next: NextFunction
  ): Promise<Response<BaseAPIResponse<null>> | void> => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      await this.encounterService.deleteEncounter(id, userId, isAdmin);

      return res.json({
        success: true,
        data: null
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
      }
      logger.error('Error deleting encounter:', error);
      next(error);
    }
  };

  // ============================================================================
  // ENCOUNTER STATUS MANAGEMENT
  // ============================================================================

  /**
   * Update encounter status
   */
  updateEncounterStatus = async (
    req: Request<{ id: string }, object, { status: string }>,
    res: Response<BaseAPIResponse<IEncounter>>
  ): Promise<Response<BaseAPIResponse<IEncounter>> | void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const updatedEncounter = await this.encounterService.updateEncounterStatus(
        id,
        status,
        userId,
        isAdmin
      );

      return res.json({
        success: true,
        data: updatedEncounter
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
        if (error.message === 'Invalid status') {
          return res.status(400).json({
            success: false,
            error: 'Invalid status',
            data: null
          });
        }
      }
      logger.error('Error updating encounter status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update encounter status',
        data: null
      });
    }
  };

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Get all tokens for an encounter
   */
  getTokens = async (
    req: Request<{ encounterId: string }>,
    res: Response<BaseAPIResponse<IToken[]>>,
    next: NextFunction
  ): Promise<Response<BaseAPIResponse<IToken[]>> | void> => {
    try {
      const { encounterId } = req.params;
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const tokens = await this.encounterService.getTokens(encounterId, userId, isAdmin);

      return res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
      }
      logger.error('Error getting tokens:', error);
      next(error);
    }
  };

  /**
   * Create a new token in an encounter
   */
  createToken = async (
    req: Request<{ encounterId: string }, object, CreateTokenData>,
    res: Response<BaseAPIResponse<IToken>>
  ): Promise<Response<BaseAPIResponse<IToken>> | void> => {
    try {
      const { encounterId } = req.params;
      const validatedData = await createTokenSchema.parseAsync(req.body);
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const token = await this.encounterService.createToken(
        encounterId,
        validatedData,
        userId,
        isAdmin
      );

      return res.status(201).json({
        success: true,
        data: token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
          data: null
        });
      }
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
        if (error.message === 'Invalid position') {
          return res.status(400).json({
            success: false,
            error: 'Invalid token position',
            data: null
          });
        }
      }
      logger.error('Error creating token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create token',
        data: null
      });
    }
  };

  /**
   * Update a token
   */
  updateToken = async (
    req: Request<{ encounterId: string; tokenId: string }, object, UpdateTokenData>,
    res: Response<BaseAPIResponse<IToken>>
  ): Promise<Response<BaseAPIResponse<IToken>> | void> => {
    try {
      const { encounterId, tokenId } = req.params;
      const validatedData = await updateTokenSchema.parseAsync(req.body);
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const updatedToken = await this.encounterService.updateToken(
        encounterId,
        tokenId,
        validatedData,
        userId,
        isAdmin
      );

      return res.json({
        success: true,
        data: updatedToken
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
          data: null
        });
      }
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Token not found') {
          return res.status(404).json({
            success: false,
            error: 'Token not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
        if (error.message === 'Invalid position') {
          return res.status(400).json({
            success: false,
            error: 'Invalid token position',
            data: null
          });
        }
      }
      logger.error('Error updating token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update token',
        data: null
      });
    }
  };

  /**
   * Delete a token
   */
  deleteToken = async (
    req: Request<{ encounterId: string; tokenId: string }>,
    res: Response<BaseAPIResponse<null>>,
    next: NextFunction
  ): Promise<Response<BaseAPIResponse<null>> | void> => {
    try {
      const { encounterId, tokenId } = req.params;
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      await this.encounterService.deleteToken(encounterId, tokenId, userId, isAdmin);

      return res.json({
        success: true,
        data: null
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Token not found') {
          return res.status(404).json({
            success: false,
            error: 'Token not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
      }
      logger.error('Error deleting token:', error);
      next(error);
    }
  };

  /**
   * Create a token from an actor
   */
  createTokenFromActor = async (
    req: Request<
      { encounterId: string },
      object,
      { actorId: string; position: { x: number; y: number } }
    >,
    res: Response<BaseAPIResponse<IToken>>
  ): Promise<Response<BaseAPIResponse<IToken>> | void> => {
    try {
      const { encounterId } = req.params;
      const { actorId, position } = req.body;
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const token = await this.encounterService.createTokenFromActor(
        encounterId,
        actorId,
        {
          userId,
          isAdmin,
          position
        }
      );

      return res.status(201).json({
        success: true,
        data: token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
          data: null
        });
      }
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Actor not found') {
          return res.status(404).json({
            success: false,
            error: 'Actor not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
        if (error.message === 'Invalid position') {
          return res.status(400).json({
            success: false,
            error: 'Invalid token position',
            data: null
          });
        }
      }
      logger.error('Error creating token from actor:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create token from actor',
        data: null
      });
    }
  };

  /**
   * Duplicate a token multiple times
   */
  duplicateToken = async (
    req: Request<
      { encounterId: string; tokenId: string },
      object,
      { count?: number; offsetX?: number; offsetY?: number }
    >,
    res: Response<BaseAPIResponse<IToken[]>>
  ): Promise<Response<BaseAPIResponse<IToken[]>> | void> => {
    try {
      const { encounterId, tokenId } = req.params;
      const { count = 1, offsetX = 1, offsetY = 0 } = req.body;
      const userId = req.session.user.id;
      const isAdmin = req.session.user.isAdmin;

      const tokens = await this.encounterService.duplicateToken(
        encounterId,
        tokenId,
        count,
        offsetX,
        offsetY,
        userId,
        isAdmin
      );

      return res.status(201).json({
        success: true,
        data: tokens
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
          data: null
        });
      }
      if (isErrorWithMessage(error)) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({
            success: false,
            error: 'Encounter not found',
            data: null
          });
        }
        if (error.message === 'Token not found') {
          return res.status(404).json({
            success: false,
            error: 'Token not found',
            data: null
          });
        }
        if (error.message === 'Access denied') {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
            data: null
          });
        }
        if (error.message === 'Invalid duplication count (must be between 1 and 20)') {
          return res.status(400).json({
            success: false,
            error: 'Invalid duplication count (must be between 1 and 20)',
            data: null
          });
        }
      }
      logger.error('Error duplicating token:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to duplicate token',
        data: null
      });
    }
  };
} 