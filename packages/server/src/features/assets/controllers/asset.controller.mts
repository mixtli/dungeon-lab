import { Response, NextFunction } from 'express';
import assetService, { NotFoundError, PermissionError, ValidationError } from '../services/asset.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';

/**
 * Asset Controller - Handles HTTP requests for assets
 */
class AssetController {
  /**
   * List all assets for the current user
   */
  async listAssets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.session.user?.id;
      const assets = await assetService.getAssetsByUser(userId);
      res.json(assets.map(asset => asset.toPublicJSON()));
    } catch (error) {
      logger.error('Error listing assets', { error });
      next(error);
    }
  }

  /**
   * Upload and create a new asset
   * @route POST /api/assets
   */
  async createAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if file exists
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded' });
        return;
      }

      // Get user ID from session
      const userId = req.session.user.id;

      // Create asset
      const asset = await assetService.createAsset(
        req.file,
        userId,
        req.body
      );

      // Return created asset
      res.status(201).json(asset.toPublicJSON());
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ message: error.message });
      } else {
        logger.error('Error creating asset:', error);
        next(error);
      }
    }
  }

  /**
   * Get an asset by ID
   * @route GET /api/assets/:id
   */
  async getAssetById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = req.params.id;
      const userId = req.session.user.id;

      const asset = await assetService.getAssetById(assetId, userId);
      res.json(asset.toPublicJSON());
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof PermissionError) {
        res.status(403).json({ message: error.message });
      } else {
        logger.error('Error retrieving asset:', error);
        next(error);
      }
    }
  }

  /**
   * Update an asset
   * @route PUT /api/assets/:id
   */
  async updateAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = req.params.id;
      const userId = req.session.user.id;

      const updatedAsset = await assetService.updateAsset(assetId, req.body, userId);
      res.json(updatedAsset.toPublicJSON());
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof PermissionError) {
        res.status(403).json({ message: error.message });
      } else if (error instanceof ValidationError) {
        res.status(400).json({ message: error.message });
      } else {
        logger.error('Error updating asset:', error);
        next(error);
      }
    }
  }

  /**
   * Delete an asset
   * @route DELETE /api/assets/:id
   */
  async deleteAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = req.params.id;
      const userId = req.session.user.id;

      await assetService.deleteAsset(assetId, userId);
      res.status(204).end();
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof PermissionError) {
        res.status(403).json({ message: error.message });
      } else {
        logger.error('Error deleting asset:', error);
        next(error);
      }
    }
  }

  /**
   * Get a pre-signed URL for an asset
   * @route GET /api/assets/:id/signed-url
   */
  async getSignedUrl(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const assetId = req.params.id;
      const userId = req.session.user.id;
      const expiryTimeSeconds = req.query.expiry ? parseInt(req.query.expiry as string, 10) : undefined;

      const signedUrl = await assetService.getSignedUrl(assetId, userId, expiryTimeSeconds);
      res.json({ url: signedUrl });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof PermissionError) {
        res.status(403).json({ message: error.message });
      } else {
        logger.error('Error generating signed URL:', error);
        next(error);
      }
    }
  }
}

// Export a singleton instance
const assetController = new AssetController();
export default assetController; 