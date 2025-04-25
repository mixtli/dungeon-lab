import { Request, Response } from 'express';
import { InviteService } from '../services/invite.service.mjs';
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

export class InviteController {
  constructor(private inviteService: InviteService) {}

  async getInvites(req: Request, res: Response): Promise<Response | void> {
    try {
      const invites = await this.inviteService.getInvites(req.params.campaignId);
      return res.json(invites);
    } catch (error) {
      logger.error('Error getting invites:', error);
      return res.status(500).json({ message: 'Failed to get invites' });
    }
  }

  async getMyInvites(req: Request, res: Response): Promise<Response | void> {
    try {
      const invites = await this.inviteService.getMyInvites(req.session.user.id);
      return res.json(invites);
    } catch (error) {
      logger.error('Error getting user invites:', error);
      return res.status(500).json({ message: 'Failed to get invites' });
    }
  }

  async createInvite(req: Request, res: Response): Promise<Response | void> {
    try {
      const invite = await this.inviteService.createInvite(
        req.body,
        req.params.campaignId,
        req.session.user.id
      );
      return res.status(201).json(invite);
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Only the game master can create invites') {
          return res.status(403).json({ message: error.message });
        }
        if (error.message === 'Invited user not found') {
          return res.status(404).json({ message: error.message });
        }
        if (
          error.message === 'User is already a member of this campaign' ||
          error.message === 'User already has a pending invite for this campaign'
        ) {
          return res.status(400).json({ message: error.message });
        }
      }
      logger.error('Error creating invite:', error);
      return res.status(500).json({ message: 'Failed to create invite' });
    }
  }

  async respondToInvite(req: Request, res: Response): Promise<Response | void> {
    try {
      const invite = await this.inviteService.respondToInvite(
        req.params.id,
        req.body.status,
        req.session.user.id,
        req.body.actorId
      );
      return res.json(invite);
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Invite not found or already processed') {
          return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Actor ID is required when accepting an invite') {
          return res.status(400).json({ message: error.message });
        }
      }
      logger.error('Error responding to invite:', error);
      return res.status(500).json({ message: 'Failed to respond to invite' });
    }
  }
}
