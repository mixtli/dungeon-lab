import { AssetModel } from '../models/asset.model.mjs';
import { IAsset, IAssetCreateData, IAssetUpdateData } from '@dungeon-lab/shared/types/index.mjs';
import {
  getFileUrl,
  getPublicUrl,
  uploadFile,
  deleteFile
} from '../../../services/storage.service.mjs';
import mongoose from 'mongoose';
import path from 'path';

// Custom error types
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Type for Asset document with methods
export type AssetDocument = mongoose.Document<unknown, object, IAsset> &
  IAsset & {
    updateMetadata(newMetadata: Record<string, unknown>): Promise<AssetDocument>;
    getSignedUrl(expiryTimeSeconds?: number): Promise<string>;
    isOwnedBy(userId: string): boolean;
    toPublicJSON(): Record<string, unknown>;
  };

// Define proper interface for multer file to fix type errors
type MulterFile = Express.Multer.File;

/**
 * Asset Service - Encapsulates business logic for asset management
 */
class AssetService {
  /**
   * Create a new asset
   * @param file - The file to upload (from Multer middleware)
   * @param userId - The ID of the user creating the asset
   * @param assetData - Additional data for the asset
   */
  async createAsset(
    file: MulterFile,
    userId: string,
    assetData: Partial<IAssetCreateData>
  ): Promise<AssetDocument> {
    if (!file || !file.buffer) {
      throw new ValidationError('File is required');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Pre-generate a MongoDB ID for consistent path reference
    const assetId = new mongoose.Types.ObjectId();

    // Create the storage path using the helper method
    const filename = this.sanitizeFilename(file.originalname);
    const minioPath = AssetModel.generateMinioPath(userId, assetId.toString(), filename);

    // Upload the file to storage
    await uploadFile(file.buffer, filename, file.mimetype, path.dirname(minioPath));

    // Get public URL for the file
    const url = getPublicUrl(minioPath);

    // Set the asset name - use provided name or fall back to filename
    const name = assetData.name || filename;

    // Create the asset document
    const asset = await AssetModel.createAssetWithPath(
      {
        ...assetData,
        name,
        createdBy: userId,
        url,
        size: file.size,
        type: file.mimetype
      },
      filename
    );

    return asset as AssetDocument;
  }

  /**
   * Get an asset by ID
   * @param assetId - The ID of the asset to retrieve
   * @param userId - The ID of the user requesting the asset (for permission check)
   * @param skipPermissionCheck - Whether to skip the permission check
   */
  async getAssetById(
    assetId: string,
    userId?: string,
    skipPermissionCheck = false
  ): Promise<AssetDocument> {
    const asset = (await AssetModel.findById(assetId)) as AssetDocument | null;

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    if (userId && !skipPermissionCheck) {
      const hasPermission = await this.checkUserPermission(assetId, userId);
      if (!hasPermission) {
        throw new PermissionError('You do not have permission to access this asset');
      }
    }

    return asset;
  }

  /**
   * Update an asset
   * @param assetId - The ID of the asset to update
   * @param updateData - The data to update
   * @param userId - The ID of the user performing the update (for permission check)
   */
  async updateAsset(
    assetId: string,
    updateData: IAssetUpdateData,
    userId: string
  ): Promise<AssetDocument> {
    const asset = await this.getAssetById(assetId, userId);

    // Only allow updating certain fields
    if (updateData.metadata) {
      await asset.updateMetadata(updateData.metadata);
    }

    // Update other allowed fields directly
    const allowedUpdates = ['fieldName', 'parentId', 'parentType'];
    for (const field of allowedUpdates) {
      if (field in updateData) {
        // @ts-expect-error We know these fields exist on the asset
        asset[field] = updateData[field];
      }
    }

    await asset.save();
    return asset;
  }

  /**
   * Delete an asset
   * @param assetId - The ID of the asset to delete
   * @param userId - The ID of the user performing the deletion (for permission check)
   */
  async deleteAsset(assetId: string, userId: string): Promise<boolean> {
    const asset = await this.getAssetById(assetId, userId);

    try {
      // Delete from storage first
      await deleteFile(asset.path);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await AssetModel.findByIdAndDelete(assetId);
    return true;
  }

  /**
   * Get a pre-signed URL for temporary access to the asset
   * @param assetId - The ID of the asset
   * @param userId - The ID of the user requesting the URL (for permission check)
   * @param expiryTimeSeconds - How long the URL should be valid, in seconds
   */
  async getSignedUrl(assetId: string, userId: string, expiryTimeSeconds = 3600): Promise<string> {
    const asset = await this.getAssetById(assetId, userId);

    // Use the storage service to get a presigned URL
    try {
      const signedUrl = await getFileUrl(asset.path, expiryTimeSeconds);
      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      // Fall back to the regular URL if presigned URL generation fails
      return asset.url;
    }
  }

  /**
   * Check if a user has permission to access an asset
   * @param assetId - The ID of the asset
   * @param userId - The ID of the user
   */
  async checkUserPermission(assetId: string, userId: string): Promise<boolean> {
    const asset = await AssetModel.findById(assetId).select('createdBy'); // Fetch only the necessary field
    if (!asset) {
      // If asset not found, user certainly doesn't have permission
      return false;
    }
    return asset.isOwnedBy(userId); // Use the instance method
  }

  /**
   * Sanitize a filename to remove problematic characters
   * @param filename - The original filename
   */
  sanitizeFilename(filename: string): string {
    // Replace spaces with underscores
    let sanitized = filename.replace(/\s+/g, '_');

    // Remove any path-traversal components
    sanitized = path.basename(sanitized);

    // Remove any characters that might cause issues
    sanitized = sanitized.replace(/[^a-zA-Z0-9_.-]/g, '');

    // Ensure we have a valid filename by using a timestamp if necessary
    if (!sanitized || sanitized.length < 1) {
      sanitized = `file_${Date.now()}${path.extname(filename) || '.bin'}`;
    }

    return sanitized;
  }

  /**
   * Get asset statistics
   * @param userId - Optional user ID to filter by
   */
  async getAssetStats(userId?: string): Promise<{ totalCount: number; totalSize: number }> {
    const filter = userId ? { createdBy: userId } : {};

    const totalCount = await AssetModel.countDocuments(filter);
    const totalSize = await AssetModel.aggregate([
      { $match: filter },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);

    return {
      totalCount,
      totalSize: totalSize.length > 0 ? totalSize[0].totalSize : 0
    };
  }

  /**
   * Get all assets created by a specific user
   * @param userId - The ID of the user
   */
  async getAssetsByUser(userId: string): Promise<AssetDocument[]> {
    return AssetModel.find({ createdBy: userId }).sort({ createdAt: -1 }) as Promise<
      AssetDocument[]
    >;
  }
}

// Export a singleton instance
const assetService = new AssetService();
export default assetService;
