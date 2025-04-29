import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { BaseAPIResponse, IGameSession } from '@dungeon-lab/shared/types/api/index.mjs';
import { ZodError } from 'zod';
import {
  ICampaign,
  ICampaignCreateData,
  ICampaignPatchData
} from '@dungeon-lab/shared/types/index.mjs';
import { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import { createSearchParams } from '../../../utils/create.search.params.mjs';
import { SearchCampaignsQuery } from '@dungeon-lab/shared/types/api/index.mjs';
import {
  campaignCreateSchema,
  campaignPatchSchema
} from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
import { QueryValue } from '@dungeon-lab/shared/types/index.mjs';

export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  getMyCampaigns = async (
    req: Request<object, object, object, SearchCampaignsQuery>,
    res: Response<BaseAPIResponse<ICampaign[]>>
  ): Promise<Response<BaseAPIResponse<ICampaign[]>> | void> => {
    try {
      // Convert dot notation in query params to nested objects
      const query = createSearchParams(req.query as Record<string, QueryValue>);

      const campaigns = await this.campaignService.getMyCampaigns(req.session.user.id, query);
      return res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to get campaigns'
      });
    }
  };

  getCampaign = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<ICampaign>>
  ): Promise<Response<BaseAPIResponse<ICampaign>> | void> => {
    try {
      const campaign = await this.campaignService.getCampaign(req.params.id);

      // Check if user has access to this campaign
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Access denied'
        });
      }

      return res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Campaign not found'
        });
      }
      logger.error('Error getting campaign:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to get campaign'
      });
    }
  };

  createCampaign = async (
    req: Request<unknown, unknown, ICampaignCreateData>,
    res: Response<BaseAPIResponse<ICampaign>>
  ): Promise<Response<BaseAPIResponse<ICampaign>> | void> => {
    try {
      const validatedData = await campaignCreateSchema.parseAsync(req.body);
      const campaign = await this.campaignService.createCampaign(
        validatedData,
        req.session.user.id
      );
      return res.status(201).json({
        success: true,
        data: campaign
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      logger.error('Error creating campaign:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to create campaign'
      });
    }
  };

  putCampaign = async (
    req: Request<{ id: string }, unknown, ICampaignCreateData>,
    res: Response<BaseAPIResponse<ICampaign>>
  ): Promise<Response<BaseAPIResponse<ICampaign>> | void> => {
    try {
      const validatedData = await campaignCreateSchema.parseAsync(req.body);

      // Check if user has access to this campaign
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Access denied'
        });
      }

      const campaign = await this.campaignService.updateCampaign(
        req.params.id,
        validatedData,
        req.session.user.id
      );
      return res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Campaign not found'
        });
      }
      logger.error('Error updating campaign:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to update campaign'
      });
    }
  };

  patchCampaign = async (
    req: Request<{ id: string }, object, ICampaignPatchData>,
    res: Response<BaseAPIResponse<ICampaign>>
  ): Promise<Response<BaseAPIResponse<ICampaign>> | void> => {
    try {
      const validatedData = await campaignPatchSchema.parseAsync(req.body);

      // Check if user has access to this campaign
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Access denied'
        });
      }

      const campaign = await this.campaignService.patchCampaign(
        req.params.id,
        validatedData,
        req.session.user.id
      );
      return res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Campaign not found'
        });
      }
      logger.error('Error patching campaign:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to patch campaign'
      });
    }
  };

  deleteCampaign = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      // Check if user has access to this campaign
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          data: null,
          error: 'Access denied'
        });
      }

      await this.campaignService.deleteCampaign(req.params.id);
      return res.json({
        success: true,
        data: null
      });
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Campaign not found'
        });
      }
      logger.error('Error deleting campaign:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to delete campaign'
      });
    }
  };

  /**
   * Get the active game session for a campaign
   */
  getActiveCampaignSession = async (
    req: Request<{ campaignId: string }>,
    res: Response<BaseAPIResponse<IGameSession | null>>
  ): Promise<Response<BaseAPIResponse<IGameSession | null>> | void> => {
    try {
      // Check if user has permission to access this campaign
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.campaignId,
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

      const session = await this.campaignService.getActiveCampaignSession(req.params.campaignId);

      return res.json({
        success: true,
        data: session
      });
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found',
          data: null
        });
      }
      logger.error('Error getting active campaign session:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get active campaign session',
        data: null
      });
    }
  };

  /**
   * Get the active encounter for a campaign
   */
  getActiveCampaignEncounter = async (
    req: Request<{ campaignId: string }>,
    res: Response<BaseAPIResponse<IEncounter | null>>
  ): Promise<Response<BaseAPIResponse<IEncounter | null>> | void> => {
    try {
      // Check if user has permission to access this campaign
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.campaignId,
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

      const encounter = await this.campaignService.getActiveCampaignEncounter(
        req.params.campaignId
      );

      return res.json({
        success: true,
        data: encounter
      });
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found',
          data: null
        });
      }
      logger.error('Error getting active campaign encounter:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get active campaign encounter',
        data: null
      });
    }
  };
}
