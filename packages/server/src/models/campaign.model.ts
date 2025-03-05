import mongoose from 'mongoose';
import { zodSchemaRaw } from '@zodyac/zod-mongoose';
import { Campaign, campaignSchema } from '@dungeon-lab/shared';

/**
 * Campaign document interface extending the base Campaign interface
 */
export interface CampaignDocument extends Omit<Campaign, 'id'>, mongoose.Document {
  id: string;
}

/**
 * Convert Zod schema to raw Mongoose schema definition
 */
const schemaDefinition = zodSchemaRaw(campaignSchema);

/**
 * Create Mongoose schema with the raw definition
 */
const mongooseSchema = new mongoose.Schema(schemaDefinition, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

/**
 * Campaign model
 */
export const CampaignModel = mongoose.model<CampaignDocument>('Campaign', mongooseSchema); 