import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';
import { EncounterService } from '../services/encounter.service.mjs';
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

export class EncounterController {
  constructor(private encounterService: EncounterService) {}

  async getEncounters(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const encounters = await this.encounterService.getEncounters(req.params.campaignId);
      return res.json(encounters);
    } catch (error) {
      logger.error('Error getting encounters:', error);
      return res.status(500).json({ message: 'Failed to get encounters' });
    }
  }

  async getEncounter(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const encounter = await this.encounterService.getEncounter(req.params.id, req.params.campaignId);
      
      // Check if user has access to this encounter
      const hasAccess = await this.encounterService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      return res.json(encounter);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Encounter not found') {
          return res.status(404).json({ message: 'Encounter not found' });
        }
        logger.error('Error getting encounter:', error);
        return res.status(500).json({ message: error.message });
      }
      logger.error('Unknown error getting encounter:', error);
      return res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }

  async createEncounter(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const encounter = await this.encounterService.createEncounter(
        req.body,
        req.params.campaignId,
        req.session.user.id
      );
      return res.status(201).json(encounter);
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Campaign not found') {
          return res.status(404).json({ message: 'Campaign not found' });
        }
        if (error.message === 'Only the game master can create encounters') {
          return res.status(403).json({ message: 'Only the game master can create encounters' });
        }
      }
      logger.error('Error creating encounter:', error);
      return res.status(500).json({ message: 'Failed to create encounter' });
    }
  }

  async updateEncounter(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Check if user has permission to update
      const hasAccess = await this.encounterService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updatedEncounter = await this.encounterService.updateEncounter(
        req.params.id,
        req.body,
        req.session.user.id
      );

      return res.json(updatedEncounter);
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Encounter not found') {
        return res.status(404).json({ message: 'Encounter not found' });
      }
      logger.error('Error updating encounter:', error);
      return res.status(500).json({ message: 'Failed to update encounter' });
    }
  }

  async deleteEncounter(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Check if user has permission to delete
      const hasAccess = await this.encounterService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await this.encounterService.deleteEncounter(req.params.id);
      return res.status(204).send();
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Encounter not found') {
        return res.status(404).json({ message: 'Encounter not found' });
      }
      logger.error('Error deleting encounter:', error);
      return res.status(500).json({ message: 'Failed to delete encounter' });
    }
  }
} 