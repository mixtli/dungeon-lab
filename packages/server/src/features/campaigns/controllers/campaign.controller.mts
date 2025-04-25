import { Request, Response } from 'express';
import { CampaignService, QueryValue } from '../services/campaign.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import {
  GetCampaignsResponse,
  GetCampaignResponse,
  CreateCampaignRequest,
  CreateCampaignResponse,
  PutCampaignRequest,
  PutCampaignResponse,
  PatchCampaignRequest,
  PatchCampaignResponse,
  DeleteCampaignResponse,
  createCampaignRequestSchema,
  putCampaignRequestSchema,
  patchCampaignRequestSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { ZodError } from 'zod';

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

  async getMyCampaigns(
    req: Request,
    res: Response<GetCampaignsResponse>
  ): Promise<Response<GetCampaignsResponse> | void> {
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
      return res.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to get campaigns'
      });
    }
  }

  async getCampaign(
    req: Request,
    res: Response<GetCampaignResponse>
  ): Promise<Response<GetCampaignResponse> | void> {
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
          error: 'Campaign not found'
        });
      }
      logger.error('Error getting campaign:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get campaign'
      });
    }
  }

  async createCampaign(
    req: Request<object, object, CreateCampaignRequest>,
    res: Response<CreateCampaignResponse>
  ): Promise<Response<CreateCampaignResponse> | void> {
    try {
      // Validate request body
      const validatedData = createCampaignRequestSchema.parse(req.body);

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
          error: JSON.parse(error.message)
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Invalid game system') {
        return res.status(400).json({
          success: false,
          error: 'Invalid game system'
        });
      }
      logger.error('Error creating campaign:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create campaign'
      });
    }
  }

  async putCampaign(
    req: Request<{ id: string }, object, PutCampaignRequest>,
    res: Response<PutCampaignResponse>
  ): Promise<Response<PutCampaignResponse> | void> {
    try {
      // Validate request body
      const validatedData = putCampaignRequestSchema.parse(req.body);

      // Check if user has permission to update
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const updatedCampaign = await this.campaignService.putCampaign(
        req.params.id,
        validatedData,
        req.session.user.id
      );

      return res.json({
        success: true,
        data: updatedCampaign
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: JSON.parse(error.message)
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
      logger.error('Error updating campaign:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update campaign'
      });
    }
  }

  async patchCampaign(
    req: Request<{ id: string }, object, PatchCampaignRequest>,
    res: Response<PatchCampaignResponse>
  ): Promise<Response<PatchCampaignResponse> | void> {
    try {
      // Validate request body
      const validatedData = patchCampaignRequestSchema.parse(req.body);

      // Check if user has permission to update
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const updatedCampaign = await this.campaignService.patchCampaign(
        req.params.id,
        validatedData,
        req.session.user.id
      );

      return res.json({
        success: true,
        data: updatedCampaign
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: JSON.parse(error.message)
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
      logger.error('Error patching campaign:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to patch campaign'
      });
    }
  }

  async deleteCampaign(
    req: Request,
    res: Response<DeleteCampaignResponse>
  ): Promise<Response<DeleteCampaignResponse> | void> {
    try {
      // Check if user has permission to delete
      const hasAccess = await this.campaignService.checkUserPermission(
        req.params.id,
        req.session.user.id,
        req.session.user.isAdmin
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await this.campaignService.deleteCampaign(req.params.id);
      return res.status(204).send();
    } catch (error) {
      if (isErrorWithMessage(error) && error.message === 'Campaign not found') {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
      logger.error('Error deleting campaign:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete campaign'
      });
    }
  }
}
