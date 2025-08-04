import { NextFunction, Request, Response } from 'express';
import assetService, {
  NotFoundError,
  PermissionError,
  ValidationError
} from '../services/asset.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { IAsset } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Asset Controller - Handles HTTP requests for assets
 */
class AssetController {
  /**
   * List all assets for the current user
   */
  async listAssets(
    req: Request,
    res: Response<BaseAPIResponse<IAsset[]>>
  ): Promise<Response<BaseAPIResponse<IAsset[]>> | void> {
    try {
      const userId = req.session.user?.id;
      const assets = await assetService.getAssetsByUser(userId);

      return res.json({
        success: true,
        data: assets.map((asset) => asset.toPublicJSON()) as IAsset[]
      });
    } catch (error) {
      logger.error('Error listing assets', { error });
      return res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to list assets'
      });
    }
  }

  /**
   * Upload and create a new asset
   * @route POST /api/assets
   */
  async createAsset(
    req: Request,
    res: Response<BaseAPIResponse<IAsset>>,
    next: NextFunction
  ): Promise<Response<BaseAPIResponse<IAsset>> | void> {
    try {
      // Check if file exists
      if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({
          success: false,
          data: null,
          error: 'No file uploaded'
        });
      }

      // Get user ID from session
      const userId = req.session.user.id;

      // Create asset
      const asset = await assetService.createAsset(req.file, userId, req.body);

      // Return created asset
      return res.status(201).json({
        success: true,
        data: asset.toPublicJSON() as IAsset
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * Get an asset by ID
   * @route GET /api/assets/:id
   */
  async getAssetById(
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<IAsset>>
  ): Promise<Response<BaseAPIResponse<IAsset>> | void> {
    try {
      const assetId = req.params.id;
      const userId = req.session.user.id;

      const asset = await assetService.getAssetById(assetId, userId, true); // Skip permission check for GET requests

      return res.json({
        success: true,
        data: asset.toPublicJSON() as IAsset
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          data: null,
          error: error.message
        });
      } else if (error instanceof PermissionError) {
        return res.status(403).json({
          success: false,
          data: null,
          error: error.message
        });
      } else {
        logger.error('Error retrieving asset:', error);
        return res.status(500).json({
          success: false,
          data: null,
          error: 'Failed to retrieve asset'
        });
      }
    }
  }

  /**
   * Update an asset
   * @route PATCH /api/assets/:id
   */
  async updateAsset(
    req: Request<{ id: string }, object, Partial<IAsset>>,
    res: Response<BaseAPIResponse<IAsset>>
  ): Promise<Response<BaseAPIResponse<IAsset>> | void> {
    try {
      const assetId = req.params.id;
      const userId = req.session.user.id;

      const updatedAsset = await assetService.updateAsset(assetId, req.body, userId);

      return res.json({
        success: true,
        data: updatedAsset.toPublicJSON() as IAsset
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          data: null,
          error: error.message
        });
      } else if (error instanceof PermissionError) {
        return res.status(403).json({
          success: false,
          data: null,
          error: error.message
        });
      } else if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.message
        });
      } else {
        logger.error('Error updating asset:', error);
        return res.status(500).json({
          success: false,
          data: null,
          error: 'Failed to update asset'
        });
      }
    }
  }

  /**
   * Delete an asset
   * @route DELETE /api/assets/:id
   */
  async deleteAsset(
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<null>>
  ): Promise<Response<BaseAPIResponse<null>> | void> {
    try {
      const assetId = req.params.id;
      const userId = req.session.user.id;

      await assetService.deleteAsset(assetId, userId);

      return res.status(204).json({
        success: true,
        data: null
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          data: null,
          error: error.message
        });
      } else if (error instanceof PermissionError) {
        return res.status(403).json({
          success: false,
          data: null,
          error: error.message
        });
      } else {
        logger.error('Error deleting asset:', error);
        return res.status(500).json({
          success: false,
          data: null,
          error: 'Failed to delete asset'
        });
      }
    }
  }

  /**
   * Get a pre-signed URL for an asset
   * @route GET /api/assets/:id/signed-url
   */
  async getSignedUrl(
    req: Request<{ id: string }, object, object, { expiry?: string }>,
    res: Response<BaseAPIResponse<{ url: string }>>
  ): Promise<Response<BaseAPIResponse<{ url: string }>> | void> {
    try {
      const assetId = req.params.id;
      const userId = req.session.user.id;
      const expiryTimeSeconds = req.query.expiry ? parseInt(req.query.expiry, 10) : undefined;

      const signedUrl = await assetService.getSignedUrl(assetId, userId, expiryTimeSeconds);

      return res.json({
        success: true,
        data: { url: signedUrl }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          success: false,
          data: null,
          error: error.message
        });
      } else if (error instanceof PermissionError) {
        return res.status(403).json({
          success: false,
          data: null,
          error: error.message
        });
      } else {
        logger.error('Error generating signed URL:', error);
        return res.status(500).json({
          success: false,
          data: null,
          error: 'Failed to generate signed URL'
        });
      }
    }
  }
}

// Export a singleton instance
const assetController = new AssetController();
export default assetController;
