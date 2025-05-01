import mongoose from 'mongoose';
import { IInvite } from '@dungeon-lab/shared/types/index.mjs';
import { inviteSchema } from '@dungeon-lab/shared/schemas/invite.schema.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Invite document interface extending the base Invite interface
 */
// export interface InviteDocument extends Omit<IInvite, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IInvite>(inviteSchema.merge(baseMongooseZodSchema));

// Override campaignId field to be a reference to Campaign model
mongooseSchema.path('campaignId', mongoose.Schema.Types.ObjectId);
mongooseSchema.path('campaignId').ref('Campaign');

// Add indexes for common queries
mongooseSchema.index({ campaignId: 1 });
mongooseSchema.index({ userId: 1 });
mongooseSchema.index({ status: 1 });

/**
 * Invite model
 */
export const InviteModel = mongoose.model<IInvite>('Invite', mongooseSchema);
