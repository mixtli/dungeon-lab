import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../utils/logger.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { z } from 'zod';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import {
  createEncounterSchema,
  updateEncounterSchema
} from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import { EncounterService } from '../services/encounters.service.mjs';

// Define request types
type CreateEncounterData = z.infer<typeof createEncounterSchema>;
type UpdateEncounterData = z.infer<typeof updateEncounterSchema>;

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

} 