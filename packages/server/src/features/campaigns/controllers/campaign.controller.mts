import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';
import { CampaignService, QueryValue } from '../services/campaign.service.mjs';
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

export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  async getMyCampaigns(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Convert dot notation in query params to nested objects
      const query = Object.entries(req.query).reduce((acc, [key, value]) => {
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = acc;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current)) {
              current[parts[i]] = {};
            }
            current = current[parts[i]] as Record<string, unknown>;
          }
          current[parts[parts.length - 1]] = value;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);

      const campaigns = await this.campaignService.getMyCampaigns(
        req.session.user.id,
        query as Record<string, QueryValue>
      );
      return res.json(campaigns);
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      return res.status(500).json({ message: 'Failed to get campaigns' });
    }
  }

  async getCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const campaign = await this.campaignService.getCampaign(req.params.id);

      // Check if user has access to this campaign
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      return res.json(campaign);
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      logger.error('Error getting campaign:', error);
      return res.status(500).json({ message: 'Failed to get campaign' });
    }
  }

  async createCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const campaign = await this.campaignService.createCampaign(req.body, req.session.user.id);
      return res.status(201).json(campaign);
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Invalid game system') {
        return res.status(400).json({ message: 'Invalid game system' });
      }
      logger.error('Error creating campaign:', error);
      return res.status(500).json({ message: 'Failed to create campaign' });
    }
  }

  async putCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Check if user has permission to update
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updatedCampaign = await this.campaignService.putCampaign(
        req.params.id,
        req.body,
        req.session.user.id
      );

      return res.json(updatedCampaign);
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      logger.error('Error updating campaign:', error);
      return res.status(500).json({ message: 'Failed to update campaign' });
    }
  }

  async patchCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Check if user has permission to update
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updatedCampaign = await this.campaignService.patchCampaign(
        req.params.id,
        req.body,
        req.session.user.id
      );

      return res.json(updatedCampaign);
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      logger.error('Error patching campaign:', error);
      return res.status(500).json({ message: 'Failed to patch campaign' });
    }
  }

  async deleteCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      // Check if user has permission to delete
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await this.campaignService.deleteCampaign(req.params.id);
      return res.status(204).send();
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      logger.error('Error deleting campaign:', error);
      return res.status(500).json({ message: 'Failed to delete campaign' });
    }
  }
}
