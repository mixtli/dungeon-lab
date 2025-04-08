import { z } from 'zod';

/**
 * Schema for representing an uploaded asset (image, document, etc)
 */
export const assetSchema = z.object({
  // Path where the asset is stored (relative to storage bucket)
  path: z.string().optional(),
  
  // Public URL to access this asset
  url: z.string().optional(),
  
  // File size in bytes
  size: z.number().optional(),
  
  // MIME type of the asset
  type: z.string().optional(),
});

// Type definition for assets
export type Asset = z.infer<typeof assetSchema>;

/**
 * Schema for asset types that can be accepted by the client
 * Extends assetSchema to also accept File instances
 */
export const assetCreateSchema = z.union([
  assetSchema,
  z.instanceof(File), // For browser File objects
]);

// Type definition for asset create operations
export type AssetCreate = z.infer<typeof assetCreateSchema>;

/**
 * Schema for asset updates, making all fields optional
 */
export const assetUpdateSchema = assetSchema.partial();

// Type definition for asset update operations
export type AssetUpdate = z.infer<typeof assetUpdateSchema>;