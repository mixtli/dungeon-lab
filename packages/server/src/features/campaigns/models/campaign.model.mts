import mongoose from 'mongoose';
import { ICampaign, campaignSchema } from '@dungeon-lab/shared/index.mjs';
import { BaseDocument, createBaseSchema } from '../../../models/base-schema.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { z } from 'zod';

/**
 * Campaign document interface extending the base Campaign interface
 */
export interface CampaignDocument extends Omit<ICampaign, 'id'>, BaseDocument {}



const newSchema = campaignSchema.extend({
  members: z.array(zId('Actor')),
});


/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(newSchema);

/**
 * Campaign model
 */
export const CampaignModel = mongoose.model<CampaignDocument>('Campaign', mongooseSchema); 