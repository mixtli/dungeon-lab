import { Request, Response } from 'express';
import { EncounterService } from '../services/encounter.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { z } from 'zod';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import {
  encounterCreateSchema,
  encounterPatchSchema
} from '@dungeon-lab/shared/schemas/encounter.schema.mjs';

// Define encounter creation type
type IEncounterCreateData = z.infer<typeof encounterCreateSchema>;
type IEncounterPatchData = z.infer<typeof encounterPatchSchema>;

export class EncounterController {
  constructor(private encounterService: EncounterService) {}

  getEncounters = async (
    req: Request<object, object, object, { campaignId?: string }>,
    res: Response<BaseAPIResponse<IEncounter[]>>
  ): Promise<Response<BaseAPIResponse<IEncounter[]>> | void> => {
    try {
      const campaignId = req.query.campaignId;
      let encounters: IEncounter[] = [];

      if (campaignId) {
        encounters = await this.encounterService.getEncounters(campaignId);
      } else {
        // If no campaignId is provided, get all encounters
        // Implementation note: We should add a method to get all encounters
        // in the service. For now, we'll return an empty array
        encounters = [];
      }

      return res.json({
        success: true,
        data: encounters
      });
    } catch (error) {
      logger.error('Error getting encounters:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get encounters'
      });
    }
  };

  getEncounter = async (
    req: Request<{ id: string }, object, object, { campaignId?: string }>,
    res: Response<BaseAPIResponse<IEncounter>>
  ): Promise<Response<BaseAPIResponse<IEncounter>> | void> => {
    try {
      // If we have a campaignId in the query params, use it, otherwise we need to handle this case
      const campaignId = req.query.campaignId;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required',
          data: null
        });
      }

      const encounter = await this.encounterService.getEncounter(req.params.id, campaignId);

      // Check if user has access to this encounter
      const hasAccess = await this.encounterService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          data: null
        });
      }

      return res.json({
        success: true,
        data: encounter
      });
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Encounter not found') {
        return res.status(404).json({
          success: false,
          error: 'Encounter not found',
          data: null
        });
      }
      logger.error('Error getting encounter:', error);
      return res.status(500).json({
        success: false,
        error: 'An unexpected error occurred',
        data: null
      });
    }
  };

  createEncounter = async (
    req: Request<object, object, IEncounterCreateData>,
    res: Response<BaseAPIResponse<IEncounter>>
  ): Promise<Response<BaseAPIResponse<IEncounter>> | void> => {
    try {
      const validatedData = await encounterCreateSchema.parseAsync(req.body);
      const campaignId = req.body.campaignId;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          error: 'Campaign ID is required',
          data: null
        });
      }

      const encounter = await this.encounterService.createEncounter(
        validatedData,
        campaignId,
        req.session.user.id
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
      }
      logger.error('Error creating encounter:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create encounter',
        data: null
      });
    }
  };

  updateEncounter = async (
    req: Request<{ id: string }, object, IEncounterPatchData>,
    res: Response<BaseAPIResponse<IEncounter>>
  ): Promise<Response<BaseAPIResponse<IEncounter>> | void> => {
    try {
      const validatedData = await encounterPatchSchema.parseAsync(req.body);

      // Check if user has permission to update
      const hasAccess = await this.encounterService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          data: null
        });
      }

      const updatedEncounter = await this.encounterService.updateEncounter(
        req.params.id,
        validatedData,
        req.session.user.id
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
      if (isErrorWithMessage(error) && error.message === 'Encounter not found') {
        return res.status(404).json({
          success: false,
          error: 'Encounter not found',
          data: null
        });
      }
      logger.error('Error updating encounter:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update encounter',
        data: null
      });
    }
  };

  deleteEncounter = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      // Check if user has permission to delete
      const hasAccess = await this.encounterService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          data: null
        });
      }

      await this.encounterService.deleteEncounter(req.params.id);
      return res.status(204).send();
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Encounter not found') {
        return res.status(404).json({
          success: false,
          error: 'Encounter not found',
          data: null
        });
      }
      logger.error('Error deleting encounter:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete encounter',
        data: null
      });
    }
  };
}
