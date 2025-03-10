import mongoose from 'mongoose';
import { IInvite, inviteSchema } from '@dungeon-lab/shared/index.mjs';
import { BaseDocument, createBaseSchema } from '../../../models/utils/base-schema.mjs';

/**
 * Invite document interface extending the base Invite interface
 */
export interface InviteDocument extends Omit<IInvite, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(inviteSchema);

// Add indexes for common queries
mongooseSchema.index({ campaignId: 1 });
mongooseSchema.index({ userId: 1 });
mongooseSchema.index({ status: 1 });

/**
 * Invite model
 */
export const InviteModel = mongoose.model<InviteDocument>('Invite', mongooseSchema);

export default InviteModel; 