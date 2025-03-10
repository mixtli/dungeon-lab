import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware.mjs';
import { ActorModel } from '../models/actor.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import InviteModel from '../models/invite.model.mjs';
import { logger } from '../utils/logger.mjs';
import type { CampaignDocument } from '../models/campaign.model.mjs';

// Create invite
export async function createInvite(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const inviteData = {
      ...req.body,
      createdBy: req.session.user.id,
      updatedBy: req.session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    const invite = await InviteModel.create(inviteData);
    
    // TODO: Send email to invited user
    
    return res.status(201).json(invite);
  } catch (error) {
    logger.error('Error creating invite:', error);
    return res.status(500).json({ message: 'Failed to create invite' });
  }
}

// Get invites for a campaign
export async function getCampaignInvites(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    // Validate campaignId
    const { campaignId } = await z.object({
      campaignId: z.string().min(1)
    }).parseAsync(req.params);

    const invites = await InviteModel.find({
      campaignId,
      status: 'pending'
    });
    
    return res.json(invites);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid campaign ID' });
    }
    logger.error('Error fetching invites:', error);
    return res.status(500).json({ message: 'Failed to fetch invites' });
  }
}

// Get invites for the current user
export async function getMyInvites(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const invites = await InviteModel.find({
      email: req.session.user.email,
      status: 'pending'
    }).populate('campaignId', 'name description gameSystemId');
    
    return res.json(invites);
  } catch (error) {
    logger.error('Error fetching user invites:', error);
    return res.status(500).json({ message: 'Failed to fetch invites' });
  }
}

// Respond to an invite (accept or decline)
export async function respondToInvite(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
  try {
    const invite = await InviteModel.findOne({
      _id: req.params.inviteId,
      email: req.session.user.email,
      status: 'pending'
    }).populate<{ campaignId: CampaignDocument }>('campaignId');

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    const { status, actorId } = req.body;

    if (status === 'accepted') {
      if (!actorId) {
        return res.status(400).json({ message: 'Actor ID is required when accepting an invite' });
      }

      // Verify actor exists and belongs to user
      const actor = await ActorModel.findOne({
        _id: actorId,
        createdBy: req.session.user.id
      });

      if (!actor) {
        return res.status(404).json({ message: 'Actor not found' });
      }

      // Verify actor's game system matches campaign's game system
      if (actor.gameSystemId !== invite.campaignId.gameSystemId) {
        return res.status(400).json({ 
          message: 'Actor game system does not match campaign game system',
          requiredGameSystem: invite.campaignId.gameSystemId
        });
      }

      // Check if user already has a character in this campaign
      const existingActor = await ActorModel.findOne({
        _id: { $in: invite.campaignId.members },
        createdBy: req.session.user.id
      });

      if (existingActor) {
        return res.status(400).json({ 
          message: 'You already have a character in this campaign',
          existingCharacter: existingActor.name
        });
      }

      // Add actor to campaign members
      await CampaignModel.updateOne(
        { _id: invite.campaignId._id },
        { $push: { members: actorId } }
      );

      // Update invite status
      invite.status = status;
      invite.updatedBy = req.session.user.id;
      await invite.save();

      return res.json(invite);
    } else if (status === 'declined') {
      // Update invite status
      invite.status = status;
      invite.updatedBy = req.session.user.id;
      await invite.save();

      return res.json(invite);
    }
  } catch (error) {
    logger.error('Error responding to invite:', error);
    return res.status(500).json({ message: 'Failed to respond to invite' });
  }
} 