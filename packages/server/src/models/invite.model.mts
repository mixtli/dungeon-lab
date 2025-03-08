import mongoose from 'mongoose';
import { IInvite, inviteSchema } from '@dungeon-lab/shared/index.mjs';
import { BaseDocument, createBaseSchema } from './utils/base-schema.mjs';

/**
 * Invite document interface extending the base Invite interface
 */
export interface InviteDocument extends Omit<IInvite, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(inviteSchema);

/**
 * Invite model
 */
export const InviteModel = mongoose.model<InviteDocument>('Invite', mongooseSchema);

export default InviteModel; 