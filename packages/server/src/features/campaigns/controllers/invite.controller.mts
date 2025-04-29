import { Request, Response } from 'express';
import { InviteService } from '../services/invite.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import {
  BaseAPIResponse,
  createInviteRequestSchema,
  respondToInviteRequestSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { IInvite } from '@dungeon-lab/shared/schemas/invite.schema.mjs';
import { z } from 'zod';
import { isErrorWithMessage } from '../../../utils/error.mjs';

export class InviteController {
  constructor(private inviteService: InviteService) {}

  async getInvites(
    req: Request,
    res: Response<BaseAPIResponse<IInvite[]>>
  ): Promise<Response<BaseAPIResponse<IInvite[]>> | void> {
    try {
      const invites = await this.inviteService.getInvites(req.params.campaignId);
      return res.json({
        success: true,
        data: invites
      });
    } catch (error) {
      logger.error('Error getting invites:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get invites'
      });
    }
  }

  async getMyInvites(
    req: Request,
    res: Response<BaseAPIResponse<IInvite[]>>
  ): Promise<Response<BaseAPIResponse<IInvite[]>> | void> {
    try {
      const invites = await this.inviteService.getMyInvites(req.session.user.id);
      return res.json({
        success: true,
        data: invites
      });
    } catch (error) {
      logger.error('Error getting user invites:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get invites'
      });
    }
  }

  async createInvite(
    req: Request<{ campaignId: string }, object, z.infer<typeof createInviteRequestSchema>>,
    res: Response<BaseAPIResponse<IInvite>>
  ): Promise<Response<BaseAPIResponse<IInvite>> | void> {
    try {
      const invite = await this.inviteService.createInvite(
        req.body,
        req.params.campaignId,
        req.session.user.id
      );
      return res.status(201).json({
        success: true,
        data: invite
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Only the game master can create invites') {
          return res.status(403).json({
            success: false,
            data: null,
            error: error.message
          });
        }
        if (error.message === 'Invited user not found') {
          return res.status(404).json({
            success: false,
            data: null,
            error: error.message
          });
        }
        if (
          error.message === 'User is already a member of this campaign' ||
          error.message === 'User already has a pending invite for this campaign'
        ) {
          return res.status(400).json({
            success: false,
            data: null,
            error: error.message
          });
        }
      }
      logger.error('Error creating invite:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to create invite'
      });
    }
  }

  async respondToInvite(
    req: Request<{ id: string }, object, z.infer<typeof respondToInviteRequestSchema>>,
    res: Response<BaseAPIResponse<IInvite>>
  ): Promise<Response<BaseAPIResponse<IInvite>> | void> {
    try {
      const invite = await this.inviteService.respondToInvite(
        req.params.id,
        req.body.status,
        req.session.user.id,
        req.body.actorId
      );
      return res.json({
        success: true,
        data: invite
      });
    } catch (error) {
      if (isErrorWithMessage(error)) {
        if (error.message === 'Invite not found or already processed') {
          return res.status(404).json({
            success: false,
            data: null,
            error: error.message
          });
        }
        if (error.message === 'Actor ID is required when accepting an invite') {
          return res.status(400).json({
            success: false,
            data: null,
            error: error.message
          });
        }
      }
      logger.error('Error responding to invite:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to respond to invite'
      });
    }
  }
}
