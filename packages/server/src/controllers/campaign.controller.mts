import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CampaignModel, CampaignDocument } from '../models/campaign.model.mjs';
import { AuthenticatedRequest } from '../middleware/auth.middleware.mjs';
import { ICampaignCreateData, ICampaignUpdateData } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../utils/logger.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';

// Get campaigns for the current user
export async function getMyCampaigns(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const userId = new Types.ObjectId(req.session.user.id);
    const campaigns = await CampaignModel.find({
      $or: [
        { gameMasterId: userId },
        { members: userId }
      ]
    }).exec();
    return res.json(campaigns);
  } catch (error) {
    logger.error('Error getting campaigns:', error);
    return res.status(500).json({ message: 'Failed to get campaigns' });
  }
}

// Get a specific campaign
export async function getCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const campaign = await CampaignModel.findById(req.params.id).exec();
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user has access to this campaign
    const userId = new Types.ObjectId(req.session.user.id);
    if (campaign.gameMasterId.toString() !== userId.toString() && !campaign.members.some(m => m.toString() === userId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json(campaign);
  } catch (error) {
    logger.error('Error getting campaign:', error);
    return res.status(500).json({ message: 'Failed to get campaign' });
  }
}

// Create a new campaign
export async function createCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const userId = new Types.ObjectId(req.session.user.id);
    const campaignData: ICampaignCreateData = {
      ...req.body,
      gameMasterId: userId,
      members: [userId],
      createdBy: userId,
      updatedBy: userId
    };

    // Validate that the game system exists
    const gameSystem = pluginRegistry.getGameSystemPlugin(campaignData.gameSystemId.toString());
    if (!gameSystem) {
      return res.status(400).json({ message: 'Invalid game system' });
    }

    const campaign = await CampaignModel.create(campaignData);
    return res.status(201).json(campaign);
  } catch (error) {
    logger.error('Error creating campaign:', error);
    return res.status(500).json({ message: 'Failed to create campaign' });
  }
}

// Update a campaign
export async function updateCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const campaign = await CampaignModel.findById(req.params.id).exec();
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user has permission to update
    const userId = new Types.ObjectId(req.session.user.id);
    if (campaign.gameMasterId.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData: ICampaignUpdateData = {
      ...req.body,
      updatedBy: userId
    };

    const updatedCampaign = await CampaignModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).exec();

    return res.json(updatedCampaign);
  } catch (error) {
    logger.error('Error updating campaign:', error);
    return res.status(500).json({ message: 'Failed to update campaign' });
  }
}

// Delete a campaign
export async function deleteCampaign(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const campaign = await CampaignModel.findById(req.params.id).exec();
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Check if user has permission to delete
    const userId = new Types.ObjectId(req.session.user.id);
    if (campaign.gameMasterId.toString() !== userId.toString() && !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await CampaignModel.findByIdAndDelete(req.params.id).exec();
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting campaign:', error);
    return res.status(500).json({ message: 'Failed to delete campaign' });
  }
}