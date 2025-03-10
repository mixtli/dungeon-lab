import mongoose from 'mongoose';
import { ICampaign, campaignSchema } from '@dungeon-lab/shared/index.mjs';
import { BaseDocument, createBaseSchema } from '../../../models/utils/base-schema.mjs';

/**
 * Campaign document interface extending the base Campaign interface
 */
export interface CampaignDocument extends Omit<ICampaign, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(campaignSchema);

/**
 * Campaign model
 */
export const CampaignModel = mongoose.model<CampaignDocument>('Campaign', mongooseSchema); 