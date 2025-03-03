import { Request, Response } from 'express';
import { CampaignModel, CampaignDocument } from '../models/campaign.model.js';
import { logger } from '../utils/logger.js';
import { pluginRegistry } from '../services/plugin-registry.service.js';
import { CreateCampaignDto, UpdateCampaignDto } from '@dungeon-lab/shared/index.js';

/**
 * Interface extending the Express Request with a custom user property
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
}

/**
 * Campaign controller class
 */
export class CampaignController {
  /**
   * Get all campaigns for the current user
   */
  async getMyCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const campaigns = await CampaignModel.find({
        $or: [
          { createdBy: req.user.id }, // Campaigns where user is GM
          // Later we'll add memberships here
        ],
      }).sort({ updatedAt: -1 });

      res.json(campaigns);
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      res.status(500).json({
        message: 'Error retrieving campaigns',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get a campaign by ID
   */
  async getCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const campaign = await CampaignModel.findOne({
        _id: req.params.id,
        $or: [
          { createdBy: req.user.id }, // User is GM
          // Later we'll add memberships here
        ],
      });

      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found' });
        return;
      }

      res.json(campaign);
    } catch (error) {
      logger.error(`Error getting campaign ${req.params.id}:`, error);
      res.status(500).json({
        message: 'Error retrieving campaign',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a new campaign
   */
  async createCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const campaignData: CreateCampaignDto = req.body;

      // Validate that the game system exists
      const gameSystem = pluginRegistry.getGameSystemPlugin(campaignData.gameSystemId);
      if (!gameSystem) {
        res.status(400).json({ message: 'Invalid game system' });
        return;
      }

      // Create the campaign
      const campaign = await CampaignModel.create({
        ...campaignData,
        createdBy: req.user.id,
        status: campaignData.status || 'planning',
      });

      res.status(201).json(campaign);
    } catch (error) {
      logger.error('Error creating campaign:', error);
      res.status(500).json({
        message: 'Error creating campaign',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update a campaign
   */
  async updateCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const campaignData: UpdateCampaignDto = req.body;

      // Find and update the campaign, ensuring the user is the GM
      const campaign = await CampaignModel.findOneAndUpdate(
        {
          _id: req.params.id,
          createdBy: req.user.id, // Only the GM can update
        },
        { $set: campaignData },
        { new: true, runValidators: true }
      );

      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found or you are not the GM' });
        return;
      }

      res.json(campaign);
    } catch (error) {
      logger.error(`Error updating campaign ${req.params.id}:`, error);
      res.status(500).json({
        message: 'Error updating campaign',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete (archive) a campaign
   */
  async deleteCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      // In our case, deletion is just changing the status to archived
      const campaign = await CampaignModel.findOneAndUpdate(
        {
          _id: req.params.id,
          createdBy: req.user.id, // Only the GM can delete
        },
        { $set: { status: 'archived' } },
        { new: true }
      );

      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found or you are not the GM' });
        return;
      }

      res.json(campaign);
    } catch (error) {
      logger.error(`Error deleting campaign ${req.params.id}:`, error);
      res.status(500).json({
        message: 'Error deleting campaign',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
} 