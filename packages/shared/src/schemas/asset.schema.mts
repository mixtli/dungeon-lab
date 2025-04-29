import { z } from 'zod';
import type { IAsset } from '../types/index.mjs';

/**
 * Schema for the Asset model
 */
export const assetSchema = z.object({
  // ID is handled by Mongoose/MongoDB
  id: z.string().optional(),

  // Name of the asset (defaults to filename if not provided)
  name: z.string().optional(),

  // Reference to the parent entity (optional)
  // Will be converted to ObjectId with zId('Entity') on the server
  parentId: z.string().optional(),

  // Type of the parent entity (optional)
  // Used for determining the type of entity referenced by parentId
  parentType: z.string().optional(),

  // Field name on the parent entity (optional)
  fieldName: z.string().optional(),

  // Storage path in Minio
  path: z.string(),

  // Public URL to access the asset
  url: z.string(),

  // File size in bytes
  size: z.number().optional(),

  // MIME type
  type: z.string().optional(),

  // Additional metadata (optional)
  metadata: z.record(z.any()).optional(),

  // Reference to the user who created this asset
  // Will be converted to ObjectId with zId('User') on the server
  createdBy: z.string(),

  // Created and updated timestamps (handled by Mongoose)
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

/**
 * Schema for creating a new asset
 */
export const assetCreateSchema = assetSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial({ size: true, type: true, metadata: true, name: true });

/**
 * Schema for updating an asset
 */
export const assetUpdateSchema = assetSchema
  .omit({ id: true, createdAt: true, updatedAt: true, createdBy: true, path: true })
  .partial();

/**
 * Helper functions for working with assets
 */
export const assetHelpers = {
  /**
   * Get the URL from an asset
   * @param asset The asset to get the URL from
   * @returns The URL of the asset, or undefined if not available
   */
  getUrl(asset: IAsset | null | undefined): string | undefined {
    if (!asset) return undefined;
    return asset.url;
  },

  /**
   * Get the display name for an asset
   * @param asset The asset to get the name from
   * @returns The name of the asset, the filename from path, or "Unnamed asset"
   */
  getDisplayName(asset: IAsset | null | undefined): string {
    if (!asset) return 'Unnamed asset';

    // Use explicit name if available
    if (asset.name) return asset.name;

    // Fall back to filename from path
    if (asset.path) {
      const filename = asset.path.split('/').pop();
      if (filename) return filename;
    }

    // Last resort
    return 'Unnamed asset';
  }
};
