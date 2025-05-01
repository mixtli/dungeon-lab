import mongoose from 'mongoose';
import { assetSchema } from '@dungeon-lab/shared/schemas/asset.schema.mjs';
import { IAsset } from '@dungeon-lab/shared/types/index.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { zId } from '@zodyac/zod-mongoose';

/**
 * Helper function to generate the Minio path outside of the mongoose schema methods
 */
function generateMinioPath(userId: string, assetId: string, filename: string): string {
  // Create a simplified path structure without parent entity information
  // Format: users/{userId}/assets/{assetId}/{filename}
  return `users/${userId}/assets/${assetId}/${filename}`;
}

/**
 * Create custom schema with ObjectId references for Mongoose
 */
const assetSchemaMongoose = assetSchema.merge(baseMongooseZodSchema).extend({
  // Only require user reference
  createdBy: zId('User')
});

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema(assetSchemaMongoose);

// Define indexes for efficient querying
mongooseSchema.index({ createdBy: 1 });

/**
 * Get a pre-signed URL for temporarily accessing the asset
 * @param expiryTimeSeconds - The expiry time in seconds (default 3600 = 1 hour)
 * @returns Promise that resolves to the signed URL
 */
mongooseSchema.methods.getSignedUrl = async function (_expiryTimeSeconds = 3600) {
  console.log('getSignedUrl', this.url, _expiryTimeSeconds);
  // This would typically call the Minio client to get a pre-signed URL
  // For now we'll just return the regular URL as a placeholder
  // TODO: Implement Minio integration for pre-signed URLs
  return this.url;
};

/**
 * Update the metadata for this asset
 * @param newMetadata - The metadata to merge with existing metadata
 * @returns Promise that resolves to the updated asset
 */
mongooseSchema.methods.updateMetadata = async function (newMetadata: Record<string, unknown>) {
  // Merge the new metadata with existing metadata (if any)
  this.metadata = { ...(this.metadata || {}), ...newMetadata };
  return this.save();
};

/**
 * Check if this asset is owned by a specific user
 * @param userId - The user ID to check ownership against
 * @returns Boolean indicating ownership
 */
mongooseSchema.methods.isOwnedBy = function (userId: string) {
  return this.createdBy.toString() === userId;
};

/**
 * Return a public-friendly JSON representation of the asset
 * @returns Object with public asset data
 */
mongooseSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();

  // Remove any sensitive fields if needed
  // Currently there are no sensitive fields in the asset model

  return obj;
};

/**
 * Generate the full Minio storage path with user scoping
 * @param userId - The user ID who owns the asset
 * @param assetId - The asset ID (MongoDB ObjectId)
 * @param filename - The original filename
 * @returns The scoped path for storing in Minio
 */
mongooseSchema.statics.generateMinioPath = function (
  userId: string,
  assetId: string,
  filename: string
) {
  return generateMinioPath(userId, assetId, filename);
};

/**
 * Create a new asset with a pre-generated ID to ensure path consistency
 * This method handles both the MongoDB document creation and generating consistent Minio paths
 *
 * @param assetData - The asset data to create
 * @param filename - The original filename
 * @returns Promise that resolves to the created asset
 */
mongooseSchema.statics.createAssetWithPath = async function (
  assetData: Partial<IAsset>,
  filename: string
) {
  // Pre-generate a MongoDB ID that will be used for both the document and path
  const assetId = new mongoose.Types.ObjectId();

  // Ensure createdBy exists
  if (!assetData.createdBy) {
    throw new Error('createdBy is required for creating an asset');
  }

  // Generate the Minio path using the helper function
  const path = generateMinioPath(assetData.createdBy.toString(), assetId.toString(), filename);

  // Create the asset document with the pre-generated ID and path
  const asset = new this({
    ...assetData,
    _id: assetId,
    path
  });

  // Save the asset to the database
  await asset.save();

  return asset;
};

// Define the interface for Asset static methods
interface AssetStaticMethods {
  generateMinioPath(userId: string, assetId: string, filename: string): string;
  createAssetWithPath(
    assetData: Partial<IAsset>,
    filename: string
  ): Promise<mongoose.Document<unknown, object, IAsset> & IAsset>;
}

// Extend Mongoose model with our static methods
type AssetModelType = mongoose.Model<
  IAsset,
  object,
  object,
  object,
  mongoose.Document<unknown, object, IAsset> &
    IAsset & {
      updateMetadata(
        newMetadata: Record<string, unknown>
      ): Promise<mongoose.Document<unknown, object, IAsset>>;
      getSignedUrl(expiryTimeSeconds?: number): Promise<string>;
      isOwnedBy(userId: string): boolean;
      toPublicJSON(): Record<string, unknown>;
    },
  unknown
> &
  AssetStaticMethods;

/**
 * Asset model - Represents a file stored in Minio with references to parent entities
 */
export const AssetModel = mongoose.model<IAsset, AssetModelType>('Asset', mongooseSchema);
