import { z } from 'zod';

/**
 * Schema for the Asset model (this is the full document stored in MongoDB)
 */
export const assetModelSchema = z.object({
  // ID is handled by Mongoose/MongoDB
  id: z.string().optional(),
  
  // Reference to the parent entity (optional)
  parentId: z.string().optional(),
  
  // Type of the parent entity (optional)
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
  createdBy: z.string(),
  
  // Created and updated timestamps (handled by Mongoose)
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Type definition for the Asset model
export type AssetModel = z.infer<typeof assetModelSchema>;

/**
 * Schema for creating a new asset
 */
export const assetCreateSchema = assetModelSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial({ size: true, type: true, metadata: true });

// Type definition for asset creation
export type AssetCreate = z.infer<typeof assetCreateSchema>;

/**
 * Schema for updating an asset
 */
export const assetUpdateSchema = assetModelSchema
  .omit({ id: true, createdAt: true, updatedAt: true, createdBy: true, path: true })
  .partial();

// Type definition for asset updates
export type AssetUpdate = z.infer<typeof assetUpdateSchema>; 